"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { FileSpreadsheet, Upload, CheckCircle2, AlertCircle, ArrowRight, Wrench } from "lucide-react"
import { parseExcelFile } from "@/lib/excel-parser"

const DB_FIELDS = [
  { key: "parfumAdi", label: "Parfüm Adı *" },
  { key: "partiBilgisi", label: "Parti Bilgisi" },
  { key: "esansMl", label: "Esans Başlangıç ml" },
  { key: "cinsiyet", label: "Cinsiyet" },
  { key: "ucret", label: "Ücret" },
  { key: "esansOrani", label: "Esans Oranı %" },
  { key: "yapimTarihi", label: "Yapım Tarihi" },
  { key: "parfumMl", label: "Parfüm ml (Toplam)" },
  { key: "kullanilanEsansMl", label: "Kullanılan Esans ml" },
  { key: "alkolMl", label: "Alkol ml" },
  { key: "suMl", label: "Su ml" },
  { key: "kalanEsansMl", label: "Kalan Esans ml" },
  { key: "notlar", label: "Notlar" },
]

type Step = "upload" | "mapping" | "importing" | "done"

interface ImportResult {
  totalRows: number
  successfulRows: number
  failedRows: number
  warningsCount: number
  errors: { row: number; errors: string[]; warnings?: string[] }[]
}

export default function ImportPage() {
  const [step, setStep] = useState<Step>("upload")
  const [headers, setHeaders] = useState<string[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [result, setResult] = useState<ImportResult | null>(null)
  const [importing, setImporting] = useState(false)
  const [migrating, setMigrating] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleMigrate() {
    setMigrating(true)
    const res = await fetch("/api/admin/migrate", { method: "POST" })
    const data = await res.json()
    setMigrating(false)
    if (res.ok) {
      toast.success(`Tamamlandı: ${data.brandFixed} marka ayrıştırıldı, ${data.datesFixed} tarih güncellendi`)
    } else {
      toast.error("Migration başarısız")
    }
  }

  async function handleFile(f: File) {
    setFile(f)
    const buffer = await f.arrayBuffer()
    const { headers } = parseExcelFile(buffer)
    setHeaders(headers)
    const autoMap: Record<string, string> = {}
    const hLower = headers.map(h => h.toLowerCase())

    const guesses: Record<string, string[]> = {
      parfumAdi: ["parfüm", "parfum", "ad", "isim", "name"],
      partiBilgisi: ["parti", "batch"],
      esansMl: ["esans ml", "başlangıç", "baslangic ml"],
      cinsiyet: ["cinsiyet", "gender"],
      ucret: ["ücret", "ucret", "maliyet", "cost", "fiyat"],
      esansOrani: ["oran", "ratio", "%"],
      yapimTarihi: ["tarih", "date", "yapim"],
      parfumMl: ["parfüm ml", "parfum ml", "toplam ml", "total"],
      kullanilanEsansMl: ["kullanılan esans", "kullanilan esans", "esans ml kullanılan"],
      alkolMl: ["alkol", "alcohol"],
      suMl: ["su ml", "water"],
      kalanEsansMl: ["kalan", "remaining", "kalan esans"],
      notlar: ["not", "note", "açıklama"],
    }

    for (const [field, keywords] of Object.entries(guesses)) {
      const match = hLower.findIndex(h => keywords.some(k => h.includes(k)))
      if (match !== -1) autoMap[field] = headers[match]
    }

    setMapping(autoMap)
    setStep("mapping")
  }

  async function handleImport() {
    if (!file) return
    setImporting(true)
    setStep("importing")

    const fd = new FormData()
    fd.append("file", file)
    fd.append("mapping", JSON.stringify(mapping))

    const res = await fetch("/api/admin/import", { method: "POST", body: fd })
    const data = await res.json()

    if (res.ok) {
      setResult(data)
      setStep("done")
      toast.success(`${data.successfulRows} kayıt içe aktarıldı`)
    } else {
      toast.error("İçe aktarma başarısız: " + (data.error ?? "Bilinmeyen hata"))
      setStep("mapping")
    }
    setImporting(false)
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-serif" style={{ color: "var(--charcoal)", fontFamily: "var(--font-gloock)" }}>
          Excel İçe Aktar
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted-warm)" }}>
          PARFUM.xlsx dosyanızı yükleyin, sütunları eşleştirin ve içe aktarın
        </p>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2">
        {["Dosya Yükle", "Sütun Eşleştir", "İçe Aktar", "Sonuç"].map((s, i) => {
          const stepMap: Step[] = ["upload", "mapping", "importing", "done"]
          const current = stepMap.indexOf(step)
          return (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${i <= current ? "text-[var(--obsidian)]" : "text-[var(--text-muted-warm)]"}`}
                style={{ background: i <= current ? "var(--gold)" : "var(--border)" }}>
                {i + 1}
              </div>
              <span className="text-xs hidden sm:block" style={{ color: i <= current ? "var(--charcoal)" : "var(--text-muted-warm)" }}>{s}</span>
              {i < 3 && <ArrowRight size={12} style={{ color: "var(--border)" }} />}
            </div>
          )
        })}
      </div>

      {/* Step 1: Upload */}
      {step === "upload" && (
        <div
          className="rounded-xl border-2 border-dashed p-12 text-center cursor-pointer transition-colors hover:border-[var(--gold)]"
          style={{ borderColor: "var(--border)", background: "#fff" }}
          onClick={() => inputRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
        >
          <FileSpreadsheet size={40} className="mx-auto mb-4" style={{ color: "var(--gold)" }} />
          <p className="font-medium" style={{ color: "var(--charcoal)" }}>Excel dosyasını buraya sürükleyin</p>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted-warm)" }}>veya tıklayın · .xlsx, .xls desteklenir</p>
          <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
        </div>
      )}

      {/* Step 2: Mapping */}
      {step === "mapping" && (
        <div className="space-y-4">
          <div className="rounded-xl p-4" style={{ background: "#fff", border: "1px solid var(--border)" }}>
            <p className="text-sm font-medium mb-1" style={{ color: "var(--charcoal)" }}>{file?.name}</p>
            <p className="text-xs" style={{ color: "var(--text-muted-warm)" }}>{headers.length} sütun algılandı · Otomatik eşleştirme yapıldı, lütfen kontrol edin</p>
          </div>

          <div className="space-y-2">
            {DB_FIELDS.map(({ key, label }) => (
              <div key={key} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "#fff", border: "1px solid var(--border)" }}>
                <span className="text-xs w-44 shrink-0" style={{ color: "var(--charcoal)" }}>{label}</span>
                <ArrowRight size={12} style={{ color: "var(--border)" }} />
                <Select value={mapping[key] ?? "__none"} onValueChange={v => setMapping(m => ({ ...m, [key]: v === "__none" || !v ? "" : v }))}>
                  <SelectTrigger className="flex-1 h-8 text-xs">
                    <SelectValue placeholder="Excel sütunu seç..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">— Eşleştirme yok —</SelectItem>
                    {headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep("upload")}>Geri</Button>
            <Button
              onClick={handleImport}
              disabled={!mapping.parfumAdi}
              className="flex-1"
              style={{ background: "var(--charcoal)", color: "var(--ivory)" }}
            >
              <Upload size={14} className="mr-1.5" />
              İçe Aktar
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Importing */}
      {step === "importing" && (
        <div className="py-16 text-center">
          <FileSpreadsheet size={40} className="mx-auto mb-4 animate-pulse" style={{ color: "var(--gold)" }} />
          <p className="font-medium" style={{ color: "var(--charcoal)" }}>İçe aktarılıyor...</p>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted-warm)" }}>Lütfen bekleyin</p>
        </div>
      )}

      {/* Step 4: Done */}
      {step === "done" && result && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Başarılı", value: result.successfulRows, color: "#16a34a", bg: "rgba(34,197,94,0.08)" },
              { label: "Başarısız", value: result.failedRows, color: "#dc2626", bg: "rgba(239,68,68,0.08)" },
              { label: "Uyarı", value: result.warningsCount, color: "#ca8a04", bg: "rgba(234,179,8,0.08)" },
            ].map(c => (
              <div key={c.label} className="rounded-xl p-4 text-center" style={{ background: c.bg, border: `1px solid ${c.color}20` }}>
                <p className="text-2xl font-serif" style={{ color: c.color }}>{c.value}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted-warm)" }}>{c.label}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl p-4" style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)" }}>
            <div className="flex items-center gap-2 text-sm" style={{ color: "#16a34a" }}>
              <CheckCircle2 size={16} />
              <span>{result.successfulRows} kayıt başarıyla içe aktarıldı</span>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="rounded-xl p-4 space-y-2" style={{ background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.15)" }}>
              <div className="flex items-center gap-2 text-xs font-medium" style={{ color: "#dc2626" }}>
                <AlertCircle size={13} />
                Hatalar ({result.errors.length} satır)
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {result.errors.slice(0, 20).map((e, i) => (
                  <p key={i} className="text-xs" style={{ color: "var(--text-muted-warm)" }}>
                    Satır {e.row}: {e.errors.join(", ")}
                  </p>
                ))}
              </div>
            </div>
          )}

          <Button onClick={() => { setStep("upload"); setFile(null); setResult(null) }} variant="outline" className="w-full">
            Yeni Dosya Yükle
          </Button>
        </div>
      )}

      {/* Maintenance */}
      <div className="pt-4 border-t" style={{ borderColor: "var(--border)" }}>
        <p className="text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: "var(--text-muted-warm)" }}>
          Veri Bakımı
        </p>
        <div className="rounded-xl p-4 flex items-center justify-between gap-4" style={{ background: "#fff", border: "1px solid var(--border)" }}>
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--charcoal)" }}>Marka ve Tarih Düzeltme</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted-warm)" }}>
              Parfüm adlarından marka ayıklar, son üretim tarihi ve toplam ml günceller
            </p>
          </div>
          <Button
            onClick={handleMigrate}
            disabled={migrating}
            variant="outline"
            size="sm"
            className="shrink-0"
            style={{ borderColor: "var(--gold)", color: "var(--gold)" }}
          >
            <Wrench size={13} className="mr-1.5" />
            {migrating ? "Çalışıyor..." : "Düzelt"}
          </Button>
        </div>
      </div>
    </div>
  )
}
