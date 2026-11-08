import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { CatalogSort } from "@/lib/schemas"

export const CatalogSettingsSchema = z.object({
  heroEyebrow: z.string().trim().max(60),
  heroTitle: z.string().trim().min(1).max(80),
  heroSubtitle: z.string().trim().max(240),
  footerText: z.string().trim().max(240),
  defaultSort: CatalogSort,
})
export type CatalogSettings = z.infer<typeof CatalogSettingsSchema>

export const DEFAULT_CATALOG_SETTINGS: CatalogSettings = {
  heroEyebrow: "El Yapımı Koleksiyon",
  heroTitle: "Parfüm Kataloğu",
  heroSubtitle: "Özenle hazırlanmış el yapımı parfümler. Detaylı reçete oranları ve üretim notlarıyla.",
  footerText: "El yapımı parfüm koleksiyonu · Tüm reçeteler özgün formülasyondur",
  defaultSort: "newest",
}

const KEY = "catalog"

/** Ayar tablosu yoksa veya okunamazsa varsayılanlara düşer (katalog asla bu yüzden çökmez). */
export async function getCatalogSettings(): Promise<CatalogSettings> {
  try {
    const row = await prisma.setting.findUnique({ where: { key: KEY } })
    const parsed = CatalogSettingsSchema.partial().safeParse(row?.value ?? {})
    return { ...DEFAULT_CATALOG_SETTINGS, ...(parsed.success ? parsed.data : {}) }
  } catch {
    return DEFAULT_CATALOG_SETTINGS
  }
}

export async function saveCatalogSettings(value: CatalogSettings) {
  await prisma.setting.upsert({ where: { key: KEY }, create: { key: KEY, value }, update: { value } })
}
