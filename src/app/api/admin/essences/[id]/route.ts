import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin, actorOf } from "@/lib/auth"
import { apiError, HttpError } from "@/lib/api"
import { EssenceFields } from "@/lib/schemas"
import { computeStockStatus, round2 } from "@/lib/stock-calculator"
import { applyStockDelta, recordMovement } from "@/lib/stock-service"
import { logActivity } from "@/lib/activity"
import { revalidateCatalog } from "@/lib/revalidate"
import { z } from "zod"

type Params = { params: Promise<{ id: string }> }

const UpdateSchema = EssenceFields.partial().extend({
  // Manuel stok düzeltmesi: hedef kalan ml + zorunlu sebep (PRD §7)
  currentVolumeMl: z.number().finite().min(0).max(100_000).optional(),
  adjustmentReason: z.string().trim().max(500).optional(),
})

export async function PATCH(request: Request, { params }: Params) {
  try {
    const user = await requireAdmin()
    const actor = actorOf(user)
    const { id } = await params
    const data = UpdateSchema.parse(await request.json())
    const { currentVolumeMl, adjustmentReason, initialVolumeMl, ...meta } = data

    if (currentVolumeMl !== undefined && (!adjustmentReason || adjustmentReason.length < 3))
      throw new HttpError(400, "Manuel stok düzeltmesi için sebep notu zorunludur", { field: "adjustmentReason" })

    const essence = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Essence" WHERE id = ${id} FOR UPDATE`
      const existing = await tx.essence.findFirst({ where: { id, deletedAt: null } })
      if (!existing) throw new HttpError(404, "Esans bulunamadı")

      // 1) Meta alanlar
      const metaData: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(meta)) if (v !== undefined) metaData[k] = v === "" ? null : v
      if (Object.keys(metaData).length) {
        await tx.essence.update({ where: { id }, data: metaData })
        await logActivity(tx, {
          action: "essence_updated",
          entityType: "essence",
          entityId: id,
          message: `${meta.name ?? existing.name} esansının bilgileri güncellendi (${Object.keys(metaData).join(", ")}).`,
          actor,
        })
      }

      // 2) Başlangıç stoğu değişirse kalan stok aynı fark kadar yeniden hesaplanır
      if (initialVolumeMl !== undefined && round2(initialVolumeMl) !== round2(existing.initialVolumeMl)) {
        const delta = round2(initialVolumeMl - existing.initialVolumeMl)
        await tx.essence.update({ where: { id }, data: { initialVolumeMl: round2(initialVolumeMl) } })
        await applyStockDelta(tx, id, delta)
        await recordMovement(tx, {
          essenceId: id,
          movementType: "correction",
          quantityMl: delta,
          reason: `Başlangıç stoğu ${existing.initialVolumeMl} → ${initialVolumeMl} ml olarak düzeltildi`,
          createdBy: actor,
        })
        await logActivity(tx, {
          action: "essence_recalculated",
          entityType: "essence",
          entityId: id,
          message: `${existing.name} başlangıç stoğu ${existing.initialVolumeMl} → ${initialVolumeMl} ml; kalan stok ${delta > 0 ? "+" : ""}${delta} ml güncellendi.`,
          actor,
        })
      }

      // 3) Manuel düzeltme
      if (currentVolumeMl !== undefined) {
        const fresh = await tx.essence.findUniqueOrThrow({ where: { id } })
        const delta = round2(currentVolumeMl - fresh.currentVolumeMl)
        if (delta !== 0) {
          await applyStockDelta(tx, id, delta, { allowNegative: true })
          await recordMovement(tx, {
            essenceId: id,
            movementType: "manual_adjustment",
            quantityMl: delta,
            reason: adjustmentReason!,
            createdBy: actor,
          })
          await logActivity(tx, {
            action: "manual_stock_adjustment_created",
            entityType: "essence",
            entityId: id,
            message: `${fresh.name} kalan stok manuel olarak ${fresh.currentVolumeMl} ml'den ${round2(currentVolumeMl)} ml'ye güncellendi. Sebep: ${adjustmentReason}`,
            actor,
          })
        }
      }

      // 4) Eşik değiştiyse durum yeniden hesaplanır
      const final = await tx.essence.findUniqueOrThrow({ where: { id } })
      const status = computeStockStatus(final.currentVolumeMl, final.minimumStockThresholdMl)
      return status === final.status ? final : tx.essence.update({ where: { id }, data: { status } })
    })

    revalidateCatalog()
    return NextResponse.json(essence)
  } catch (err) {
    return apiError(err)
  }
}

export async function DELETE(_: Request, { params }: Params) {
  try {
    const user = await requireAdmin()
    const { id } = await params
    const essence = await prisma.essence.findFirst({
      where: { id, deletedAt: null },
      include: { _count: { select: { batches: { where: { deletedAt: null } } } } },
    })
    if (!essence) throw new HttpError(404, "Esans bulunamadı")
    if (essence._count.batches > 0)
      throw new HttpError(
        409,
        `Bu esansı kullanan ${essence._count.batches} parti var. Önce partileri silin veya başka esansa taşıyın.`
      )
    await prisma.essence.update({ where: { id }, data: { deletedAt: new Date() } })
    await logActivity(prisma, {
      action: "essence_deleted",
      entityType: "essence",
      entityId: id,
      message: `${essence.name} esansı silindi.`,
      actor: actorOf(user),
    })
    return NextResponse.json({ success: true })
  } catch (err) {
    return apiError(err)
  }
}
