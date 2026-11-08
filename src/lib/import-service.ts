import { prisma } from "@/lib/prisma"
import type { ParsedRow } from "@/lib/excel-parser"
import { generateSlug } from "@/lib/slug"
import { applyStockDelta, consumeForBatch, recordMovement, recomputePerfumeAggregates } from "@/lib/stock-service"
import { computeStockStatus, round2, suggestAlcoholWater } from "@/lib/stock-calculator"

const UNKNOWN_DATE = new Date(Date.UTC(1970, 0, 1, 12))

export interface RowReport {
  row: number
  name?: string
  kind: ParsedRow["kind"]
  status: "ok" | "warning" | "error" | "skipped"
  errors: string[]
  warnings: string[]
}

export interface ImportPlan {
  rows: RowReport[]
  totalRows: number
  validRows: number
  errorRows: number
  warningRows: number
  batchRows: number
  stockRows: number
  newPerfumes: string[]
  newEssences: string[]
  existingEssences: string[]
}

/** "Chanel - No:5" → { brand: "Chanel", name: "No:5" } */
export function splitBrand(full: string): { brand: string | null; name: string } {
  const i = full.indexOf(" - ")
  if (i <= 0) return { brand: null, name: full.trim() }
  return { brand: full.slice(0, i).trim(), name: full.slice(i + 3).trim() }
}

function groupByEssence(rows: ParsedRow[]) {
  const groups = new Map<string, ParsedRow[]>()
  for (const r of rows) {
    if (r._errors.length || !r.parfumAdi) continue
    const key = r.parfumAdi.replace(/\s+/g, " ").trim()
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(r)
  }
  // Kronolojik sıra: tarihli üretimler tarihe göre, tarihsiz satırlar dosyadaki sırasıyla sona.
  for (const list of groups.values()) {
    list.sort((a, b) => {
      const ta = a.yapimTarihi ? Date.parse(a.yapimTarihi) : Infinity
      const tb = b.yapimTarihi ? Date.parse(b.yapimTarihi) : Infinity
      return ta === tb ? a._rowIndex - b._rowIndex : ta - tb
    })
  }
  return groups
}

async function findPerfume(fullName: string) {
  const { brand, name } = splitBrand(fullName)
  return prisma.perfume.findFirst({
    where: {
      deletedAt: null,
      OR: [{ name: fullName }, ...(brand ? [{ name, brandName: brand }] : [])],
    },
  })
}

/** Veritabanına yazmadan önizleme/doğrulama raporu üretir. */
export async function planImport(parsed: ParsedRow[]): Promise<ImportPlan> {
  const groups = groupByEssence(parsed)
  const names = [...groups.keys()]
  const existing = await prisma.essence.findMany({ where: { name: { in: names }, deletedAt: null }, select: { name: true } })
  const existingSet = new Set(existing.map((e) => e.name))
  const newPerfumes: string[] = []
  for (const n of names) if (!(await findPerfume(n))) newPerfumes.push(n)

  const rows: RowReport[] = parsed.map((r) => ({
    row: r._rowIndex,
    name: r.parfumAdi,
    kind: r.kind,
    status: r._errors.length ? "error" : r._warnings.length ? "warning" : "ok",
    errors: r._errors,
    warnings: [...r._warnings],
  }))

  return {
    rows,
    totalRows: parsed.length,
    validRows: rows.filter((r) => r.status !== "error").length,
    errorRows: rows.filter((r) => r.status === "error").length,
    warningRows: rows.filter((r) => r.status === "warning").length,
    batchRows: parsed.filter((r) => !r._errors.length && r.kind === "batch").length,
    stockRows: parsed.filter((r) => !r._errors.length && r.kind === "stock").length,
    newPerfumes,
    newEssences: names.filter((n) => !existingSet.has(n)),
    existingEssences: names.filter((n) => existingSet.has(n)),
  }
}

/**
 * İçe aktarır. Her esans grubu tek transaction'dır: bir satır hata verirse o esansın
 * hiçbir kaydı yarım kalmaz. Aynı parti (parfüm + etiket + tarih + hacim) tekrar aktarılmaz.
 *
 * Stok defteri: Excel'deki "ESANS ML" sütunu üretim öncesi stoktur. Sistem stoğu bundan farklıysa
 * fark "correction" hareketi olarak yazılır (yeni şişe / Excel düzeltmesi), sonra üretim düşülür.
 * Böylece Σ hareket = kalan stok olur ve Excel ile sistem farkları raporda görünür.
 */
export async function executeImport(parsed: ParsedRow[], actor: string) {
  const reports = new Map<number, RowReport>(
    parsed.map((r) => [
      r._rowIndex,
      { row: r._rowIndex, name: r.parfumAdi, kind: r.kind, status: r._errors.length ? "error" : "ok", errors: [...r._errors], warnings: [...r._warnings] },
    ])
  )
  const createdPerfumes: string[] = []
  const createdEssences: string[] = []
  let batchesCreated = 0
  let stockEntries = 0
  const touchedPerfumes = new Set<string>()

  for (const [essenceName, list] of groupByEssence(parsed)) {
    try {
      await prisma.$transaction(
        async (tx) => {
          const first = list[0]
          const gender = list.find((r) => r.cinsiyet !== "BELIRTILMEMIS")?.cinsiyet ?? "BELIRTILMEMIS"

          // Esans
          let essence = await tx.essence.findFirst({ where: { name: essenceName, deletedAt: null } })
          if (!essence) {
            const initial = round2(first.esansMl ?? first.kalanEsansMl ?? 0)
            essence = await tx.essence.create({
              data: {
                name: essenceName,
                genderCategory: gender,
                initialVolumeMl: initial,
                currentVolumeMl: initial,
                minimumStockThresholdMl: 5,
                status: computeStockStatus(initial, 5),
              },
            })
            await recordMovement(tx, {
              essenceId: essence.id, movementType: "initial_import", quantityMl: initial,
              reason: `Excel içe aktarma — başlangıç stoğu (satır ${first._rowIndex})`, createdBy: actor,
            })
            createdEssences.push(essenceName)
          }

          // Parfüm
          let perfume = await tx.perfume.findFirst({
            where: {
              deletedAt: null,
              OR: [{ name: essenceName }, ...(splitBrand(essenceName).brand ? [{ name: splitBrand(essenceName).name, brandName: splitBrand(essenceName).brand }] : [])],
            },
          })
          if (!perfume) {
            const { brand, name } = splitBrand(essenceName)
            // Transaction içinde unique hatası tx'i bozacağı için slug önceden kontrol edilir.
            let slug = generateSlug(name) || "parfum"
            if (await tx.perfume.findUnique({ where: { slug }, select: { id: true } }))
              slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`
            perfume = await tx.perfume.create({ data: { name, brandName: brand, genderCategory: gender, slug, publicVisible: false } })
            createdPerfumes.push(essenceName)
          }
          touchedPerfumes.add(perfume.id)

          let current = essence.currentVolumeMl
          for (const r of list) {
            const rep = reports.get(r._rowIndex)!
            const before = r.esansMl
            // Excel'e göre üretim öncesi stok farklıysa düzeltme hareketi
            if (before !== undefined && Math.abs(before - current) > 0.01) {
              const delta = round2(before - current)
              await applyStockDelta(tx, essence.id, delta, { allowNegative: true })
              await recordMovement(tx, {
                essenceId: essence.id, movementType: "correction", quantityMl: delta, createdBy: actor,
                reason: delta > 0
                  ? `Excel: stok ${round2(current)} → ${before} ml (yeni şişe / stok girişi, satır ${r._rowIndex})`
                  : `Excel: stok ${round2(current)} → ${before} ml düzeltildi (satır ${r._rowIndex})`,
              })
              if (r.kind === "batch") rep.warnings.push(`Excel'deki üretim öncesi stok (${before} ml) sistem hesabından (${round2(current)} ml) farklı; düzeltme kaydı oluşturuldu`)
              current = before
            }

            if (r.kind === "stock") {
              if (before === undefined && r.kalanEsansMl !== undefined && Math.abs(r.kalanEsansMl - current) > 0.01) {
                const delta = round2(r.kalanEsansMl - current)
                await applyStockDelta(tx, essence.id, delta, { allowNegative: true })
                await recordMovement(tx, { essenceId: essence.id, movementType: "correction", quantityMl: delta, createdBy: actor, reason: `Excel: stok girişi (satır ${r._rowIndex})` })
                current = r.kalanEsansMl
              }
              stockEntries++
              continue
            }

            // Üretim satırı
            const total = round2(r.parfumMl!)
            const ratio = r.esansOrani!
            const essenceMl = round2(r.kullanilanEsansMl ?? total * ratio)
            const label = r.partiBilgisi ?? "İçe Aktarılan Parti"
            const date = r.yapimTarihi ? new Date(r.yapimTarihi) : UNKNOWN_DATE

            const dup = await tx.batch.findFirst({
              where: { perfumeId: perfume.id, batchLabel: label, productionDate: date, totalVolumeMl: total, deletedAt: null },
              select: { id: true },
            })
            if (dup) {
              rep.status = "skipped"
              rep.warnings.push("Bu parti zaten sistemde var; atlandı")
              continue
            }

            const suggestion = suggestAlcoholWater(total, essenceMl)
            const alcohol = r.alkolMl ?? (r.suMl !== undefined ? round2(total - essenceMl - r.suMl) : suggestion.alcoholVolumeMl)
            const water = r.suMl ?? (r.alkolMl !== undefined ? round2(total - essenceMl - r.alkolMl) : suggestion.waterVolumeMl)
            if (r.alkolMl === undefined || r.suMl === undefined) rep.warnings.push("Alkol/su ml eksikti; kalan hacme göre önerildi, kontrol edin")

            const batch = await tx.batch.create({
              data: {
                perfumeId: perfume.id,
                essenceId: essence.id,
                batchLabel: label,
                productionDate: date,
                productionDateUnknown: !r.yapimTarihi,
                totalVolumeMl: total,
                essenceRatio: ratio,
                essenceVolumeMl: essenceMl,
                alcoholVolumeMl: Math.max(0, alcohol),
                waterVolumeMl: Math.max(0, water),
                cost: r.ucret ?? null,
                notes: r.notlar ?? null,
                publicVisible: false,
                stockDeducted: true,
                createdBy: actor,
              },
            })
            await consumeForBatch(tx, {
              essenceId: essence.id, ml: essenceMl, batchId: batch.id, actor, allowNegative: true,
              reason: `${label} üretimi için kullanıldı (Excel satır ${r._rowIndex})`,
            })
            current = round2(current - essenceMl)
            batchesCreated++

            if (current < -0.005) rep.warnings.push(`Bu üretimden sonra stok eksiye düştü (${current} ml)`)
            if (r.kalanEsansMl !== undefined && Math.abs(r.kalanEsansMl - current) > 0.01)
              rep.warnings.push(`Excel'deki kalan (${r.kalanEsansMl} ml) ile sistem hesabı (${current} ml) farklı`)
          }

          // Kalan stok negatif olamaz (PRD): 0'a çek ve kaydet
          if (current < -0.005) {
            await applyStockDelta(tx, essence.id, -current, {})
            await recordMovement(tx, { essenceId: essence.id, movementType: "correction", quantityMl: -current, createdBy: actor, reason: "Excel: negatif stok 0'a çekildi" })
          }
          await recomputePerfumeAggregates(tx, perfume.id)
        },
        { timeout: 60_000, maxWait: 10_000 }
      )
      for (const r of list) {
        const rep = reports.get(r._rowIndex)!
        if (rep.status === "ok" && rep.warnings.length) rep.status = "warning"
      }
    } catch (e) {
      console.error("import group failed", essenceName, e)
      const msg = e instanceof Error ? e.message.split("\n").at(-1) ?? "Bilinmeyen hata" : "Bilinmeyen hata"
      for (const r of list) {
        const rep = reports.get(r._rowIndex)!
        rep.status = "error"
        rep.errors.push(`"${essenceName}" grubu aktarılamadı: ${msg}`)
      }
      // Grup geri alındı; oluşturulmuş sayılanları listeden düş
      const ci = createdEssences.indexOf(essenceName)
      if (ci !== -1) createdEssences.splice(ci, 1)
      const pi = createdPerfumes.indexOf(essenceName)
      if (pi !== -1) createdPerfumes.splice(pi, 1)
    }
  }

  const rows = [...reports.values()].sort((a, b) => a.row - b.row)
  return {
    rows,
    totalRows: rows.length,
    successfulRows: rows.filter((r) => r.status === "ok" || r.status === "warning").length,
    skippedRows: rows.filter((r) => r.status === "skipped").length,
    failedRows: rows.filter((r) => r.status === "error").length,
    warningsCount: rows.filter((r) => r.status === "warning").length,
    batchesCreated,
    stockEntries,
    createdPerfumes,
    createdEssences,
  }
}
