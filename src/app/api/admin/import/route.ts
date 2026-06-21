import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase/server"
import { parseExcelFile, applyMapping, type ColumnMapping } from "@/lib/excel-parser"
import { computeStockStatus } from "@/lib/stock-calculator"
import { generateSlug } from "@/lib/slug"

async function requireAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  return user
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const mappingRaw = formData.get("mapping") as string | null

    if (!file) return NextResponse.json({ error: "Dosya bulunamadı" }, { status: 400 })
    if (!mappingRaw) return NextResponse.json({ error: "Kolon eşleştirmesi gerekli" }, { status: 400 })

    const mapping: ColumnMapping = JSON.parse(mappingRaw)
    const buffer = await file.arrayBuffer()
    const { rows } = parseExcelFile(buffer)
    const parsed = applyMapping(rows, mapping)

    const importJob = await prisma.importJob.create({
      data: {
        filename: file.name,
        status: "processing",
        totalRows: parsed.length,
        mappingConfig: mapping,
      },
    })

    let successfulRows = 0
    let failedRows = 0
    let warningsCount = 0
    const errorReport: unknown[] = []

    for (const row of parsed) {
      if (row._errors.length > 0) {
        failedRows++
        errorReport.push({ row: row._rowIndex, errors: row._errors, warnings: row._warnings })
        continue
      }

      if (row._warnings.length > 0) warningsCount++

      try {
        const essenceName = row.parfumAdi ?? "Bilinmeyen Esans"
        let essence = await prisma.essence.findFirst({ where: { name: essenceName } })

        if (!essence) {
          const initialVol = row.esansMl ?? row.kalanEsansMl ?? 0
          const currentVol = row.kalanEsansMl ?? initialVol
          essence = await prisma.essence.create({
            data: {
              name: essenceName,
              genderCategory: (row.cinsiyet as never) ?? "BELIRTILMEMIS",
              initialVolumeMl: initialVol,
              currentVolumeMl: Math.max(0, currentVol),
              status: computeStockStatus(Math.max(0, currentVol), 5),
            },
          })
          await prisma.stockMovement.create({
            data: {
              essenceId: essence.id,
              movementType: "initial_import",
              quantityMl: Math.max(0, currentVol),
              reason: "Excel içe aktarma",
              createdBy: user.email ?? user.id,
            },
          })
        }

        let slug = generateSlug(essenceName)
        const existingPerfume = await prisma.perfume.findFirst({
          where: { OR: [{ slug }, { name: essenceName }] },
        })
        let perfume = existingPerfume

        if (!perfume) {
          const taken = await prisma.perfume.findUnique({ where: { slug } })
          if (taken) slug = `${slug}-${Date.now()}`
          perfume = await prisma.perfume.create({
            data: {
              name: essenceName,
              genderCategory: (row.cinsiyet as never) ?? "BELIRTILMEMIS",
              slug,
              publicVisible: false,
            },
          })
        }

        const essenceRatio = row.esansOrani ?? (row.parfumMl && row.kullanilanEsansMl ? row.kullanilanEsansMl / row.parfumMl : 0.25)
        const prodDate = row.yapimTarihi ? new Date(row.yapimTarihi) : new Date()

        await prisma.batch.create({
          data: {
            perfumeId: perfume.id,
            essenceId: essence.id,
            batchLabel: row.partiBilgisi ?? "İçe Aktarılan Parti",
            productionDate: prodDate,
            totalVolumeMl: row.parfumMl ?? 50,
            essenceRatio,
            essenceVolumeMl: row.kullanilanEsansMl ?? (row.parfumMl ?? 50) * essenceRatio,
            alcoholVolumeMl: row.alkolMl ?? 0,
            waterVolumeMl: row.suMl ?? 0,
            cost: row.ucret,
            notes: row.notlar,
            publicVisible: false,
            stockDeducted: true,
          },
        })

        successfulRows++
      } catch (e) {
        failedRows++
        errorReport.push({ row: row._rowIndex, errors: [String(e)] })
      }
    }

    await prisma.importJob.update({
      where: { id: importJob.id },
      data: {
        status: failedRows === parsed.length ? "failed" : "completed",
        successfulRows,
        failedRows,
        warningsCount,
        errorReport,
        completedAt: new Date(),
      },
    })

    return NextResponse.json({
      importJobId: importJob.id,
      totalRows: parsed.length,
      successfulRows,
      failedRows,
      warningsCount,
      errors: errorReport,
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Import failed" }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const jobs = await prisma.importJob.findMany({ orderBy: { createdAt: "desc" }, take: 10 })
    return NextResponse.json(jobs)
  } catch {
    return NextResponse.json({ error: "Error" }, { status: 500 })
  }
}
