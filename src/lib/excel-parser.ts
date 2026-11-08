import * as XLSX from "xlsx"
import { normalizeEssenceRatioDetailed } from "./stock-calculator"

export type Cell = string | number | boolean | Date | null | undefined

export interface RawRow {
  [key: string]: Cell
}

export interface ParsedRow {
  /** batch: üretim satırı; stock: sadece stok/şişe girişi (parti, hacim ve kullanılan esans yok) */
  kind: "batch" | "stock"
  parfumAdi?: string
  partiBilgisi?: string
  esansMl?: number
  cinsiyet: "KADIN" | "ERKEK" | "UNISEX" | "BELIRTILMEMIS"
  ucret?: number
  esansOrani?: number
  /** ISO tarih; okunamadıysa undefined + dateUnknown */
  yapimTarihi?: string
  dateUnknown: boolean
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

export const MAPPABLE_FIELDS = [
  "parfumAdi",
  "partiBilgisi",
  "esansMl",
  "cinsiyet",
  "ucret",
  "esansOrani",
  "yapimTarihi",
  "parfumMl",
  "kullanilanEsansMl",
  "alkolMl",
  "suMl",
  "kalanEsansMl",
  "notlar",
] as const
export type MappableField = (typeof MAPPABLE_FIELDS)[number]
export type ColumnMapping = Partial<Record<MappableField, string>>

export const MAX_IMPORT_BYTES = 5 * 1024 * 1024
export const MAX_IMPORT_ROWS = 5000

export function parseExcelFile(buffer: ArrayBuffer): { headers: string[]; rows: RawRow[] } {
  const wb = XLSX.read(buffer, { type: "array", cellDates: true })
  const ws = wb.Sheets[wb.SheetNames[0]]
  if (!ws) return { headers: [], rows: [] }
  const json = XLSX.utils.sheet_to_json<RawRow>(ws, { defval: null, raw: true })
  // Tamamen boş satırları at
  const rows = json
    .filter((r) => Object.values(r).some((v) => v !== null && v !== ""))
    .slice(0, MAX_IMPORT_ROWS)
  // Başlıklar: satır anahtarları (boş/yinelenen başlıklar "__EMPTY", "X_1" olarak gelir); tamamen boş sütunlar atlanır
  const headers = rows.length
    ? Object.keys(rows[0]).filter((k) => rows.some((r) => r[k] !== null && r[k] !== ""))
    : []
  return { headers, rows }
}

/** Sütun anahtarını kullanıcıya gösterilecek etikete çevirir. */
export function headerLabel(h: string): string {
  if (h.startsWith("__EMPTY")) return `(Başlıksız sütun${h === "__EMPTY" ? "" : " " + h.replace("__EMPTY_", "#")})`
  return h.trim()
}

function normalizeGender(raw: Cell): ParsedRow["cinsiyet"] {
  if (raw === null || raw === undefined || raw === "") return "BELIRTILMEMIS"
  const v = String(raw).toLocaleLowerCase("tr-TR").trim()
  if (["kadın", "kadin", "k", "bayan", "f", "female", "woman", "women"].includes(v)) return "KADIN"
  if (["erkek", "e", "bay", "m", "male", "man", "men"].includes(v)) return "ERKEK"
  if (["unisex", "u", "both", "ünisex"].includes(v)) return "UNISEX"
  return "BELIRTILMEMIS"
}

/** Excel seri no, Date, "dd.mm.yyyy", "dd/mm/yyyy", "yyyy-mm-dd" destekler. Belirsiz formatta gün-ay (TR) varsayılır. */
export function parseDate(raw: Cell): string | null {
  if (raw === null || raw === undefined || raw === "") return null
  if (raw instanceof Date) return isNaN(raw.getTime()) ? null : toNoonUtc(raw.getFullYear(), raw.getMonth() + 1, raw.getDate())
  if (typeof raw === "number") {
    if (raw < 20000 || raw > 80000) return null // ~1954–2119
    const d = XLSX.SSF.parse_date_code(raw)
    return d ? toNoonUtc(d.y, d.m, d.d) : null
  }
  const s = String(raw).trim()
  let m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/)
  if (m) {
    const y = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])
    return validYmd(y, Number(m[2]), Number(m[1]))
  }
  m = s.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})/)
  if (m) return validYmd(Number(m[1]), Number(m[2]), Number(m[3]))
  return null
}

function validYmd(y: number, mo: number, d: number): string | null {
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || y < 1950 || y > 2200) return null
  const dt = new Date(Date.UTC(y, mo - 1, d, 12))
  if (dt.getUTCMonth() !== mo - 1) return null
  return dt.toISOString()
}

function toNoonUtc(y: number, mo: number, d: number) {
  return validYmd(y, mo, d)
}

export function parseNumber(v: Cell): number | null {
  if (v === null || v === undefined || v === "" || typeof v === "boolean" || v instanceof Date) return null
  if (typeof v === "number") return Number.isFinite(v) ? v : null
  const cleaned = String(v).replace(/[%\s₺]|ml/gi, "").replace(",", ".")
  if (cleaned === "") return null
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

export function applyMapping(rows: RawRow[], mapping: ColumnMapping): ParsedRow[] {
  return rows.map((row, idx) => {
    const get = (field: MappableField): Cell => {
      const col = mapping[field]
      return col ? row[col] : undefined
    }
    const warnings: string[] = []
    const errors: string[] = []
    const num = (field: MappableField, label: string, opts: { positive?: boolean } = {}) => {
      const raw = get(field)
      const n = parseNumber(raw)
      if (raw !== null && raw !== undefined && raw !== "" && n === null) warnings.push(`${label} okunamadı ("${String(raw)}")`)
      if (n !== null && n < 0) {
        warnings.push(`${label} negatif (${n}); yok sayıldı`)
        return undefined
      }
      if (n !== null && opts.positive && n === 0) return undefined
      return n ?? undefined
    }

    const parfumAdi = get("parfumAdi") ? String(get("parfumAdi")).trim() : undefined
    if (!parfumAdi) errors.push("Parfüm adı boş")

    const parfumMl = num("parfumMl", "Toplam parfüm ml", { positive: true })
    const kullanilanEsansMl = num("kullanilanEsansMl", "Kullanılan esans ml", { positive: true })
    const alkolMl = num("alkolMl", "Alkol ml")
    const suMl = num("suMl", "Su ml")
    const kalanEsansMl = num("kalanEsansMl", "Kalan esans ml")
    const esansMl = num("esansMl", "Başlangıç esans ml")
    const ucret = num("ucret", "Ücret")
    const partiBilgisi = get("partiBilgisi") ? String(get("partiBilgisi")).trim().slice(0, 100) : undefined

    // Parti, toplam hacim ve kullanılan esans yoksa bu satır bir üretim değil, stok (şişe) girişidir.
    const kind: ParsedRow["kind"] = !parfumMl && !kullanilanEsansMl && !partiBilgisi ? "stock" : "batch"
    if (kind === "stock" && esansMl === undefined && kalanEsansMl === undefined)
      errors.push("Üretim bilgisi de stok miktarı da yok")

    let esansOrani: number | undefined
    const dateRaw = get("yapimTarihi")
    const yapimTarihi = parseDate(dateRaw) ?? undefined
    const dateUnknown = !yapimTarihi

    if (kind === "batch") {
      if (!parfumMl) errors.push("Toplam parfüm ml pozitif bir sayı olmalı")
      const ratioRaw = parseNumber(get("esansOrani"))
      if (ratioRaw !== null) {
        const { ratio, ambiguous } = normalizeEssenceRatioDetailed(ratioRaw)
        if (ratio === null || ratio === 0) warnings.push(`Kullanılan esans oranı okunamadı ("${ratioRaw}")`)
        else esansOrani = ratio
        if (ambiguous) warnings.push("Esans oranı 1 olarak girilmiş; %1 olarak yorumlandı, lütfen kontrol edin")
      }
      if (esansOrani === undefined) {
        if (parfumMl && kullanilanEsansMl) esansOrani = kullanilanEsansMl / parfumMl
        else errors.push("Esans oranı yok ve kullanılan esans ml'den hesaplanamadı")
      }
      if (dateUnknown)
        warnings.push(dateRaw ? `Yapım tarihi okunamadı ("${String(dateRaw)}"); "bilinmiyor" olarak işaretlenecek` : "Yapım tarihi yok; \"bilinmiyor\" olarak işaretlenecek")
      if (parfumMl && kullanilanEsansMl && esansOrani) {
        const expected = parfumMl * esansOrani
        if (Math.abs(expected - kullanilanEsansMl) > Math.max(0.5, expected * 0.02))
          warnings.push(`Kullanılan esans ml (${kullanilanEsansMl}) ile oran×hacim (${expected.toFixed(2)}) arasında fark var`)
      }
      if (parfumMl && kullanilanEsansMl && kullanilanEsansMl > parfumMl) errors.push("Kullanılan esans ml toplam hacimden büyük")
      if (parfumMl && (alkolMl !== undefined || suMl !== undefined)) {
        const essence = kullanilanEsansMl ?? (esansOrani ? parfumMl * esansOrani : 0)
        const sum = essence + (alkolMl ?? 0) + (suMl ?? 0)
        if (Math.abs(sum - parfumMl) / parfumMl > 0.02)
          warnings.push(`Bileşen toplamı (${sum.toFixed(2)} ml) toplam hacimden (${parfumMl} ml) farklı`)
      }
    }

    const cinsiyetRaw = get("cinsiyet")
    const cinsiyet = normalizeGender(cinsiyetRaw)
    if (cinsiyet === "BELIRTILMEMIS")
      warnings.push(cinsiyetRaw ? `Cinsiyet değeri tanınamadı: "${String(cinsiyetRaw)}"` : "Cinsiyet boş; \"Belirtilmemiş\" olarak işaretlenecek")

    return {
      kind,
      parfumAdi,
      partiBilgisi,
      esansMl,
      cinsiyet,
      ucret,
      esansOrani,
      yapimTarihi,
      dateUnknown,
      parfumMl,
      kullanilanEsansMl,
      alkolMl,
      suMl,
      kalanEsansMl,
      notlar: get("notlar") ? String(get("notlar")).trim().slice(0, 2000) : undefined,
      _warnings: warnings,
      _errors: errors,
      _rowIndex: idx + 2,
    }
  })
}

/** Sütun adlarından otomatik eşleştirme tahmini (Türkçe karakter duyarsız). */
export function guessMapping(headers: string[], sampleRows: RawRow[] = []): ColumnMapping {
  const norm = (s: string) =>
    s
      .toLocaleLowerCase("tr-TR")
      .replace(/ı/g, "i").replace(/ş/g, "s").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c")
      .replace(/\s+/g, " ")
      .trim()
  const h = headers.map(norm)
  const used = new Set<number>()
  const out: ColumnMapping = {}
  const take = (field: MappableField, pred: (col: string, i: number) => boolean) => {
    if (out[field]) return
    const idx = h.findIndex((col, i) => !used.has(i) && pred(col, i))
    if (idx !== -1) {
      out[field] = headers[idx]
      used.add(idx)
    }
  }
  const has = (...keys: string[]) => (col: string) => keys.some((k) => col.includes(k))

  // Sıra önemli: spesifik alanlar önce.
  take("esansOrani", has("oran", "ratio", "%"))
  take("kalanEsansMl", has("kalan", "remaining"))
  take("kullanilanEsansMl", has("kullanilan esans ml", "kullanilan ml", "harcanan"))
  take("parfumMl", has("parfum ml", "toplam ml", "total", "hacim"))
  // "ESANS ML" iki kez geçiyorsa: ilki başlangıç stoğu, ikincisi kullanılan esans (PARFUM.xlsx düzeni)
  const esansCols = h.map((c, i) => ({ c, i })).filter(({ c, i }) => !used.has(i) && /^esans ml( _\d+)?$/.test(c) && !/_\d+$/.test(c))
  if (esansCols.length >= 2) {
    out.esansMl = headers[esansCols[0].i]
    used.add(esansCols[0].i)
    if (!out.kullanilanEsansMl) {
      out.kullanilanEsansMl = headers[esansCols[1].i]
      used.add(esansCols[1].i)
    }
  }
  take("esansMl", has("esans ml", "baslangic", "esans miktar"))
  take("alkolMl", has("alkol", "alcohol"))
  take("suMl", (c) => c === "su" || c.startsWith("su ") || c.includes("water"))
  take("partiBilgisi", has("parti", "batch"))
  take("cinsiyet", has("cinsiyet", "gender"))
  take("ucret", has("ucret", "maliyet", "cost", "fiyat"))
  take("yapimTarihi", has("tarih", "date", "yapim"))
  take("notlar", has("not", "note", "aciklama"))
  take("parfumAdi", (c) => c.includes("parfum") || c === "ad" || c.includes("isim") || c.includes("name"))
  // Başlıksız sütunda "1.PARTİ" gibi değerler varsa parti sütunudur
  if (!out.partiBilgisi) {
    const idx = headers.findIndex(
      (col, i) => !used.has(i) && sampleRows.some((r) => typeof r[col] === "string" && /parti|batch/i.test(String(r[col]).toLocaleLowerCase("tr-TR")))
    )
    if (idx !== -1) out.partiBilgisi = headers[idx]
  }
  return out
}
