import { StockStatus } from "@prisma/client"

export function computeStockStatus(
  currentVolumeMl: number,
  minimumStockThresholdMl: number
): StockStatus {
  if (currentVolumeMl <= 0) return "BITTI"
  if (currentVolumeMl <= minimumStockThresholdMl) return "AZ_STOK"
  return "MEVCUT"
}

export function computePossibleBottles(
  currentVolumeMl: number,
  bottleSizeMl: number,
  essenceRatio: number
): number {
  const requiredPerBottle = bottleSizeMl * essenceRatio
  if (requiredPerBottle <= 0) return 0
  return Math.floor(currentVolumeMl / requiredPerBottle)
}

export function validateBatchComponents(
  totalVolumeMl: number,
  essenceVolumeMl: number,
  alcoholVolumeMl: number,
  waterVolumeMl: number
): { valid: boolean; diff: number; warning: boolean } {
  const componentSum = essenceVolumeMl + alcoholVolumeMl + waterVolumeMl
  const diff = Math.abs(totalVolumeMl - componentSum)
  const percentDiff = diff / totalVolumeMl
  return {
    valid: percentDiff <= 0.05,
    diff,
    warning: percentDiff > 0.02,
  }
}

export function normalizeEssenceRatio(raw: number): number {
  if (raw > 1) return raw / 100
  return raw
}
