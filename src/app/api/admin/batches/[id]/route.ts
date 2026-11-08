import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin, actorOf } from "@/lib/auth"
import { apiError, HttpError } from "@/lib/api"
import { BatchUpdateSchema, checkBatchConsistency } from "@/lib/schemas"
import { consumeForBatch, restoreForBatch, recomputePerfumeAggregates } from "@/lib/stock-service"
import { round2 } from "@/lib/stock-calculator"
import { logActivity } from "@/lib/activity"
import { revalidateCatalog } from "@/lib/revalidate"

type Params = { params: Promise<{ id: string }> }

async function lockBatch(tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0], id: string) {
  // Satır kilidi: aynı partiye eşzamanlı düzenleme/silme stoğu iki kez değiştiremez.
  await tx.$queryRaw`SELECT id FROM "Batch" WHERE id = ${id} FOR UPDATE`
  const batch = await tx.batch.findFirst({ where: { id, deletedAt: null }, include: { essence: { select: { name: true } } } })
  if (!batch) throw new HttpError(404, "Parti bulunamadı")
  return batch
}

export async function DELETE(_: Request, { params }: Params) {
  try {
    const user = await requireAdmin()
    const actor = actorOf(user)
    const { id } = await params

    await prisma.$transaction(async (tx) => {
      const batch = await lockBatch(tx, id)
      await tx.batch.update({ where: { id }, data: { deletedAt: new Date() } })
      if (batch.stockDeducted) {
        await restoreForBatch(tx, {
          essenceId: batch.essenceId,
          ml: batch.essenceVolumeMl,
          batchId: id,
          reason: `${batch.batchLabel} silindi — stok iade edildi`,
          actor,
        })
      }
      await recomputePerfumeAggregates(tx, batch.perfumeId)
      await logActivity(tx, {
        action: "batch_deleted",
        entityType: "batch",
        entityId: id,
        message: `${batch.batchLabel} silindi; ${batch.essenceVolumeMl} ml ${batch.essence.name} stoğa iade edildi.`,
        actor,
      })
    })

    revalidateCatalog()
    return NextResponse.json({ success: true })
  } catch (err) {
    return apiError(err)
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const user = await requireAdmin()
    const actor = actorOf(user)
    const { id } = await params
    const input = BatchUpdateSchema.parse(await request.json())

    const result = await prisma.$transaction(async (tx) => {
      const old = await lockBatch(tx, id)

      const next = {
        perfumeId: input.perfumeId ?? old.perfumeId,
        essenceId: input.essenceId ?? old.essenceId,
        batchLabel: input.batchLabel ?? old.batchLabel,
        productionDate: input.productionDate ?? old.productionDate,
        totalVolumeMl: round2(input.totalVolumeMl ?? old.totalVolumeMl),
        essenceRatio: input.essenceRatio ?? old.essenceRatio,
        essenceVolumeMl: round2(input.essenceVolumeMl ?? old.essenceVolumeMl),
        alcoholVolumeMl: round2(input.alcoholVolumeMl ?? old.alcoholVolumeMl),
        waterVolumeMl: round2(input.waterVolumeMl ?? old.waterVolumeMl),
        cost: input.cost !== undefined ? input.cost : old.cost,
        notes: input.notes !== undefined ? input.notes || null : old.notes,
        publicVisible: input.publicVisible ?? old.publicVisible,
      }
      const warnings = checkBatchConsistency(next)
      if (input.allowNegativeStock && !input.negativeStockReason)
        throw new HttpError(400, "Eksi stokla kaydetmek için açıklama gerekli")

      if (next.perfumeId !== old.perfumeId) {
        const p = await tx.perfume.findFirst({ where: { id: next.perfumeId, deletedAt: null } })
        if (!p) throw new HttpError(404, "Parfüm bulunamadı")
      }

      // Stok farkı
      if (old.stockDeducted) {
        if (next.essenceId !== old.essenceId) {
          await restoreForBatch(tx, {
            essenceId: old.essenceId, ml: old.essenceVolumeMl, batchId: id, actor, movementType: "correction",
            reason: `${old.batchLabel} düzenlendi — esans değişti, eski esans iade edildi`,
          })
          await consumeForBatch(tx, {
            essenceId: next.essenceId, ml: next.essenceVolumeMl, batchId: id, actor, movementType: "correction",
            allowNegative: input.allowNegativeStock,
            reason: `${next.batchLabel} düzenlendi — yeni esanstan düşüldü`,
          })
        } else {
          const diff = round2(next.essenceVolumeMl - old.essenceVolumeMl)
          if (diff > 0) {
            await consumeForBatch(tx, {
              essenceId: old.essenceId, ml: diff, batchId: id, actor, movementType: "correction",
              allowNegative: input.allowNegativeStock,
              reason: `${next.batchLabel} düzenlendi — esans ${old.essenceVolumeMl} → ${next.essenceVolumeMl} ml`,
            })
          } else if (diff < 0) {
            await restoreForBatch(tx, {
              essenceId: old.essenceId, ml: -diff, batchId: id, actor, movementType: "correction",
              reason: `${next.batchLabel} düzenlendi — esans ${old.essenceVolumeMl} → ${next.essenceVolumeMl} ml`,
            })
          }
        }
      }

      const batch = await tx.batch.update({ where: { id }, data: next })
      await recomputePerfumeAggregates(tx, next.perfumeId)
      if (next.perfumeId !== old.perfumeId) await recomputePerfumeAggregates(tx, old.perfumeId)

      const changes: string[] = []
      if (old.essenceRatio !== next.essenceRatio)
        changes.push(`esans oranı %${round2(old.essenceRatio * 100)} → %${round2(next.essenceRatio * 100)}`)
      if (old.essenceVolumeMl !== next.essenceVolumeMl) changes.push(`esans ${old.essenceVolumeMl} → ${next.essenceVolumeMl} ml`)
      if (old.totalVolumeMl !== next.totalVolumeMl) changes.push(`toplam ${old.totalVolumeMl} → ${next.totalVolumeMl} ml`)
      if (old.essenceId !== next.essenceId) changes.push("esans değiştirildi")
      if (old.publicVisible !== next.publicVisible) changes.push(next.publicVisible ? "public yapıldı" : "gizlendi")
      if ((old.notes ?? "") !== (next.notes ?? "")) changes.push("notlar güncellendi")
      if (old.batchLabel !== next.batchLabel) changes.push(`ad "${old.batchLabel}" → "${next.batchLabel}"`)
      if (old.productionDate.getTime() !== next.productionDate.getTime()) changes.push("üretim tarihi değişti")

      if (changes.length) {
        await logActivity(tx, {
          action: "batch_updated",
          entityType: "batch",
          entityId: id,
          message: `${next.batchLabel}: ${changes.join(", ")}.`,
          actor,
        })
      }
      return { batch, warnings }
    })

    revalidateCatalog()
    return NextResponse.json({ ...result.batch, warnings: result.warnings })
  } catch (err) {
    return apiError(err)
  }
}
