import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin, actorOf } from "@/lib/auth"
import { apiError, HttpError } from "@/lib/api"
import { BatchCreateSchema, checkBatchConsistency } from "@/lib/schemas"
import { consumeForBatch, recomputePerfumeAggregates } from "@/lib/stock-service"
import { round2 } from "@/lib/stock-calculator"
import { logActivity } from "@/lib/activity"
import { revalidateCatalog } from "@/lib/revalidate"

export async function GET(request: Request) {
  try {
    await requireAdmin()
    const { searchParams } = new URL(request.url)
    const perfumeId = searchParams.get("perfumeId")

    const batches = await prisma.batch.findMany({
      where: { deletedAt: null, ...(perfumeId ? { perfumeId } : {}) },
      orderBy: { productionDate: "desc" },
      include: {
        perfume: { select: { id: true, name: true, brandName: true } },
        essence: { select: { id: true, name: true, currentVolumeMl: true, status: true } },
      },
    })
    return NextResponse.json(batches)
  } catch (err) {
    return apiError(err)
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAdmin()
    const actor = actorOf(user)
    const data = BatchCreateSchema.parse(await request.json())
    const warnings = checkBatchConsistency(data)

    const perfume = await prisma.perfume.findFirst({ where: { id: data.perfumeId, deletedAt: null }, select: { id: true, name: true } })
    if (!perfume) throw new HttpError(404, "Parfüm bulunamadı")

    const values = {
      perfumeId: data.perfumeId,
      essenceId: data.essenceId,
      batchLabel: data.batchLabel,
      productionDate: data.productionDate,
      totalVolumeMl: round2(data.totalVolumeMl),
      essenceRatio: data.essenceRatio,
      essenceVolumeMl: round2(data.essenceVolumeMl),
      alcoholVolumeMl: round2(data.alcoholVolumeMl),
      waterVolumeMl: round2(data.waterVolumeMl),
      cost: data.cost ?? null,
      notes: data.notes || null,
      publicVisible: data.publicVisible ?? false,
    }

    const { batch, stock } = await prisma.$transaction(async (tx) => {
      const batch = await tx.batch.create({ data: { ...values, stockDeducted: true, createdBy: actor } })
      const reason = data.allowNegativeStock
        ? `${data.batchLabel} üretimi (eksi stok onaylı: ${data.negativeStockReason})`
        : `${data.batchLabel} üretimi için kullanıldı`
      const stock = await consumeForBatch(tx, {
        essenceId: data.essenceId,
        ml: values.essenceVolumeMl,
        batchId: batch.id,
        reason,
        actor,
        allowNegative: data.allowNegativeStock,
      })
      await recomputePerfumeAggregates(tx, data.perfumeId)
      await logActivity(tx, {
        action: "batch_created",
        entityType: "batch",
        entityId: batch.id,
        message: `${values.essenceVolumeMl} ml ${stock.essence.name} esansı ${perfume.name} — ${data.batchLabel} üretimi için kullanıldı.`,
        metadata: { perfumeId: data.perfumeId, essenceId: data.essenceId, warnings },
        actor,
      })
      return { batch, stock }
    })

    revalidateCatalog()
    return NextResponse.json(
      {
        id: batch.id,
        batch,
        warnings,
        stockStatus: {
          essenceId: data.essenceId,
          previousVolumeMl: stock.previousVolumeMl,
          usedVolumeMl: values.essenceVolumeMl,
          currentVolumeMl: stock.essence.currentVolumeMl,
          status: stock.essence.status,
        },
      },
      { status: 201 }
    )
  } catch (err) {
    return apiError(err)
  }
}
