import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin, actorOf } from "@/lib/auth"
import { apiError } from "@/lib/api"
import { splitBrand } from "@/lib/import-service"
import { recomputePerfumeAggregates } from "@/lib/stock-service"
import { logActivity } from "@/lib/activity"
import { revalidateCatalog } from "@/lib/revalidate"

/**
 * Veri bakımı: "Marka - Ad" biçimindeki adlardan markayı ayırır ve toplam üretim / son üretim
 * tarihini partilerden yeniden hesaplar. Slug'lar DEĞİŞTİRİLMEZ (paylaşılmış linkler/QR'lar bozulmasın).
 */
export async function POST() {
  try {
    const user = await requireAdmin()
    const perfumes = await prisma.perfume.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, brandName: true, totalProducedMl: true, latestBatchDate: true },
    })

    let brandFixed = 0
    await prisma.$transaction(
      async (tx) => {
        for (const p of perfumes) {
          if (!p.brandName) {
            const { brand, name } = splitBrand(p.name)
            if (brand) {
              await tx.perfume.update({ where: { id: p.id }, data: { brandName: brand, name } })
              brandFixed++
            }
          }
          await recomputePerfumeAggregates(tx, p.id)
        }
      },
      { timeout: 60_000, maxWait: 10_000 }
    )

    const after = await prisma.perfume.findMany({
      where: { id: { in: perfumes.map((p) => p.id) } },
      select: { id: true, totalProducedMl: true, latestBatchDate: true },
    })
    const before = new Map(perfumes.map((p) => [p.id, p]))
    const datesFixed = after.filter((a) => {
      const b = before.get(a.id)!
      return b.totalProducedMl !== a.totalProducedMl || b.latestBatchDate?.getTime() !== a.latestBatchDate?.getTime()
    }).length

    await logActivity(prisma, {
      action: "data_migration_run",
      entityType: "system",
      message: `Veri bakımı: ${brandFixed} marka ayrıştırıldı, ${datesFixed} parfümün toplam/tarih bilgisi güncellendi.`,
      actor: actorOf(user),
    })
    revalidateCatalog()
    return NextResponse.json({ success: true, brandFixed, datesFixed, total: perfumes.length })
  } catch (err) {
    return apiError(err)
  }
}
