import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth"
import { apiError } from "@/lib/api"
import { round2 } from "@/lib/stock-calculator"

const TZ = "Europe/Istanbul"
const monthKeyFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit" })
const monthKey = (d: Date) => monthKeyFmt.format(d).slice(0, 7) // YYYY-MM

export async function GET() {
  try {
    await requireAdmin()
    const now = new Date()

    // Son 12 ay (İstanbul saatine göre)
    const keys: string[] = []
    const [y, m] = monthKey(now).split("-").map(Number)
    for (let i = 11; i >= 0; i--) {
      const d = new Date(Date.UTC(y, m - 1 - i, 15))
      keys.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`)
    }
    const since = new Date(Date.UTC(Number(keys[0].slice(0, 4)), Number(keys[0].slice(5)) - 1, 1) - 3 * 3600_000)

    const [recentBatches, usage, agingPerfumes] = await Promise.all([
      prisma.batch.findMany({ where: { deletedAt: null, productionDate: { gte: since } }, select: { productionDate: true } }),
      prisma.batch.groupBy({
        by: ["essenceId"],
        where: { deletedAt: null },
        _sum: { essenceVolumeMl: true },
        orderBy: { _sum: { essenceVolumeMl: "desc" } },
        take: 5,
      }),
      prisma.perfume.findMany({
        where: { deletedAt: null, agingDays: { not: null }, latestBatchDate: { not: null } },
        select: { id: true, name: true, agingDays: true, latestBatchDate: true, slug: true },
      }),
    ])

    const counts = new Map(keys.map((k) => [k, 0]))
    for (const b of recentBatches) {
      const k = monthKey(b.productionDate)
      if (counts.has(k)) counts.set(k, counts.get(k)! + 1)
    }
    const monthlyProduction = keys.map((k) => ({
      month: new Date(`${k}-15T12:00:00Z`).toLocaleDateString("tr-TR", { month: "short", year: "2-digit", timeZone: TZ }),
      count: counts.get(k) ?? 0,
    }))

    const names = await prisma.essence.findMany({
      where: { id: { in: usage.map((u) => u.essenceId) } },
      select: { id: true, name: true },
    })
    const nameOf = new Map(names.map((n) => [n.id, n.name]))
    const topEssences = usage.map((u) => {
      const name = nameOf.get(u.essenceId) ?? "—"
      return { name: name.length > 20 ? name.slice(0, 18) + "…" : name, totalMl: round2(u._sum.essenceVolumeMl ?? 0) }
    })

    const agingItems = agingPerfumes
      .map((p) => {
        const readyDate = new Date(p.latestBatchDate!)
        readyDate.setDate(readyDate.getDate() + p.agingDays!)
        const daysLeft = Math.ceil((readyDate.getTime() - now.getTime()) / 86400000)
        return { id: p.id, name: p.name, slug: p.slug, agingDays: p.agingDays!, readyDate: readyDate.toISOString(), daysLeft }
      })
      .filter((p) => p.daysLeft > -7 && p.daysLeft <= 60)
      .sort((a, b) => a.daysLeft - b.daysLeft)

    return NextResponse.json({ monthlyProduction, topEssences, agingItems })
  } catch (err) {
    return apiError(err)
  }
}
