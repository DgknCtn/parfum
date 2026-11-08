"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useConfirm } from "@/components/admin/ConfirmDialog"
import { toast } from "sonner"
import { FileSpreadsheet, Upload, CheckCircle2, AlertCircle, ArrowRight, Wrench, AlertTriangle, Eye } from "lucide-react"
import { parseExcelFile, guessMapping, headerLabel, MAX_IMPORT_BYTES, type ColumnMapping, type MappableField } from "@/lib/excel-parser"
import { api } from "@/lib/client-api"

const DB_FIELDS: { key: MappableField; label: string; hint?: string }[] = [
  { key: "parfumAdi", label: "Parfüm Adı *", hint: "\"Marka - Ad\" biçimi markayı ayırır" },
  { key: "partiBilgisi", label: "Parti Bilgisi" },
  { key: "esansMl", label: "Esans ml (üretim öncesi stok)" },
  { key: "cinsiyet", label: "Cinsiyet" },
  { key: "ucret", label: "Ücret / maliyet" },
  { key: "esansOrani", label: "Esans Oranı (0.25 veya 25)" },
  { key: "yapimTarihi", label: "Yapım Tarihi" },
  { key: "parfumMl", label: "Parfüm ml (toplam)" },
  { key: "kullanilanEsansMl", label: "Kullanılan Esans ml" },
  { key: "alkolMl", label: "Alkol ml" },
  { key: "suMl", label: "Su ml" },
  { key: "kalanEsansMl", label: "Kalan Esans ml" },
  { key: "notlar", label: "Notlar" },
]

type Step = "upload" | "mapping" | "preview" | "importing" | "done"
interface RowReport {
  row: number
  name?: string
  kind: "batch" | "stock"
  status: "ok" | "warning" | "error" | "skipped"
  errors: string[]
  warnings: string[]
}
interface Plan {
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
  alreadyImported: { at: string; rows: number } | null
}
interface Result {
  rows: RowReport[]
  totalRows: number
  successfulRows: number
  skippedRows: number
  failedRows: number
  warningsCount: number
  batchesCreated: number
  stockEntries: number
  createdPerfumes: string[]
  createdEssences: string[]
}

const STEPS: [Step, string][] = [
  ["upload", "Dosya"],
  ["mapping", "Eşleştir"],
  ["preview", "Önizle"],
  ["done", "Sonuç"],
]

export default function ImportPage() {
  const confirm = useConfirm()
  const [step, setStep] = useState<Step>("upload")
  const [headers, setHeaders] = useState<string[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [mapping, setMapping] = useState<ColumnMapping>({})
  const [plan, setPlan] = useState<Plan | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [busy, setBusy] = useState(false)
  const [migrating, setMigrating] = useState(false)
  const [rowFilter, setRowFilter] = useState<"issues" | "all">("issues")
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(f: File) {
    if (!/\.(xlsx|xls)$/i.test(f.name)) return toast.error("Sadece .xlsx veya .xls dosyası yükleyebilirsin.")
    if (f.size > MAX_IMPORT_BYTES) return toast.error("Dosya en fazla 5 MB olabilir.")
    try {
      const { headers, rows } = parseExcelFile(await f.arrayBuffer())
      if (!headers.length) return toast.error("Dosyada sütun başlığı bulunamadı.")
      setFile(f)
      setHeaders(headers)
      setMapping(guessMapping(headers, rows.slice(0, 20)))
      setStep("mapping")
    } catch {
      toast.error("Dosya okunamadı. Lütfen geçerli bir Excel dosyası yükleyin.")
    }
  }

  function formData(mode: "preview" | "commit", force = false) {
    const fd = new FormData()
    fd.append("file", file!)
    fd.append("mapping", JSON.stringify(mapping))
    fd.append("mode", mode)
    if (force) fd.append("force", "1")
    return fd
  }

  async function handlePreview() {
    if (!file) return
    setBusy(true)
    const res = await api<Plan>("/api/admin/import", { method: "POST", body: formData("preview") })
    setBusy(false)
    if (!res.ok) return toast.error(res.error)
    setPlan(res.data)
    setRowFilter("issues")
    setStep("preview")
  }

  async function handleImport() {
    if (!file || !plan) return
    let force = false
    if (plan.alreadyImported) {
      const ok = await confirm({
        title: "Bu dosya daha önce içe aktarılmış",
        description: `${new Date(plan.alreadyImported.at).toLocaleString("tr-TR")} tarihinde ${plan.alreadyImported.rows} satır aktarılmış. Devam edersen sistemde zaten olan partiler atlanır, yalnızca yeni satırlar eklenir.`,
        confirmLabel: "Yine de aktar",
      })
      if (!ok) return
      force = true
    }
    setBusy(true)
    setStep("importing")
    const res = await api<Result>("/api/admin/import", { method: "POST", body: formData("commit", force) })
    setBusy(false)
    if (res.ok) {
      setResult(res.data)
      setRowFilter("issues")
      setStep("done")
      toast.success(`${res.data.successfulRows} satır içe aktarıldı`)
    } else {
      toast.error(res.error)
      setStep("preview")
    }
  }

  async function handleMigrate() {
    const ok = await confirm({
      title: "Veri bakımı çalıştırılsın mı?",
      description: "\"Marka - Ad\" biçimindeki parfüm adlarından marka ayrıştırılır; toplam üretim ve son üretim tarihleri partilerden yeniden hesaplanır. Public linkler (slug) değişmez.",
      confirmLabel: "Çalıştır",
    })
    if (!ok) return
    setMigrating(true)
    const res = await api<{ brandFixed: number; datesFixed: number }>("/api/admin/migrate", { method: "POST" })
    setMigrating(false)
    if (res.ok) toast.success(`Tamamlandı: ${res.data.brandFixed} marka ayrıştırıldı, ${res.data.datesFixed} parfüm güncellendi`)
    else toast.error(res.error)
  }

  function reset() {
    setStep("upload")
    setFile(null)
    setPlan(null)
    setResult(null)
  }

  const currentIdx = STEPS.findIndex(([s]) => s === (step === "importing" ? "preview" : step))
  const reportRows = (step === "done" ? result?.rows : plan?.rows) ?? []
  const shownRows = rowFilter === "all" ? reportRows : reportRows.filter((r) => r.status !== "ok")
  const muted = { color: "var(--text-muted-warm)" }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-serif" style={{ color: "var(--charcoal)", fontFamily: "var(--font-gloock)" }}>
          Excel İçe Aktar
        </h1>
        <p className="text-sm mt-1" style={muted}>
          PARFUM.xlsx dosyanı yükle, sütunları eşleştir, önizlemede kontrol et ve içe aktar.
        </p>
      </div>

      <ol className="flex items-center gap-2 flex-wrap" aria-label="Adımlar">
        {STEPS.map(([s, label], i) => (
          <li key={s} className="flex items-center gap-2" aria-current={i === currentIdx ? "step" : undefined}>
            <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium" style={{ background: i <= currentIdx ? "var(--gold)" : "var(--border)", color: i <= currentIdx ? "var(--obsidian)" : "var(--text-muted-warm)" }}>
              {i + 1}
            </span>
            <span className="text-xs" style={{ color: i <= currentIdx ? "var(--charcoal)" : "var(--text-muted-warm)" }}>
              {label}
            </span>
            {i < STEPS.length - 1 && <ArrowRight size={12} style={{ color: "var(--border)" }} aria-hidden />}
          </li>
        ))}
      </ol>

      {step === "upload" && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Excel dosyası seç"
          className="rounded-xl border-2 border-dashed p-12 text-center cursor-pointer transition-colors hover:border-[var(--gold)] focus-visible:border-[var(--gold)] outline-none"
          style={{ borderColor: "var(--border)", background: "#fff" }}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), inputRef.current?.click())}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            const f = e.dataTransfer.files[0]
            if (f) handleFile(f)
          }}
        >
          <FileSpreadsheet size={40} className="mx-auto mb-4" style={{ color: "#8B7140" }} aria-hidden />
          <p className="font-medium" style={{ color: "var(--charcoal)" }}>
            Excel dosyasını buraya sürükle
          </p>
          <p className="text-sm mt-1" style={muted}>
            veya tıkla · .xlsx, .xls · en fazla 5 MB
          </p>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              e.target.value = ""
              if (f) handleFile(f)
            }}
          />
        </div>
      )}

      {step === "mapping" && (
        <div className="space-y-4">
          <div className="rounded-xl p-4" style={{ background: "#fff", border: "1px solid var(--border)" }}>
            <p className="text-sm font-medium mb-1" style={{ color: "var(--charcoal)" }}>
              {file?.name}
            </p>
            <p className="text-xs" style={muted}>
              {headers.length} sütun algılandı · Otomatik eşleştirme yapıldı, lütfen kontrol et
            </p>
          </div>
          <div className="space-y-2">
            {DB_FIELDS.map(({ key, label, hint }) => (
              <div key={key} className="flex items-center gap-3 p-3 rounded-lg flex-wrap sm:flex-nowrap" style={{ background: "#fff", border: "1px solid var(--border)" }}>
                <label htmlFor={`map-${key}`} className="text-xs w-full sm:w-56 shrink-0" style={{ color: "var(--charcoal)" }}>
                  {label}
                  {hint && (
                    <span className="block text-[10px]" style={muted}>
                      {hint}
                    </span>
                  )}
                </label>
                <ArrowRight size={12} style={{ color: "var(--border)" }} className="hidden sm:block" aria-hidden />
                <Select value={mapping[key] ?? "__none"} onValueChange={(v) => setMapping((m) => ({ ...m, [key]: v === "__none" || !v ? undefined : (v as string) }))}>
                  <SelectTrigger id={`map-${key}`} className="flex-1 h-8 text-xs w-full">
                    <SelectValue>{(v: string) => (v && v !== "__none" ? headerLabel(v) : "— Eşleştirme yok —")}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">— Eşleştirme yok —</SelectItem>
                    {headers.map((h) => (
                      <SelectItem key={h} value={h}>
                        {headerLabel(h)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={reset}>
              Geri
            </Button>
            <Button onClick={handlePreview} disabled={!mapping.parfumAdi || busy} className="flex-1" style={{ background: "var(--charcoal)", color: "var(--ivory)" }}>
              <Eye size={14} className="mr-1.5" />
              {busy ? "Kontrol ediliyor..." : "Önizle ve Doğrula"}
            </Button>
          </div>
        </div>
      )}

      {(step === "preview" || step === "importing") && plan && (
        <div className="space-y-4">
          {plan.alreadyImported && (
            <div role="alert" className="flex items-start gap-2 rounded-lg px-4 py-3 text-sm" style={{ background: "rgba(234,179,8,0.1)", border: "1px solid rgba(234,179,8,0.35)", color: "#854d0e" }}>
              <AlertTriangle size={15} className="mt-0.5 shrink-0" />
              Bu dosya {new Date(plan.alreadyImported.at).toLocaleString("tr-TR")} tarihinde zaten içe aktarılmış. Tekrar aktarırsan mevcut partiler atlanır.
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Toplam satır", value: plan.totalRows, color: "var(--charcoal)" },
              { label: "Üretim / stok satırı", value: `${plan.batchRows} / ${plan.stockRows}`, color: "var(--charcoal)" },
              { label: "Uyarılı", value: plan.warningRows, color: "#854d0e" },
              { label: "Aktarılamayacak", value: plan.errorRows, color: "#b91c1c" },
            ].map((c) => (
              <div key={c.label} className="rounded-xl p-3 text-center" style={{ background: "#fff", border: "1px solid var(--border)" }}>
                <p className="text-xl font-serif" style={{ color: c.color }}>
                  {c.value}
                </p>
                <p className="text-[11px]" style={muted}>
                  {c.label}
                </p>
              </div>
            ))}
          </div>
          <div className="rounded-xl p-4 text-xs space-y-1" style={{ background: "#fff", border: "1px solid var(--border)", color: "var(--charcoal)" }}>
            <p>
              <strong>{plan.newPerfumes.length}</strong> yeni parfüm, <strong>{plan.newEssences.length}</strong> yeni esans oluşturulacak
              {plan.existingEssences.length > 0 && <>; {plan.existingEssences.length} esans zaten var (üretimleri bunlara eklenecek)</>}.
            </p>
            <p style={muted}>Yeni parfümler gizli olarak oluşturulur; kontrol ettikten sonra Parfümler sayfasından yayınlayabilirsin.</p>
          </div>

          <RowTable rows={shownRows} total={reportRows.length} filter={rowFilter} setFilter={setRowFilter} />

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep("mapping")} disabled={busy}>
              Eşleştirmeye dön
            </Button>
            <Button onClick={handleImport} disabled={busy || plan.validRows === 0} className="flex-1" style={{ background: "var(--charcoal)", color: "var(--ivory)" }}>
              <Upload size={14} className="mr-1.5" />
              {busy ? "İçe aktarılıyor..." : `${plan.validRows} satırı içe aktar`}
            </Button>
          </div>
        </div>
      )}

      {step === "done" && result && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Başarılı", value: result.successfulRows, color: "#15803d", bg: "rgba(34,197,94,0.08)" },
              { label: "Atlandı (zaten var)", value: result.skippedRows, color: "var(--text-muted-warm)", bg: "#fff" },
              { label: "Uyarılı", value: result.warningsCount, color: "#854d0e", bg: "rgba(234,179,8,0.08)" },
              { label: "Hatalı", value: result.failedRows, color: "#b91c1c", bg: "rgba(239,68,68,0.06)" },
            ].map((c) => (
              <div key={c.label} className="rounded-xl p-4 text-center" style={{ background: c.bg, border: "1px solid var(--border)" }}>
                <p className="text-2xl font-serif" style={{ color: c.color }}>
                  {c.value}
                </p>
                <p className="text-xs mt-0.5" style={muted}>
                  {c.label}
                </p>
              </div>
            ))}
          </div>
          <div role="status" className="rounded-xl p-4 text-sm space-y-1" style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.25)", color: "#15803d" }}>
            <p className="flex items-center gap-2">
              <CheckCircle2 size={16} /> {result.batchesCreated} üretim kaydı içe aktarıldı.
            </p>
            <p>
              {result.createdPerfumes.length} benzersiz parfüm, {result.createdEssences.length} esans stoğu oluşturuldu; {result.stockEntries} stok girişi işlendi.
            </p>
            {result.warningsCount > 0 && <p style={{ color: "#854d0e" }}>{result.warningsCount} satırda kontrol edilmesi gereken tutarsızlık var.</p>}
          </div>
          <RowTable rows={shownRows} total={reportRows.length} filter={rowFilter} setFilter={setRowFilter} />
          <Button onClick={reset} variant="outline" className="w-full">
            Yeni Dosya Yükle
          </Button>
        </div>
      )}

      {step === "importing" && (
        <p role="status" className="text-sm text-center animate-pulse" style={muted}>
          İçe aktarılıyor, lütfen sayfadan ayrılma...
        </p>
      )}

      <div className="pt-4 border-t" style={{ borderColor: "var(--border)" }}>
        <p className="text-xs font-medium mb-2 uppercase tracking-wider" style={muted}>
          Veri Bakımı
        </p>
        <div className="rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap" style={{ background: "#fff", border: "1px solid var(--border)" }}>
          <div className="min-w-0">
            <p className="text-sm font-medium" style={{ color: "var(--charcoal)" }}>
              Marka ve Toplam Düzeltme
            </p>
            <p className="text-xs mt-0.5" style={muted}>
              Parfüm adlarından marka ayıklar, son üretim tarihi ve toplam ml&apos;yi partilerden yeniden hesaplar
            </p>
          </div>
          <Button onClick={handleMigrate} disabled={migrating} variant="outline" size="sm" className="shrink-0" style={{ borderColor: "#8B7140", color: "#8B7140" }}>
            <Wrench size={13} className="mr-1.5" />
            {migrating ? "Çalışıyor..." : "Çalıştır"}
          </Button>
        </div>
      </div>
    </div>
  )
}

function RowTable({ rows, total, filter, setFilter }: { rows: RowReport[]; total: number; filter: "issues" | "all"; setFilter: (f: "issues" | "all") => void }) {
  const STATUS = {
    ok: { label: "Tamam", color: "#15803d" },
    warning: { label: "Uyarı", color: "#854d0e" },
    error: { label: "Hata", color: "#b91c1c" },
    skipped: { label: "Atlandı", color: "#57534e" },
  }
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "#fff", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between px-4 py-2 border-b" style={{ borderColor: "var(--border)" }}>
        <p className="text-xs font-medium flex items-center gap-1.5" style={{ color: "var(--charcoal)" }}>
          <AlertCircle size={13} /> Satır raporu
        </p>
        <div className="flex gap-1 text-[11px]" role="group" aria-label="Satır filtresi">
          {(
            [
              ["issues", "Sorunlu satırlar"],
              ["all", `Tümü (${total})`],
            ] as const
          ).map(([v, l]) => (
            <button key={v} type="button" aria-pressed={filter === v} onClick={() => setFilter(v)} className="px-2 py-1 rounded" style={{ background: filter === v ? "var(--charcoal)" : "transparent", color: filter === v ? "var(--ivory)" : "var(--text-muted-warm)" }}>
              {l}
            </button>
          ))}
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="px-4 py-6 text-xs text-center" style={{ color: "var(--text-muted-warm)" }}>
          Sorunlu satır yok.
        </p>
      ) : (
        <ul className="max-h-80 overflow-y-auto divide-y" style={{ borderColor: "var(--border)" }}>
          {rows.map((r) => (
            <li key={r.row} className="px-4 py-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-mono shrink-0" style={{ color: "var(--text-muted-warm)" }}>
                  Satır {r.row}
                </span>
                <span className="truncate" style={{ color: "var(--charcoal)" }}>
                  {r.name ?? "—"}
                </span>
                <span className="text-[10px] shrink-0" style={{ color: "var(--text-muted-warm)" }}>
                  {r.kind === "stock" ? "stok girişi" : "üretim"}
                </span>
                <span className="ml-auto shrink-0 font-medium" style={{ color: STATUS[r.status].color }}>
                  {STATUS[r.status].label}
                </span>
              </div>
              {[...r.errors.map((m) => ({ m, c: "#b91c1c" })), ...r.warnings.map((m) => ({ m, c: "#854d0e" }))].map(({ m, c }, i) => (
                <p key={i} className="pl-4 mt-0.5" style={{ color: c }}>
                  • {m}
                </p>
              ))}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
