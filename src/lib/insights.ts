import { prisma } from "@/lib/prisma"
import { findInconsistentEssences } from "@/lib/stock-service"
import { COMPONENT_WARN_RATIO, ML_EPSILON, round2 } from "@/lib/stock-calculator"

const SIX_MONTHS_MS = 182 * 24 * 3600 * 1000

/** Dashboard için tüm sayılar, uyarılar ve akıllı öneriler (PRD §6). */
export async function getDashboardInsights() {
  const [
    totalPerfumes,
    publicPerfumes,
    totalEssences,
    lowStock,
    outOfStock,
    recentBatches,
    activeBatches,
    inconsistent,
    lastImport,
    unspecifiedGender,
  ] = await Promise.all([
    prisma.perfume.count({ where: { deletedAt: null } }),
    prisma.perfume.count({ where: { deletedAt: null, publicVisible: true } }),
    prisma.essence.count({ where: { deletedAt: null } }),
    prisma.essence.findMany({ where: { deletedAt: null, status: "AZ_STOK" }, select: { id: true, name: true, currentVolumeMl: true }, orderBy: { currentVolumeMl: "asc" } }),
    prisma.essence.findMany({ where: { deletedAt: null, status: "BITTI" }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.batch.findMany({
      where: { deletedAt: null },
      orderBy: [{ productionDate: "desc" }, { createdAt: "desc" }],
      take: 6,
      include: { perfume: { select: { id: true, name: true } }, essence: { select: { name: true } } },
    }),
    prisma.batch.findMany({
      where: { deletedAt: null, perfume: { deletedAt: null } },
      orderBy: { productionDate: "desc" },
      select: {
        id: true,
        perfumeId: true,
        batchLabel: true,
        productionDate: true,
        productionDateUnknown: true,
        totalVolumeMl: true,
        essenceRatio: true,
        essenceVolumeMl: true,
        alcoholVolumeMl: true,
        waterVolumeMl: true,
        perfume: { select: { name: true } },
        essence: { select: { id: true, name: true, currentVolumeMl: true, deletedAt: true } },
      },
    }),
    findInconsistentEssences(),
    prisma.importJob.findFirst({ orderBy: { createdAt: "desc" } }),
    prisma.perfume.count({ where: { deletedAt: null, genderCategory: "BELIRTILMEMIS" } }),
  ])

  // Her parfümün en son reçetesi
  const latestByPerfume = new Map<string, (typeof activeBatches)[number]>()
  for (const b of activeBatches) if (!latestByPerfume.has(b.perfumeId)) latestByPerfume.set(b.perfumeId, b)

  // Mevcut stokla üretilebilir reçeteler
  const producible = [...latestByPerfume.values()]
    .filter((b) => !b.essence.deletedAt && b.essenceVolumeMl > 0)
    .map((b) => ({
      perfumeId: b.perfumeId,
      perfumeName: b.perfume.name,
      essenceName: b.essence.name,
      totalVolumeMl: b.totalVolumeMl,
      essenceRatio: b.essenceRatio,
      count: Math.floor((b.essence.currentVolumeMl + ML_EPSILON) / b.essenceVolumeMl),
    }))
    .filter((x) => x.count >= 1)
    .sort((a, b) => b.count - a.count)

  // Bileşen toplamı ≠ toplam hacim
  const componentMismatch = activeBatches
    .filter((b) => b.totalVolumeMl > 0 && Math.abs(b.essenceVolumeMl + b.alcoholVolumeMl + b.waterVolumeMl - b.totalVolumeMl) / b.totalVolumeMl > COMPONENT_WARN_RATIO)
    .map((b) => ({
      id: b.id,
      perfumeId: b.perfumeId,
      perfumeName: b.perfume.name,
      batchLabel: b.batchLabel,
      diffMl: round2(b.essenceVolumeMl + b.alcoholVolumeMl + b.waterVolumeMl - b.totalVolumeMl),
    }))

  const unknownDateCount = activeBatches.filter((b) => b.productionDateUnknown).length

  // Akıllı öneriler
  const suggestions: { tone: "warn" | "danger" | "info"; text: string; href: string }[] = []
  const latestRecipeForEssence = new Map<string, (typeof activeBatches)[number]>()
  for (const b of activeBatches) if (!latestRecipeForEssence.has(b.essence.id)) latestRecipeForEssence.set(b.essence.id, b)

  for (const e of lowStock) {
    const r = latestRecipeForEssence.get(e.id)
    const n = r && r.essenceVolumeMl > 0 ? Math.floor((e.currentVolumeMl + ML_EPSILON) / r.essenceVolumeMl) : null
    suggestions.push({
      tone: "warn",
      text:
        n !== null && r
          ? `${e.name} esansı az stokta (${round2(e.currentVolumeMl)} ml); mevcut reçeteye göre yaklaşık ${n} adet ${round2(r.totalVolumeMl)} ml üretilebilir.`
          : `${e.name} esansı az stokta (${round2(e.currentVolumeMl)} ml).`,
      href: "/admin/essences?status=AZ_STOK",
    })
  }
  for (const e of outOfStock.slice(0, 5)) suggestions.push({ tone: "danger", text: `${e.name} esansı bitmiş görünüyor.`, href: "/admin/essences?status=BITTI" })
  for (const m of componentMismatch.slice(0, 5))
    suggestions.push({ tone: "info", text: `${m.perfumeName} — ${m.batchLabel} reçetesinde toplam ml ile bileşen toplamı arasında ${m.diffMl > 0 ? "+" : ""}${m.diffMl} ml fark var.`, href: `/admin/perfumes/${m.perfumeId}` })

  const now = Date.now()
  const stale = [...latestByPerfume.values()]
    .filter((b) => !b.productionDateUnknown && now - b.productionDate.getTime() > SIX_MONTHS_MS && !b.essence.deletedAt && b.essence.currentVolumeMl >= b.essenceVolumeMl)
    .map((b) => ({ perfumeId: b.perfumeId, perfumeName: b.perfume.name, lastDate: b.productionDate }))
  if (stale.length)
    suggestions.push({
      tone: "info",
      text: `Son 6 ayda üretilmeyen ama stokta esansı olan ${stale.length} parfüm var: ${stale.slice(0, 3).map((s) => s.perfumeName).join(", ")}${stale.length > 3 ? "…" : ""}`,
      href: "/admin/perfumes",
    })
  if (unknownDateCount) suggestions.push({ tone: "info", text: `${unknownDateCount} partinin üretim tarihi bilinmiyor; düzenleyerek tarih ekleyebilirsin.`, href: "/admin/batches" })
  if (unspecifiedGender) suggestions.push({ tone: "info", text: `${unspecifiedGender} parfümün cinsiyeti "Belirtilmemiş"; public filtrelerde görünmesi için düzelt.`, href: "/admin/perfumes" })

  return {
    totalPerfumes,
    publicPerfumes,
    totalEssences,
    lowStock,
    outOfStock,
    recentBatches,
    inconsistent,
    producible,
    componentMismatch,
    stale,
    lastImport,
    suggestions,
  }
}
