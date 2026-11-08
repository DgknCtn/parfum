import type { MetadataRoute } from "next"
import { prisma } from "@/lib/prisma"
import { publicPerfumeWhere } from "@/lib/catalog"
import { siteUrl } from "@/lib/site"

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl()
  const perfumes = await prisma.perfume.findMany({ where: publicPerfumeWhere, select: { slug: true, updatedAt: true } })
  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    ...["KADIN", "ERKEK", "UNISEX"].map((g) => ({ url: `${base}/?gender=${g}`, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...perfumes.map((p) => ({ url: `${base}/p/${p.slug}`, lastModified: p.updatedAt, changeFrequency: "monthly" as const, priority: 0.8 })),
  ]
}
