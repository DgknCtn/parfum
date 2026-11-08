import type { StockStatus } from "@prisma/client"

/** ml toleransı: bunun altındaki farklar yuvarlama kabul edilir. */
export const ML_EPSILON = 0.005

/** Para/ml değerlerini 2 ondalığa yuvarlar (kayan nokta birikimini önler). */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

export function computeStockStatus(currentVolumeMl: number, minimumStockThresholdMl: number): StockStatus {
  if (currentVolumeMl <= ML_EPSILON) return "BITTI"
  if (currentVolumeMl <= minimumStockThresholdMl) return "AZ_STOK"
  return "MEVCUT"
}

export function computePossibleBottles(currentVolumeMl: number, bottleSizeMl: number, essenceRatio: number): number {
  const requiredPerBottle = round2(bottleSizeMl * essenceRatio)
  if (requiredPerBottle <= 0 || currentVolumeMl <= 0) return 0
  return Math.floor((currentVolumeMl + ML_EPSILON) / requiredPerBottle)
}

/** PRD: bileşen toplamı ile toplam hacim arasında %2'den fazla fark varsa uyarı. %10 üzeri geçersiz. */
export const COMPONENT_WARN_RATIO = 0.02
export const COMPONENT_INVALID_RATIO = 0.1

export function validateBatchComponents(
  totalVolumeMl: number,
  essenceVolumeMl: number,
  alcoholVolumeMl: number,
  waterVolumeMl: number
): { valid: boolean; diff: number; percentDiff: number; warning: boolean } {
  const componentSum = essenceVolumeMl + alcoholVolumeMl + waterVolumeMl
  const diff = round2(componentSum - totalVolumeMl)
  const percentDiff = totalVolumeMl > 0 ? Math.abs(diff) / totalVolumeMl : 1
  return {
    valid: percentDiff <= COMPONENT_INVALID_RATIO,
    diff,
    percentDiff,
    warning: percentDiff > COMPONENT_WARN_RATIO,
  }
}

/** Esans ml ile toplam×oran tutarlı mı? (%2 veya 0.5 ml tolerans) */
export function isRatioConsistent(totalVolumeMl: number, essenceRatio: number, essenceVolumeMl: number): boolean {
  const expected = totalVolumeMl * essenceRatio
  return Math.abs(expected - essenceVolumeMl) <= Math.max(0.5, expected * COMPONENT_WARN_RATIO)
}

/**
 * Excel'den gelen oranı 0–1 aralığına normalize eder.
 * 0.25 → 0.25, 25 → 0.25. 1 belirsizdir (%1 mi %100 mü?) → ambiguous=true.
 */
export function normalizeEssenceRatio(raw: number): number {
  if (raw > 1) return raw / 100
  return raw
}

export function normalizeEssenceRatioDetailed(raw: number): { ratio: number | null; ambiguous: boolean } {
  if (!Number.isFinite(raw) || raw < 0 || raw > 100) return { ratio: null, ambiguous: false }
  if (raw === 1) return { ratio: 0.01, ambiguous: true }
  return { ratio: raw > 1 ? raw / 100 : raw, ambiguous: false }
}

/** Alkol/su önerisi: kalan hacmi verilen su payına göre böler. */
export function suggestAlcoholWater(totalVolumeMl: number, essenceVolumeMl: number, waterShare = 0.15) {
  const remaining = Math.max(0, totalVolumeMl - essenceVolumeMl)
  const water = round2(remaining * waterShare)
  return { alcoholVolumeMl: round2(remaining - water), waterVolumeMl: water }
}

export const STANDARD_BOTTLE_SIZES = [25, 50, 100] as const
