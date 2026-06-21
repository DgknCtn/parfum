import * as XLSX from "xlsx"
import { normalizeEssenceRatio } from "./stock-calculator"

export interface RawRow {
  [key: string]: string | number | null | undefined
}

export interface ParsedRow {
  parfumAdi?: string
  partiBilgisi?: string
  esansMl?: number
  cinsiyet?: string
  ucret?: number
  esansOrani?: number
  yapimTarihi?: string
  parfumMl?: number
  kullanilanEsansMl?: number
  alkolMl?: number
  suMl?: number
  kalanEsansMl?: number
  notlar?: string
  _warnings: string[]
  _errors: string[]
  _rowIndex: number
}

export interface ColumnMapping {
  [dbField: string]: string
}

export function parseExcelFile(buffer: ArrayBuffer): { headers: string[]; rows: RawRow[] } {
  const wb = XLSX.read(buffer, { type: "array", cellDates: true })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const json = XLSX.utils.sheet_to_json<RawRow>(ws, { defval: null, raw: false })
  const headers = json.length > 0 ? Object.keys(json[0]) : []
  return { headers, rows: json }
}

function normalizeGender(raw: string | null | undefined): string {
  if (!raw) return "BELIRTILMEMIS"
  const v = String(raw).toLowerCase().trim()
  if (["kadın", "kadin", "k", "bayan", "f", "female", "woman"].includes(v)) return "KADIN"
  if (["erkek", "e", "bay", "m", "male", "man"].includes(v)) return "ERKEK"
  if (["unisex", "u", "both"].includes(v)) return "UNISEX"
  return "BELIRTILMEMIS"
}

function parseDate(raw: string | number | null | undefined): string | null {
  if (!raw) return null
  const d = new Date(String(raw))
  if (!isNaN(d.getTime())) return d.toISOString()
  return null
}

function parseFloat2(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined || v === "") return null
  const n = parseFloat(String(v).replace(",", "."))
  return isNaN(n) ? null : n
}

export function applyMapping(rows: RawRow[], mapping: ColumnMapping): ParsedRow[] {
  return rows.map((row, idx) => {
    const get = (field: string) => (mapping[field] ? row[mapping[field]] : undefined)
    const warnings: string[] = []
    const errors: string[] = []

    const parfumAdi = get("parfumAdi") ? String(get("parfumAdi")).trim() : undefined
    if (!parfumAdi) errors.push("Parfüm adı boş")

    const esansOraniRaw = parseFloat2(get("esansOrani"))
    let esansOrani: number | undefined
    if (esansOraniRaw !== null) {
      esansOrani = normalizeEssenceRatio(esansOraniRaw)
    } else {
      warnings.push("Esans oranı okunamadı")
    }

    const parfumMl = parseFloat2(get("parfumMl")) ?? undefined
    const kullanilanEsansMl = parseFloat2(get("kullanilanEsansMl")) ?? undefined
    const alkolMl = parseFloat2(get("alkolMl")) ?? undefined
    const suMl = parseFloat2(get("suMl")) ?? undefined
    let kalanEsansMl = parseFloat2(get("kalanEsansMl")) ?? undefined
    if (kalanEsansMl !== undefined && kalanEsansMl < 0) {
      warnings.push(`Kalan esans ml negatif (${kalanEsansMl}); 0 olarak işaretlendi`)
      kalanEsansMl = 0
    }

    const esansMl = parseFloat2(get("esansMl")) ?? undefined
    const ucret = parseFloat2(get("ucret")) ?? undefined
    const yapimTarihi = parseDate(get("yapimTarihi")) ?? undefined
    if (get("yapimTarihi") && !yapimTarihi) {
      warnings.push("Yapım tarihi okunamadı")
    }

    const cinsiyet = normalizeGender(get("cinsiyet") as string)
    if (cinsiyet === "BELIRTILMEMIS" && get("cinsiyet")) {
      warnings.push(`Cinsiyet değeri tanınamadı: "${get("cinsiyet")}"`)
    }

    if (parfumMl && kullanilanEsansMl && esansOrani) {
      const expected = parfumMl * esansOrani
      const diff = Math.abs(expected - kullanilanEsansMl)
      if (diff > 1) {
        warnings.push(
          `Kullanılan esans ml (${kullanilanEsansMl}) ile oran×hacim (${expected.toFixed(1)}) arasında fark var`
        )
      }
    }

    return {
      parfumAdi,
      partiBilgisi: get("partiBilgisi") ? String(get("partiBilgisi")) : undefined,
      esansMl,
      cinsiyet,
      ucret,
      esansOrani,
      yapimTarihi,
      parfumMl,
      kullanilanEsansMl,
      alkolMl,
      suMl,
      kalanEsansMl,
      notlar: get("notlar") ? String(get("notlar")) : undefined,
      _warnings: warnings,
      _errors: errors,
      _rowIndex: idx + 2,
    }
  })
}
