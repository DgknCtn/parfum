import type { Prisma, StockStatus, GenderCategory } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import type { CatalogParams } from "@/lib/schemas"

/** PRD: parfüm public değilse hiçbir public sorguda görünmez. */
export const publicPerfumeWhere = { publicVisible: true, deletedAt: null } satisfies Prisma.PerfumeWhereInput
/** PRD: parfüm public olsa bile parti public değilse gösterilmez; silinmiş partiler asla görünmez. */
export const publicBatchWhere = { publicVisible: true, deletedAt: null } satisfies Prisma.BatchWhereInput

export type PublicStock = "available" | "low" | "out"

export const STOCK_LABEL: Record<PublicStock, string> = { available: "Mevcut", low: "Az kaldı", out: "Bitti" }
export const GENDER_LABEL: Record<GenderCategory, string> = { KADIN: "Kadın", ERKEK: "Erkek", UNISEX: "Unisex", BELIRTILMEMIS: "Belirtilmemiş" }

export function toPublicStock(status: StockStatus | null | undefined): PublicStock | null {
  if (status === "MEVCUT") return "available"
  if (status === "AZ_STOK") return "low"
  if (status === "BITTI") return "out"
  return null
}

const publicBatchSelect = {
  id: true,
  batchLabel: true,
  productionDate: true,
  productionDateUnknown: true,
  totalVolumeMl: true,
  essenceRatio: true,
  essenceVolumeMl: true,
  alcoholVolumeMl: true,
  waterVolumeMl: true,
  notes: true,
} satisfies Prisma.BatchSelect

export type PublicBatch = Prisma.BatchGetPayload<{ select: typeof publicBatchSelect }>

/**
 * Parfümün stok durumu: en son üretimde kullanılan esansın durumu (partinin görünürlüğünden bağımsız;
 * yalnızca durum etiketi döner, parti bilgisi sızmaz). Hiç üretim yoksa aynı adlı esansa bakılır.
 */
async function stockByPerfume(perfumes: { id: string; name: string; brandName: string | null }[]) {
  if (!perfumes.length) return new Map<string, PublicStock | null>()
  const latest = await prisma.batch.findMany({
    where: { perfumeId: { in: perfumes.map((p) => p.id) }, deletedAt: null },
    orderBy: { productionDate: "desc" },
    distinct: ["perfumeId"],
    select: { perfumeId: true, essence: { select: { status: true, deletedAt: true } } },
  })
  const map = new Map<string, PublicStock | null>()
  for (const b of latest) map.set(b.perfumeId, b.essence.deletedAt ? null : toPublicStock(b.essence.status))

  const missing = perfumes.filter((p) => !map.has(p.id))
  if (missing.length) {
    const names = missing.flatMap((p) => [p.name, ...(p.brandName ? [`${p.brandName} - ${p.name}`] : [])])
    const essences = await prisma.essence.findMany({ where: { name: { in: names }, deletedAt: null }, select: { name: true, status: true } })
    const byName = new Map(essences.map((e) => [e.name.trim(), e.status]))
    for (const p of missing) {
      const s = byName.get(p.name.trim()) ?? (p.brandName ? byName.get(`${p.brandName} - ${p.name}`.trim()) : undefined)
      map.set(p.id, toPublicStock(s))
    }
  }
  return map
}

const STOCK_ORDER: Record<string, number> = { available: 0, low: 1, out: 2, none: 3 }
const GENDER_ORDER: Record<GenderCategory, number> = { KADIN: 0, ERKEK: 1, UNISEX: 2, BELIRTILMEMIS: 3 }

export async function getCatalog(params: CatalogParams) {
  const q = params.q
  const perfumes = await prisma.perfume.findMany({
    where: {
      ...publicPerfumeWhere,
      ...(params.gender ? { genderCategory: params.gender } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { brandName: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
              { topNotes: { contains: q, mode: "insensitive" } },
              { middleNotes: { contains: q, mode: "insensitive" } },
              { baseNotes: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      name: true,
      brandName: true,
      genderCategory: true,
      description: true,
      slug: true,
      coverImageUrl: true,
      batches: {
        where: publicBatchWhere,
        orderBy: { productionDate: "desc" },
        take: 1,
        select: { essenceRatio: true, totalVolumeMl: true, batchLabel: true, productionDate: true, productionDateUnknown: true },
      },
    },
  })

  const stock = await stockByPerfume(perfumes)
  let items = perfumes.map((p) => {
    const latest = p.batches[0] ?? null
    return {
      ...p,
      latestBatch: latest,
      latestBatchDate: latest && !latest.productionDateUnknown ? latest.productionDate : null,
      stock: stock.get(p.id) ?? null,
    }
  })

  if (params.stock) items = items.filter((i) => i.stock === params.stock)

  const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, "tr")
  items.sort((a, b) => {
    switch (params.sort) {
      case "name":
        return byName(a, b)
      case "gender":
        return GENDER_ORDER[a.genderCategory] - GENDER_ORDER[b.genderCategory] || byName(a, b)
      case "stock":
        return STOCK_ORDER[a.stock ?? "none"] - STOCK_ORDER[b.stock ?? "none"] || byName(a, b)
      default:
        return (b.latestBatchDate?.getTime() ?? 0) - (a.latestBatchDate?.getTime() ?? 0) || byName(a, b)
    }
  })
  return items
}
export type CatalogItem = Awaited<ReturnType<typeof getCatalog>>[number]

export async function getPublicPerfume(slug: string) {
  const perfume = await prisma.perfume.findFirst({
    where: { slug, ...publicPerfumeWhere },
    select: {
      id: true,
      name: true,
      brandName: true,
      slug: true,
      genderCategory: true,
      description: true,
      coverImageUrl: true,
      topNotes: true,
      middleNotes: true,
      baseNotes: true,
      updatedAt: true,
      batches: { where: publicBatchWhere, orderBy: { productionDate: "desc" }, select: publicBatchSelect },
    },
  })
  if (!perfume) return null
  const stock = (await stockByPerfume([perfume])).get(perfume.id) ?? null
  return { ...perfume, stock }
}

export async function getSimilarPerfumes(perfume: { id: string; genderCategory: GenderCategory }, take = 4) {
  const items = await prisma.perfume.findMany({
    where: {
      ...publicPerfumeWhere,
      id: { not: perfume.id },
      ...(perfume.genderCategory !== "BELIRTILMEMIS" ? { genderCategory: perfume.genderCategory } : {}),
    },
    orderBy: [{ latestBatchDate: { sort: "desc", nulls: "last" } }, { name: "asc" }],
    take,
    select: { id: true, name: true, brandName: true, slug: true, genderCategory: true },
  })
  const stock = await stockByPerfume(items)
  return items.map((i) => ({ ...i, stock: stock.get(i.id) ?? null }))
}

/** Tarihi bilinmeyen partiler için "Tarih bilinmiyor" döner. */
export function formatBatchDate(
  b: { productionDate: Date | string; productionDateUnknown?: boolean | null },
  opts: Intl.DateTimeFormatOptions = { year: "numeric", month: "long", day: "numeric" }
) {
  if (b.productionDateUnknown) return "Tarih bilinmiyor"
  return new Date(b.productionDate).toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul", ...opts })
}

/** "%25" — gereksiz ondalık göstermez, 22.5 → "%22,5". */
export function formatRatio(ratio: number) {
  const pct = Math.round(ratio * 1000) / 10
  return `%${pct.toLocaleString("tr-TR", { maximumFractionDigits: 1 })}`
}

export function formatMl(ml: number) {
  return `${(Math.round(ml * 100) / 100).toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ml`
}
