import { NextResponse } from "next/server"
import { createHash } from "node:crypto"
import { prisma } from "@/lib/prisma"
import { requireAdmin, actorOf } from "@/lib/auth"
import { apiError, HttpError } from "@/lib/api"
import { parseExcelFile, applyMapping, MAPPABLE_FIELDS, MAX_IMPORT_BYTES } from "@/lib/excel-parser"
import { planImport, executeImport } from "@/lib/import-service"
import { logActivity } from "@/lib/activity"
import { revalidateCatalog } from "@/lib/revalidate"
import { rateLimit } from "@/lib/rate-limit"
import { z } from "zod"

export const maxDuration = 300

const MappingSchema = z
  .object(Object.fromEntries(MAPPABLE_FIELDS.map((f) => [f, z.string().max(200).optional()])) as Record<(typeof MAPPABLE_FIELDS)[number], z.ZodOptional<z.ZodString>>)
  .refine((m) => !!m.parfumAdi, "Parfüm adı sütunu eşleştirilmeli")

/**
 * POST form-data: file, mapping (JSON), mode = "preview" | "commit", force = "1" (aynı dosyayı tekrar aktar)
 */
export async function POST(request: Request) {
  try {
    const user = await requireAdmin()
    const actor = actorOf(user)
    if (!rateLimit(`import:${user.id}`, 20, 60_000).ok) throw new HttpError(429, "Çok fazla deneme. Bir dakika sonra tekrar deneyin.")
    const formData = await request.formData()
    const file = formData.get("file")
    const mappingRaw = formData.get("mapping")
    const mode = formData.get("mode") === "commit" ? "commit" : "preview"
    const force = formData.get("force") === "1"

    if (!(file instanceof File)) throw new HttpError(400, "Dosya bulunamadı")
    if (!/\.(xlsx|xls)$/i.test(file.name)) throw new HttpError(400, "Sadece .xlsx veya .xls dosyası yükleyebilirsiniz")
    if (file.size > MAX_IMPORT_BYTES) throw new HttpError(400, "Dosya en fazla 5 MB olabilir")
    if (typeof mappingRaw !== "string") throw new HttpError(400, "Kolon eşleştirmesi gerekli")

    let mappingJson: unknown
    try {
      mappingJson = JSON.parse(mappingRaw)
    } catch {
      throw new HttpError(400, "Kolon eşleştirmesi okunamadı")
    }
    const mapping = MappingSchema.parse(mappingJson)

    const buffer = await file.arrayBuffer()
    const fileHash = createHash("sha256").update(Buffer.from(buffer)).digest("hex")
    let rows
    try {
      rows = parseExcelFile(buffer).rows
    } catch {
      throw new HttpError(400, "Dosya okunamadı. Lütfen geçerli bir Excel dosyası yükleyin.")
    }
    if (!rows.length) throw new HttpError(400, "Dosyada okunabilir satır bulunamadı")
    const parsed = applyMapping(rows, mapping)

    const previous = await prisma.importJob.findFirst({
      where: { fileHash, status: "completed" },
      orderBy: { createdAt: "desc" },
      select: { id: true, createdAt: true, successfulRows: true },
    })

    if (mode === "preview") {
      const plan = await planImport(parsed)
      return NextResponse.json({ ...plan, alreadyImported: previous ? { at: previous.createdAt, rows: previous.successfulRows } : null })
    }

    if (previous && !force)
      throw new HttpError(409, "Bu dosya daha önce içe aktarılmış. Tekrar aktarmak için onay verin (mevcut partiler atlanır).", {
        code: "ALREADY_IMPORTED",
      })

    const job = await prisma.importJob.create({
      data: { filename: file.name.slice(0, 255), fileHash, status: "processing", totalRows: parsed.length, mappingConfig: mapping },
    })
    const result = await executeImport(parsed, actor)
    await prisma.importJob.update({
      where: { id: job.id },
      data: {
        status: result.successfulRows === 0 && result.skippedRows === 0 ? "failed" : "completed",
        successfulRows: result.successfulRows,
        failedRows: result.failedRows,
        warningsCount: result.warningsCount,
        errorReport: result.rows.filter((r) => r.status !== "ok") as never,
        completedAt: new Date(),
      },
    })
    await logActivity(prisma, {
      action: "excel_import_completed",
      entityType: "import",
      entityId: job.id,
      message: `${file.name}: ${result.successfulRows} satır aktarıldı (${result.batchesCreated} parti, ${result.createdPerfumes.length} yeni parfüm, ${result.createdEssences.length} yeni esans), ${result.failedRows} hatalı, ${result.skippedRows} atlandı.`,
      actor,
    })
    revalidateCatalog()
    return NextResponse.json({ importJobId: job.id, ...result })
  } catch (err) {
    return apiError(err)
  }
}

export async function GET() {
  try {
    await requireAdmin()
    const jobs = await prisma.importJob.findMany({ orderBy: { createdAt: "desc" }, take: 10 })
    return NextResponse.json(jobs)
  } catch (err) {
    return apiError(err)
  }
}
