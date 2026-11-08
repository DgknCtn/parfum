"use client"

import { useMemo, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { AlertCircle, AlertTriangle, Calculator, CheckCircle2, RotateCcw } from "lucide-react"
import { api, fmtMl, todayIstanbul } from "@/lib/client-api"

export interface BatchLike {
  id: string
  batchLabel: string
  productionDate: string
  productionDateUnknown?: boolean
  totalVolumeMl: number
  essenceRatio: number
  essenceVolumeMl: number
  alcoholVolumeMl: number
  waterVolumeMl: number
  cost?: number | null
  notes: string | null
  publicVisible: boolean
  perfumeId?: string
  essenceId?: string
  perfume?: { id: string; name: string }
  essence?: { id: string; name: string }
}

interface Option {
  id: string
  name: string
  brandName?: string | null
}
interface EssenceOption extends Option {
  currentVolumeMl: number
}

type Mode = { kind: "create" } | { kind: "copy"; from: BatchLike } | { kind: "edit"; batch: BatchLike }

interface FormState {
  perfumeId: string
  essenceId: string
  batchLabel: string
  productionDate: string
  totalVolumeMl: string
  essenceRatio: string
  essenceVolumeMl: string
  alcoholVolumeMl: string
  waterVolumeMl: string
  waterShare: string
  cost: string
  notes: string
  publicVisible: boolean
}

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100
const num = (s: string) => (s.trim() === "" ? NaN : Number(s.replace(",", ".")))
type CalcField = "essenceVolumeMl" | "alcoholVolumeMl" | "waterVolumeMl"

/**
 * Hesap makinesi gibi çalışan üretim formu (PRD §4):
 * - toplam ml + oran → esans ml; kalan hacim alkol/su olarak önerilir
 * - esans ml elle girilirse oran geri hesaplanır
 * - elle değiştirilen alanlar otomatik hesapla ezilmez ("Yeniden hesapla" ile sıfırlanır)
 */
export function BatchFormDialog({
  open,
  onOpenChange,
  mode,
  perfumes,
  essences,
  fixedPerfumeId,
  onSaved,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  mode: Mode
  perfumes: Option[]
  essences: EssenceOption[]
  fixedPerfumeId?: string
  onSaved: () => void
}) {
  const src = mode.kind === "edit" ? mode.batch : mode.kind === "copy" ? mode.from : null
  const initial = (): FormState => ({
    perfumeId: fixedPerfumeId ?? src?.perfume?.id ?? src?.perfumeId ?? "",
    essenceId: src?.essence?.id ?? src?.essenceId ?? "",
    batchLabel: mode.kind === "edit" ? src!.batchLabel : "",
    productionDate:
      mode.kind === "edit" && !src!.productionDateUnknown
        ? new Date(src!.productionDate).toLocaleDateString("en-CA", { timeZone: "Europe/Istanbul" })
        : todayIstanbul(),
    totalVolumeMl: src ? String(src.totalVolumeMl) : "50",
    essenceRatio: src ? String(r2(src.essenceRatio * 100)) : "25",
    essenceVolumeMl: src ? String(src.essenceVolumeMl) : "",
    alcoholVolumeMl: src ? String(src.alcoholVolumeMl) : "",
    waterVolumeMl: src ? String(src.waterVolumeMl) : "",
    waterShare: "15",
    cost: mode.kind === "edit" && src!.cost != null ? String(src!.cost) : "",
    notes: mode.kind === "edit" ? src!.notes ?? "" : "",
    publicVisible: mode.kind === "edit" ? src!.publicVisible : false,
  })

  // Bileşen her açılışta `key` ile yeniden mount edilir → state burada sıfırlanır.
  // Kopya/düzenlemede kayıtlı değerler olduğu gibi gelir; yeni üretimde oran üzerinden hesaplanır.
  const [form, setForm] = useState(() => (src ? initial() : recompute(initial(), new Set())))
  const [dirty, setDirty] = useState<Set<CalcField>>(new Set())
  const [saving, setSaving] = useState(false)
  const [negativeReason, setNegativeReason] = useState("")
  const [allowNegative, setAllowNegative] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const total = num(form.totalVolumeMl)
  const ratioPct = num(form.essenceRatio)

  /** Otomatik hesap: yalnızca kirlenmemiş alanları günceller. */
  function recompute(next: FormState, dirtySet: Set<CalcField>): FormState {
    const t = num(next.totalVolumeMl)
    const rp = num(next.essenceRatio)
    const ws = Math.min(100, Math.max(0, num(next.waterShare) || 0)) / 100
    if (!Number.isFinite(t) || t <= 0) return next
    const out = { ...next }
    let essence = num(out.essenceVolumeMl)
    if (!dirtySet.has("essenceVolumeMl") && Number.isFinite(rp)) {
      essence = r2((t * rp) / 100)
      out.essenceVolumeMl = String(essence)
    }
    if (!Number.isFinite(essence)) return out
    const remaining = Math.max(0, t - essence)
    const alcoholDirty = dirtySet.has("alcoholVolumeMl")
    const waterDirty = dirtySet.has("waterVolumeMl")
    if (!alcoholDirty && !waterDirty) {
      const water = r2(remaining * ws)
      out.waterVolumeMl = String(water)
      out.alcoholVolumeMl = String(r2(remaining - water))
    } else if (!alcoholDirty) {
      out.alcoholVolumeMl = String(Math.max(0, r2(remaining - (num(out.waterVolumeMl) || 0))))
    } else if (!waterDirty) {
      out.waterVolumeMl = String(Math.max(0, r2(remaining - (num(out.alcoholVolumeMl) || 0))))
    }
    return out
  }

  function setField(field: keyof FormState, value: string) {
    const next = { ...form, [field]: value }
    let d = dirty
    if (field === "essenceVolumeMl" || field === "alcoholVolumeMl" || field === "waterVolumeMl") {
      d = new Set(dirty).add(field)
      // Esans ml elle girildi → oranı geri hesapla
      if (field === "essenceVolumeMl") {
        const t = num(next.totalVolumeMl)
        const e = num(value)
        if (t > 0 && Number.isFinite(e)) next.essenceRatio = String(r2((e / t) * 100))
      }
    } else if (field === "essenceRatio" && dirty.has("essenceVolumeMl")) {
      // Oran elle değişirse esans ml yeniden oran üzerinden hesaplanır
      d = new Set(dirty)
      d.delete("essenceVolumeMl")
    }
    setDirty(d)
    setForm(recompute(next, d))
  }

  function resetCalc() {
    const d = new Set<CalcField>()
    setDirty(d)
    setForm((f) => recompute(f, d))
  }

  const essenceMl = num(form.essenceVolumeMl)
  const alcohol = num(form.alcoholVolumeMl)
  const water = num(form.waterVolumeMl)
  const sum = (essenceMl || 0) + (alcohol || 0) + (water || 0)
  const sumDiffPct = total > 0 ? Math.abs(sum - total) / total : 0

  // Stok kontrolü: düzenlemede yalnızca fark kadar ek esans gerekir
  const stock = useMemo(() => {
    const sel = essences.find((e) => e.id === form.essenceId)
    if (!sel || !Number.isFinite(essenceMl)) return null
    let required = essenceMl
    let available = sel.currentVolumeMl
    if (mode.kind === "edit") {
      const oldEssenceId = mode.batch.essence?.id ?? mode.batch.essenceId
      if (oldEssenceId === sel.id) required = r2(essenceMl - mode.batch.essenceVolumeMl)
    }
    available = r2(available)
    return { name: sel.name, required: r2(required), available, ok: required <= available + 0.005 }
  }, [essences, form.essenceId, essenceMl, mode])

  function validate() {
    const e: Record<string, string> = {}
    if (!form.perfumeId) e.perfumeId = "Parfüm seçin"
    if (!form.essenceId) e.essenceId = "Esans seçin"
    if (!form.batchLabel.trim()) e.batchLabel = "Parti adı gerekli"
    if (!form.productionDate) e.productionDate = "Tarih gerekli"
    if (!(total > 0)) e.totalVolumeMl = "Pozitif bir hacim girin"
    if (!(ratioPct > 0 && ratioPct <= 100)) e.essenceRatio = "0–100 arası bir oran girin"
    if (!(essenceMl > 0)) e.essenceVolumeMl = "Pozitif bir değer girin"
    else if (essenceMl > total) e.essenceVolumeMl = "Toplam hacimden büyük olamaz"
    if (!(alcohol >= 0)) e.alcoholVolumeMl = "Geçerli bir değer girin"
    if (!(water >= 0)) e.waterVolumeMl = "Geçerli bir değer girin"
    if (sumDiffPct > 0.1) e.totalVolumeMl = "Bileşen toplamı toplam hacimden %10'dan fazla farklı"
    if (stock && !stock.ok && !allowNegative) e.stock = "Yetersiz stok"
    if (allowNegative && negativeReason.trim().length < 3) e.negativeReason = "Açıklama gerekli"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSave() {
    if (saving || !validate()) return
    setSaving(true)
    const payload = {
      perfumeId: form.perfumeId,
      essenceId: form.essenceId,
      batchLabel: form.batchLabel.trim(),
      productionDate: form.productionDate,
      totalVolumeMl: total,
      essenceRatio: ratioPct / 100,
      essenceVolumeMl: essenceMl,
      alcoholVolumeMl: alcohol,
      waterVolumeMl: water,
      cost: form.cost.trim() ? num(form.cost) : null,
      notes: form.notes.trim() || null,
      publicVisible: form.publicVisible,
      ...(allowNegative ? { allowNegativeStock: true, negativeStockReason: negativeReason.trim() } : {}),
    }
    const res =
      mode.kind === "edit"
        ? await api<{ warnings?: string[] }>(`/api/admin/batches/${mode.batch.id}`, { method: "PATCH", json: payload })
        : await api<{ warnings?: string[]; stockStatus: { currentVolumeMl: number } }>("/api/admin/batches", { method: "POST", json: payload })
    setSaving(false)

    if (!res.ok) {
      if (res.body.code === "INSUFFICIENT_STOCK") setErrors((e) => ({ ...e, stock: res.error }))
      toast.error(res.error)
      return
    }
    const data = res.data as { warnings?: string[]; stockStatus?: { currentVolumeMl: number } }
    toast.success(
      mode.kind === "edit"
        ? "Parti güncellendi, stok farkı uygulandı"
        : `Üretim kaydedildi. Kalan esans: ${fmtMl(data.stockStatus?.currentVolumeMl ?? 0)}`
    )
    for (const w of data.warnings ?? []) toast.warning(w)
    onOpenChange(false)
    onSaved()
  }

  const title = mode.kind === "edit" ? `Partiyi Düzenle — ${mode.batch.batchLabel}` : mode.kind === "copy" ? "Reçeteyi Kopyala" : "Yeni Üretim"
  const lbl = "text-xs uppercase tracking-wide"
  const muted = { color: "var(--text-muted-warm)" }
  const err = (k: string) =>
    errors[k] ? (
      <p id={`err-${k}`} className="text-[11px] mt-1" style={{ color: "#b91c1c" }}>
        {errors[k]}
      </p>
    ) : null

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="max-w-lg sm:max-w-lg" style={{ background: "var(--ivory)", borderColor: "var(--border)" }}>
        <DialogHeader>
          <DialogTitle style={{ fontFamily: "var(--font-gloock)", color: "var(--charcoal)" }}>
            <Calculator size={16} className="inline mr-2" style={{ color: "var(--gold)" }} />
            {title}
          </DialogTitle>
        </DialogHeader>

        <form
          className="space-y-4 mt-1 max-h-[72vh] overflow-y-auto pr-1"
          onSubmit={(e) => {
            e.preventDefault()
            handleSave()
          }}
          noValidate
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {!fixedPerfumeId && (
              <div>
                <Label htmlFor="bf-perfume" className={lbl} style={muted}>
                  Parfüm
                </Label>
                <Select value={form.perfumeId} onValueChange={(v) => setForm((f) => ({ ...f, perfumeId: (v as string) ?? "" }))}>
                  <SelectTrigger id="bf-perfume" className="mt-1 w-full" aria-invalid={!!errors.perfumeId}>
                    <SelectValue placeholder="Seç...">
                      {(v: string) => perfumes.find((p) => p.id === v)?.name ?? "Seç..."}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {perfumes.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.brandName ? `${p.brandName} — ${p.name}` : p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {err("perfumeId")}
              </div>
            )}
            <div className={fixedPerfumeId ? "sm:col-span-2" : ""}>
              <Label htmlFor="bf-essence" className={lbl} style={muted}>
                Esans
              </Label>
              <Select value={form.essenceId} onValueChange={(v) => setForm((f) => ({ ...f, essenceId: (v as string) ?? "" }))}>
                <SelectTrigger id="bf-essence" className="mt-1 w-full" aria-invalid={!!errors.essenceId}>
                  <SelectValue placeholder="Seç...">
                    {(v: string) => essences.find((e) => e.id === v)?.name ?? "Seç..."}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {essences.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name} ({fmtMl(e.currentVolumeMl)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {err("essenceId")}
            </div>
          </div>

          {stock && (
            <div
              role="status"
              className="flex items-start gap-2 px-3 py-2 rounded-lg text-xs"
              style={{
                color: stock.ok ? "#15803d" : "#b91c1c",
                background: stock.ok ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
                border: `1px solid ${stock.ok ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`,
              }}
            >
              {stock.ok ? <CheckCircle2 size={13} className="mt-0.5 shrink-0" /> : <AlertCircle size={13} className="mt-0.5 shrink-0" />}
              <div className="space-y-1">
                {stock.ok ? (
                  <span>
                    Stok yeterli. Mevcut: {fmtMl(stock.available)}
                    {stock.required > 0 ? ` → üretim sonrası ${fmtMl(stock.available - stock.required)}` : ""}
                  </span>
                ) : (
                  <>
                    <span className="font-medium block">
                      Bu üretim için {fmtMl(stock.required)} esans gerekiyor; mevcut stok {fmtMl(stock.available)}.
                    </span>
                    <span className="block">Seçenekler: miktarı azalt · oranı azalt · farklı esans seç · Esanslar sayfasından stoğu güncelle</span>
                    <label className="flex items-center gap-2 pt-1 cursor-pointer" style={{ color: "var(--charcoal)" }}>
                      <input type="checkbox" checked={allowNegative} onChange={(e) => setAllowNegative(e.target.checked)} className="accent-[var(--gold)]" />
                      Yine de eksi stokla kaydet (admin onayı)
                    </label>
                    {allowNegative && (
                      <div>
                        <Label htmlFor="bf-negreason" className="sr-only">
                          Eksi stok açıklaması
                        </Label>
                        <Input
                          id="bf-negreason"
                          value={negativeReason}
                          onChange={(e) => setNegativeReason(e.target.value)}
                          placeholder="Neden? (örn. yeni şişe geldi, stok henüz girilmedi)"
                          className="h-8 text-xs"
                          aria-invalid={!!errors.negativeReason}
                        />
                        {err("negativeReason")}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="bf-label" className={lbl} style={muted}>
                Parti Adı
              </Label>
              <Input id="bf-label" value={form.batchLabel} onChange={(e) => setForm((f) => ({ ...f, batchLabel: e.target.value }))} className="mt-1" placeholder="7. Parti" maxLength={100} aria-invalid={!!errors.batchLabel} />
              {err("batchLabel")}
            </div>
            <div>
              <Label htmlFor="bf-date" className={lbl} style={muted}>
                Yapım Tarihi
              </Label>
              <Input id="bf-date" type="date" value={form.productionDate} onChange={(e) => setForm((f) => ({ ...f, productionDate: e.target.value }))} className="mt-1" aria-invalid={!!errors.productionDate} />
              {mode.kind === "edit" && mode.batch.productionDateUnknown && (
                <p className="text-[11px] mt-1" style={{ color: "#854d0e" }}>
                  Bu partinin tarihi bilinmiyordu; kaydederseniz bu tarih atanır.
                </p>
              )}
              {err("productionDate")}
            </div>
          </div>

          <fieldset className="rounded-lg p-4 space-y-3" style={{ background: "rgba(201,168,92,0.06)", border: "1px solid rgba(201,168,92,0.25)" }}>
            <legend className="sr-only">Reçete hesaplama</legend>
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium tracking-wide uppercase" style={{ color: "#8B7140" }}>
                <Calculator size={11} className="inline mr-1" /> Hesaplama
              </p>
              {dirty.size > 0 && (
                <button type="button" onClick={resetCalc} className="text-[11px] inline-flex items-center gap-1 hover:underline" style={{ color: "#8B7140" }}>
                  <RotateCcw size={11} /> Oranla yeniden hesapla
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <Label htmlFor="bf-total" className="text-xs" style={muted}>
                  Toplam (ml)
                </Label>
                <Input id="bf-total" inputMode="decimal" value={form.totalVolumeMl} onChange={(e) => setField("totalVolumeMl", e.target.value)} className="mt-1 font-mono" aria-invalid={!!errors.totalVolumeMl} />
              </div>
              <div>
                <Label htmlFor="bf-ratio" className="text-xs" style={muted}>
                  Esans oranı (%)
                </Label>
                <Input id="bf-ratio" inputMode="decimal" value={form.essenceRatio} onChange={(e) => setField("essenceRatio", e.target.value)} className="mt-1 font-mono" aria-invalid={!!errors.essenceRatio} />
              </div>
              <div>
                <Label htmlFor="bf-ws" className="text-xs" style={muted}>
                  Su payı (kalanın %)
                </Label>
                <Input id="bf-ws" inputMode="decimal" value={form.waterShare} onChange={(e) => setField("waterShare", e.target.value)} className="mt-1 font-mono" />
              </div>
            </div>
            {err("essenceRatio")}
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  ["essenceVolumeMl", "Esans ml"],
                  ["alcoholVolumeMl", "Alkol ml"],
                  ["waterVolumeMl", "Su ml"],
                ] as const
              ).map(([field, label]) => (
                <div key={field}>
                  <Label htmlFor={`bf-${field}`} className="text-xs" style={{ color: field === "essenceVolumeMl" ? "#8B7140" : "var(--text-muted-warm)" }}>
                    {label}
                    {dirty.has(field) && <span className="ml-1 text-[10px]">(elle)</span>}
                  </Label>
                  <Input
                    id={`bf-${field}`}
                    inputMode="decimal"
                    value={form[field]}
                    onChange={(e) => setField(field, e.target.value)}
                    className="mt-1 font-mono text-sm"
                    aria-invalid={!!errors[field]}
                  />
                  {err(field)}
                </div>
              ))}
            </div>
            {total > 0 && sumDiffPct > 0.02 && (
              <p className="flex items-center gap-1.5 text-[11px]" style={{ color: sumDiffPct > 0.1 ? "#b91c1c" : "#854d0e" }} role="status">
                <AlertTriangle size={12} />
                Bileşen toplamı {fmtMl(sum)}; toplam hacimden {fmtMl(Math.abs(sum - total))} ({(sumDiffPct * 100).toFixed(1)}%) farklı.
              </p>
            )}
            {err("totalVolumeMl")}
          </fieldset>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="bf-cost" className={lbl} style={muted}>
                Maliyet (₺)
              </Label>
              <Input id="bf-cost" inputMode="decimal" value={form.cost} onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))} className="mt-1" placeholder="İsteğe bağlı — public'te görünmez" />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.publicVisible} onChange={(e) => setForm((f) => ({ ...f, publicVisible: e.target.checked }))} className="accent-[var(--gold)]" />
                <span className="text-xs" style={muted}>
                  Bu partiyi public katalogda göster
                </span>
              </label>
            </div>
          </div>

          <div>
            <Label htmlFor="bf-notes" className={lbl} style={muted}>
              Notlar {form.publicVisible && <span className="normal-case">(public detayda görünür)</span>}
            </Label>
            <Textarea id="bf-notes" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className="mt-1" rows={2} maxLength={2000} />
          </div>

          {errors.stock && !allowNegative && (
            <p className="text-xs" style={{ color: "#b91c1c" }} role="alert">
              {errors.stock}
            </p>
          )}

          <Button type="submit" disabled={saving || (!!stock && !stock.ok && !allowNegative)} className="w-full" style={{ background: "var(--charcoal)", color: "var(--ivory)" }}>
            {saving ? "Kaydediliyor..." : mode.kind === "edit" ? "Değişiklikleri Kaydet & Stoğu Güncelle" : "Üretimi Kaydet & Stoğu Düş"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
