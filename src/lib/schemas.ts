import { z } from "zod"
import { validateBatchComponents, isRatioConsistent } from "@/lib/stock-calculator"
import { HttpError } from "@/lib/api"

export const GenderEnum = z.enum(["KADIN", "ERKEK", "UNISEX", "BELIRTILMEMIS"])
export type Gender = z.infer<typeof GenderEnum>

const ml = z.number().finite().min(0).max(100_000)
const optionalText = (max: number) => z.string().trim().max(max).nullable().optional()

export const BatchFields = z.object({
  perfumeId: z.string().min(1).max(64),
  essenceId: z.string().min(1).max(64),
  batchLabel: z.string().trim().min(1, "Parti adı gerekli").max(100),
  productionDate: z.coerce.date({ message: "Geçerli bir tarih girin" }),
  totalVolumeMl: ml.positive("Toplam hacim pozitif olmalı"),
  essenceRatio: z.number().finite().gt(0, "Esans oranı 0'dan büyük olmalı").max(1),
  essenceVolumeMl: ml.positive("Esans ml pozitif olmalı"),
  alcoholVolumeMl: ml,
  waterVolumeMl: ml,
  cost: z.number().finite().min(0).nullable().optional(),
  notes: optionalText(2000),
  publicVisible: z.boolean().optional(),
})

export type BatchInput = z.infer<typeof BatchFields>

export const StockOverride = z.object({
  allowNegativeStock: z.boolean().optional(),
  negativeStockReason: z.string().trim().max(500).optional(),
})

/** Birleşik (oluşturma veya düzenleme sonrası) parti değerlerini doğrular; uyarıları döner. */
export function checkBatchConsistency(
  b: Pick<BatchInput, "totalVolumeMl" | "essenceRatio" | "essenceVolumeMl" | "alcoholVolumeMl" | "waterVolumeMl">,
  ctx?: z.RefinementCtx
): string[] {
  const warnings: string[] = []
  const issue = (message: string, path: string) => {
    if (ctx) ctx.addIssue({ code: "custom", message, path: [path] })
    else throw new HttpError(400, message, { field: path })
  }
  if (b.essenceVolumeMl > b.totalVolumeMl) issue("Esans ml toplam hacimden büyük olamaz", "essenceVolumeMl")
  const comp = validateBatchComponents(b.totalVolumeMl, b.essenceVolumeMl, b.alcoholVolumeMl, b.waterVolumeMl)
  if (!comp.valid)
    issue(`Bileşen toplamı toplam hacimden %${(comp.percentDiff * 100).toFixed(1)} farklı (en fazla %10)`, "totalVolumeMl")
  else if (comp.warning)
    warnings.push(`Bileşen toplamı toplam hacimden ${comp.diff > 0 ? "+" : ""}${comp.diff} ml farklı (%${(comp.percentDiff * 100).toFixed(1)})`)
  if (!isRatioConsistent(b.totalVolumeMl, b.essenceRatio, b.essenceVolumeMl))
    warnings.push(
      `Esans ml (${b.essenceVolumeMl}) ile toplam × oran (${(b.totalVolumeMl * b.essenceRatio).toFixed(2)}) uyuşmuyor`
    )
  return warnings
}

export const BatchCreateSchema = BatchFields.extend(StockOverride.shape).superRefine((d, ctx) => {
  checkBatchConsistency(d, ctx)
  if (d.allowNegativeStock && !d.negativeStockReason)
    ctx.addIssue({ code: "custom", message: "Eksi stokla kaydetmek için açıklama gerekli", path: ["negativeStockReason"] })
})

export const BatchUpdateSchema = BatchFields.partial().extend(StockOverride.shape)

export const PerfumeFields = z.object({
  name: z.string().trim().min(1, "Parfüm adı gerekli").max(200),
  brandName: optionalText(200),
  genderCategory: GenderEnum,
  description: optionalText(2000),
  publicVisible: z.boolean(),
  notes: optionalText(4000),
  topNotes: optionalText(500),
  middleNotes: optionalText(500),
  baseNotes: optionalText(500),
  agingDays: z.number().int().min(0).max(3650).nullable().optional(),
})

export const EssenceFields = z.object({
  name: z.string().trim().min(1, "Esans adı gerekli").max(200),
  genderCategory: GenderEnum,
  initialVolumeMl: ml.positive("Başlangıç miktarı pozitif olmalı"),
  minimumStockThresholdMl: ml,
  notes: optionalText(4000),
  supplier: optionalText(200),
  pricePerMl: z.number().finite().min(0).nullable().optional(),
})

/** Public katalog query parametreleri — geçersiz değerler yok sayılır (500 yerine). */
export const CatalogSort = z.enum(["newest", "name", "gender", "stock"])
export type CatalogSortT = z.infer<typeof CatalogSort>
export const CatalogStock = z.enum(["available", "low", "out"])
export type CatalogStockT = z.infer<typeof CatalogStock>

export function parseCatalogParams(raw: Record<string, string | string[] | undefined>) {
  const one = (k: string) => {
    const v = raw[k]
    return Array.isArray(v) ? v[0] : v
  }
  const gender = GenderEnum.safeParse(one("gender"))
  const sort = CatalogSort.safeParse(one("sort"))
  const stock = CatalogStock.safeParse(one("stock") ?? one("status"))
  const q = (one("q") ?? "").trim().slice(0, 100)
  return {
    gender: gender.success && gender.data !== "BELIRTILMEMIS" ? gender.data : undefined,
    sort: sort.success ? sort.data : ("newest" as CatalogSortT),
    sortProvided: sort.success,
    stock: stock.success ? stock.data : undefined,
    q: q || undefined,
  }
}
export type CatalogParams = ReturnType<typeof parseCatalogParams>
