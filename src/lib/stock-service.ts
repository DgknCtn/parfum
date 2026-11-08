import type { Prisma, MovementType } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { HttpError } from "@/lib/api"
import { ML_EPSILON, computeStockStatus, round2 } from "@/lib/stock-calculator"

type Tx = Prisma.TransactionClient

/**
 * Esans stoğunu atomik olarak değiştirir. Negatif delta için `currentVolumeMl >= ihtiyaç`
 * koşulu UPDATE'in WHERE kısmında kontrol edilir; böylece eşzamanlı iki üretim aynı stoğu
 * iki kez harcayamaz (lost update yok).
 */
export async function applyStockDelta(
  tx: Tx,
  essenceId: string,
  deltaMl: number,
  opts: { allowNegative?: boolean; usedDeltaMl?: number } = {}
) {
  const delta = round2(deltaMl)
  const usedDelta = round2(opts.usedDeltaMl ?? 0)

  if (delta < 0 && !opts.allowNegative) {
    const res = await tx.essence.updateMany({
      where: { id: essenceId, deletedAt: null, currentVolumeMl: { gte: -delta - ML_EPSILON } },
      data: {
        currentVolumeMl: { increment: delta },
        ...(usedDelta ? { totalUsedMl: { increment: usedDelta } } : {}),
      },
    })
    if (res.count === 0) {
      const e = await tx.essence.findFirst({ where: { id: essenceId, deletedAt: null } })
      if (!e) throw new HttpError(404, "Esans bulunamadı")
      throw new HttpError(
        422,
        `Bu üretim için ${round2(-delta)} ml esans gerekiyor; mevcut stok ${round2(e.currentVolumeMl)} ml.`,
        { code: "INSUFFICIENT_STOCK", available: round2(e.currentVolumeMl), required: round2(-delta) }
      )
    }
  } else {
    const res = await tx.essence.updateMany({
      where: { id: essenceId, deletedAt: null },
      data: {
        currentVolumeMl: { increment: delta },
        ...(usedDelta ? { totalUsedMl: { increment: usedDelta } } : {}),
      },
    })
    if (res.count === 0) throw new HttpError(404, "Esans bulunamadı")
  }

  // Satır artık bu transaction tarafından kilitli: yuvarla ve durumu güncelle.
  const e = await tx.essence.findUniqueOrThrow({ where: { id: essenceId } })
  let current = round2(e.currentVolumeMl)
  if (Math.abs(current) < ML_EPSILON) current = 0
  const totalUsed = Math.max(0, round2(e.totalUsedMl))
  const status = computeStockStatus(current, e.minimumStockThresholdMl)
  return tx.essence.update({
    where: { id: essenceId },
    data: { currentVolumeMl: current, totalUsedMl: totalUsed, status },
  })
}

export async function recordMovement(
  tx: Tx,
  data: { essenceId: string; batchId?: string | null; movementType: MovementType; quantityMl: number; reason: string; createdBy: string }
) {
  return tx.stockMovement.create({ data: { ...data, quantityMl: round2(data.quantityMl) } })
}

/** Üretim için esans tüketir + stok hareketi yazar. */
export async function consumeForBatch(
  tx: Tx,
  args: { essenceId: string; ml: number; batchId: string; reason: string; actor: string; allowNegative?: boolean; movementType?: MovementType }
) {
  const before = await tx.essence.findFirst({ where: { id: args.essenceId, deletedAt: null }, select: { currentVolumeMl: true } })
  const updated = await applyStockDelta(tx, args.essenceId, -args.ml, { allowNegative: args.allowNegative, usedDeltaMl: args.ml })
  await recordMovement(tx, {
    essenceId: args.essenceId,
    batchId: args.batchId,
    movementType: args.movementType ?? "production_usage",
    quantityMl: -args.ml,
    reason: args.reason,
    createdBy: args.actor,
  })
  return { previousVolumeMl: before?.currentVolumeMl ?? 0, essence: updated }
}

/** Partiye ait esansı stoğa iade eder + ters kayıt yazar. */
export async function restoreForBatch(
  tx: Tx,
  args: { essenceId: string; ml: number; batchId: string; reason: string; actor: string; movementType?: MovementType }
) {
  const updated = await applyStockDelta(tx, args.essenceId, args.ml, { usedDeltaMl: -args.ml })
  await recordMovement(tx, {
    essenceId: args.essenceId,
    batchId: args.batchId,
    movementType: args.movementType ?? "deletion_reversal",
    quantityMl: args.ml,
    reason: args.reason,
    createdBy: args.actor,
  })
  return updated
}

/** Parfümün toplam üretim ve son üretim tarihini (silinmemiş partilerden) yeniden hesaplar. */
export async function recomputePerfumeAggregates(tx: Tx, perfumeId: string) {
  const agg = await tx.batch.aggregate({
    where: { perfumeId, deletedAt: null },
    _sum: { totalVolumeMl: true },
    _max: { productionDate: true },
  })
  await tx.perfume.update({
    where: { id: perfumeId },
    data: {
      totalProducedMl: round2(agg._sum.totalVolumeMl ?? 0),
      latestBatchDate: agg._max.productionDate ?? null,
    },
  })
}

/**
 * Stok defteri tutarlılığı: Σ stok hareketi ≠ currentVolumeMl olan esansları döner.
 * (PRD "Veri Tutarsız" durumu — DB'de saklanmaz, her seferinde hesaplanır.)
 */
export async function findInconsistentEssences() {
  const [essences, sums] = await Promise.all([
    prisma.essence.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, currentVolumeMl: true, initialVolumeMl: true, totalUsedMl: true },
    }),
    prisma.stockMovement.groupBy({ by: ["essenceId"], _sum: { quantityMl: true } }),
  ])
  const ledger = new Map(sums.map((s) => [s.essenceId, s._sum.quantityMl ?? 0]))
  return essences
    .map((e) => {
      const ledgerMl = round2(ledger.get(e.id) ?? 0)
      return { ...e, ledgerMl, diffMl: round2(e.currentVolumeMl - ledgerMl) }
    })
    .filter((e) => Math.abs(e.diffMl) > 0.01)
}
