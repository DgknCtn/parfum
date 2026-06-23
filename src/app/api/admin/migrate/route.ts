import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase/server"

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const perfumes = await prisma.perfume.findMany({
      include: {
        batches: {
          where: { deletedAt: null },
          select: { productionDate: true, totalVolumeMl: true },
        },
      },
    })

    let brandFixed = 0
    let datesFixed = 0

    for (const perfume of perfumes) {
      const updates: Record<string, unknown> = {}
      let newName: string | undefined

      // Extract brand from name: "Christian Dior - Sauvage" → brand="Christian Dior", name="Sauvage"
      if (!perfume.brandName && perfume.name.includes(" - ")) {
        const idx = perfume.name.indexOf(" - ")
        updates.brandName = perfume.name.slice(0, idx).trim()
        newName = perfume.name.slice(idx + 3).trim()
        updates.name = newName
        // Regenerate slug from new name
        const newSlug = newName
          .toLowerCase()
          .replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s")
          .replace(/ı/g, "i").replace(/ö/g, "o").replace(/ç/g, "c")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
        // Only update slug if not taken by another perfume
        const taken = await prisma.perfume.findFirst({
          where: { slug: newSlug, id: { not: perfume.id } },
        })
        if (!taken) updates.slug = newSlug
        brandFixed++
      }

      // Sync latestBatchDate and totalProducedMl from batches
      if (perfume.batches.length > 0) {
        const sorted = [...perfume.batches].sort(
          (a, b) => new Date(b.productionDate).getTime() - new Date(a.productionDate).getTime()
        )
        const latestDate = sorted[0].productionDate
        const totalMl = perfume.batches.reduce((sum, b) => sum + b.totalVolumeMl, 0)

        const needsDateUpdate =
          !perfume.latestBatchDate ||
          new Date(perfume.latestBatchDate).getTime() !== new Date(latestDate).getTime()
        const needsMlUpdate = perfume.totalProducedMl !== totalMl

        if (needsDateUpdate || needsMlUpdate) {
          updates.latestBatchDate = latestDate
          updates.totalProducedMl = totalMl
          datesFixed++
        }
      }

      if (Object.keys(updates).length > 0) {
        await prisma.perfume.update({ where: { id: perfume.id }, data: updates })
      }
    }

    return NextResponse.json({
      success: true,
      brandFixed,
      datesFixed,
      total: perfumes.length,
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Migration failed" }, { status: 500 })
  }
}
