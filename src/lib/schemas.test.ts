import { describe, expect, it } from "vitest"
import { BatchCreateSchema, parseCatalogParams } from "./schemas"

describe("parseCatalogParams", () => {
  it("geçersiz değerleri 500 yerine yok sayar", () => {
    const p = parseCatalogParams({ gender: "foo", stock: "bar", sort: "x", q: "  sauvage  " })
    expect(p).toMatchObject({ gender: undefined, stock: undefined, sort: "newest", sortProvided: false, q: "sauvage" })
  })
  it("geçerli değerleri kabul eder; eski 'status' parametresini de okur", () => {
    expect(parseCatalogParams({ gender: "ERKEK", status: "low", sort: "name" })).toMatchObject({ gender: "ERKEK", stock: "low", sort: "name", sortProvided: true })
  })
})

describe("BatchCreateSchema", () => {
  const base = {
    perfumeId: "p1",
    essenceId: "e1",
    batchLabel: "7. Parti",
    productionDate: "2026-05-03",
    totalVolumeMl: 50,
    essenceRatio: 0.25,
    essenceVolumeMl: 12.5,
    alcoholVolumeMl: 35,
    waterVolumeMl: 2.5,
  }
  it("PRD örnek isteğini kabul eder", () => {
    expect(BatchCreateSchema.safeParse(base).success).toBe(true)
  })
  it("geçersiz tarihi reddeder", () => {
    expect(BatchCreateSchema.safeParse({ ...base, productionDate: "not-a-date" }).success).toBe(false)
  })
  it("esans ml > toplam hacmi reddeder", () => {
    expect(BatchCreateSchema.safeParse({ ...base, essenceVolumeMl: 60, alcoholVolumeMl: 0, waterVolumeMl: 0 }).success).toBe(false)
  })
  it("eksi stok onayında açıklama ister", () => {
    expect(BatchCreateSchema.safeParse({ ...base, allowNegativeStock: true }).success).toBe(false)
    expect(BatchCreateSchema.safeParse({ ...base, allowNegativeStock: true, negativeStockReason: "Yeni şişe geldi" }).success).toBe(true)
  })
})
