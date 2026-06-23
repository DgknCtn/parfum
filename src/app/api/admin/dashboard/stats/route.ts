import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase/server"

async function requireAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  return user
}

export async function GET() {
  try {
    await requireAuth()

    const batches = await prisma.batch.findMany({
      where: { deletedAt: null },
      select: {
        productionDate: true,
        essenceId: true,
        essenceVolumeMl: true,
        essence: { select: { name: true } },
      },
    })

    // Monthly production counts (last 12 months)
    const now = new Date()
    const monthlyMap: Record<string, number> = {}
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      monthlyMap[key] = 0
    }
    for (const b of batches) {
      const d = new Date(b.productionDate)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      if (key in monthlyMap) monthlyMap[key]++
    }
    const monthlyProduction = Object.entries(monthlyMap).map(([month, count]) => ({
      month: new Date(month + "-01").toLocaleDateString("tr-TR", { month: "short", year: "2-digit" }),
      count,
    }))

    // Top 5 essences by total usage ml
    const essenceUsage: Record<string, { name: string; totalMl: number }> = {}
    for (const b of batches) {
      if (!essenceUsage[b.essenceId]) essenceUsage[b.essenceId] = { name: b.essence.name, totalMl: 0 }
      essenceUsage[b.essenceId].totalMl += b.essenceVolumeMl
    }
    const topEssences = Object.values(essenceUsage)
      .sort((a, b) => b.totalMl - a.totalMl)
      .slice(0, 5)
      .map(e => ({ name: e.name.length > 20 ? e.name.slice(0, 18) + "…" : e.name, totalMl: Math.round(e.totalMl * 10) / 10 }))

    // Aging: perfumes with agingDays set and a latestBatchDate
    const agingPerfumes = await prisma.perfume.findMany({
      where: { agingDays: { not: null }, latestBatchDate: { not: null } },
      select: { id: true, name: true, agingDays: true, latestBatchDate: true, slug: true },
    })

    const agingItems = agingPerfumes
      .map(p => {
        const readyDate = new Date(p.latestBatchDate!)
        readyDate.setDate(readyDate.getDate() + p.agingDays!)
        const daysLeft = Math.ceil((readyDate.getTime() - now.getTime()) / 86400000)
        return { id: p.id, name: p.name, slug: p.slug, agingDays: p.agingDays!, readyDate: readyDate.toISOString(), daysLeft }
      })
      .filter(p => p.daysLeft > -7 && p.daysLeft <= 60)
      .sort((a, b) => a.daysLeft - b.daysLeft)

    return NextResponse.json({ monthlyProduction, topEssences, agingItems })
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}
