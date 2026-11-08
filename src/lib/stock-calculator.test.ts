import { describe, expect, it } from "vitest"
import {
  computePossibleBottles,
  computeStockStatus,
  isRatioConsistent,
  normalizeEssenceRatio,
  normalizeEssenceRatioDetailed,
  round2,
  suggestAlcoholWater,
  validateBatchComponents,
} from "./stock-calculator"

describe("round2", () => {
  it("kayan nokta hatalarını temizler", () => {
    expect(round2(0.1 + 0.2)).toBe(0.3)
    expect(round2(14.000000000000002)).toBe(14)
    expect(round2(37 - 12.5 - 12.5)).toBe(12)
  })
})

describe("computeStockStatus", () => {
  it("0 ve çok küçük kalıntıları Bitti sayar", () => {
    expect(computeStockStatus(0, 5)).toBe("BITTI")
    expect(computeStockStatus(1e-12, 5)).toBe("BITTI")
    expect(computeStockStatus(-3, 5)).toBe("BITTI")
  })
  it("eşik ve altını Az Stok sayar", () => {
    expect(computeStockStatus(5, 5)).toBe("AZ_STOK")
    expect(computeStockStatus(4.99, 5)).toBe("AZ_STOK")
  })
  it("eşik üstünü Mevcut sayar", () => {
    expect(computeStockStatus(5.01, 5)).toBe("MEVCUT")
  })
})

describe("computePossibleBottles (PRD örneği)", () => {
  it("37 ml esans, 50 ml %25 → 2 şişe", () => {
    expect(computePossibleBottles(37, 50, 0.25)).toBe(2)
  })
  it("tam yetecek miktarı yuvarlama yüzünden reddetmez", () => {
    expect(computePossibleBottles(12.499999999, 50, 0.25)).toBe(1)
  })
  it("geçersiz girdilerde 0 döner", () => {
    expect(computePossibleBottles(10, 0, 0.25)).toBe(0)
    expect(computePossibleBottles(-1, 50, 0.25)).toBe(0)
  })
})

describe("validateBatchComponents", () => {
  it("PRD örneği (12.5 + 35 + 2.5 = 50) geçerli ve uyarısız", () => {
    const r = validateBatchComponents(50, 12.5, 35, 2.5)
    expect(r.valid).toBe(true)
    expect(r.warning).toBe(false)
  })
  it("%2 üstü farkta uyarır", () => {
    const r = validateBatchComponents(50, 14, 33.8, 0) // 47.8 → %4.4
    expect(r.warning).toBe(true)
    expect(r.valid).toBe(true)
  })
  it("%10 üstü farkta geçersiz", () => {
    expect(validateBatchComponents(50, 10, 20, 0).valid).toBe(false)
  })
})

describe("oran normalizasyonu", () => {
  it("0.25 ve 25 → 0.25", () => {
    expect(normalizeEssenceRatio(0.25)).toBe(0.25)
    expect(normalizeEssenceRatio(25)).toBe(0.25)
  })
  it("1 belirsiz olarak işaretlenir", () => {
    expect(normalizeEssenceRatioDetailed(1)).toEqual({ ratio: 0.01, ambiguous: true })
  })
  it("negatif / 100 üstü reddedilir", () => {
    expect(normalizeEssenceRatioDetailed(-5).ratio).toBeNull()
    expect(normalizeEssenceRatioDetailed(150).ratio).toBeNull()
  })
  it("oran tutarlılığı", () => {
    expect(isRatioConsistent(50, 0.25, 12.5)).toBe(true)
    expect(isRatioConsistent(50, 0.28, 14.000000000000002)).toBe(true)
    expect(isRatioConsistent(50, 0.25, 20)).toBe(false)
  })
})

describe("suggestAlcoholWater", () => {
  it("kalan hacmi su payına göre böler ve toplam korunur", () => {
    const r = suggestAlcoholWater(50, 12.5)
    expect(r.alcoholVolumeMl + r.waterVolumeMl + 12.5).toBeCloseTo(50, 5)
    expect(r.waterVolumeMl).toBe(5.63)
  })
})
