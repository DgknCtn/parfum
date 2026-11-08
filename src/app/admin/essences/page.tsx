"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { StockBadge, GenderBadge } from "@/components/admin/StockBadge"
import { useConfirm } from "@/components/admin/ConfirmDialog"
import { api, fmtMl } from "@/lib/client-api"
import { toast } from "sonner"
import { Plus, Search, Droplets, Pencil, Trash2, Download, Calculator, ArrowUpDown, Scale } from "lucide-react"

type Status = "MEVCUT" | "AZ_STOK" | "BITTI" | "YETERSIZ" | "TUTARSIZ"
interface Essence {
  id: string
  name: string
  genderCategory: string
  initialVolumeMl: number
  currentVolumeMl: number
  minimumStockThresholdMl: number
  totalUsedMl: number
  notes: string | null
  supplier: string | null
  pricePerMl: number | null
  status: Status
  ledgerDiffMl: number
  _count?: { batches: number }
}

interface SizeCalc {
  bottleSizeMl: number
  requiredEssencePerBottleMl: number
  possibleBottleCount: number
  remainingAfterProductionMl: number
}
interface CapacityResult extends SizeCalc {
  essenceName: string
  currentVolumeMl: number
  essenceRatio: number
  standardSizes: SizeCalc[]
}

const GENDERS = [
  ["KADIN", "Kadın"],
  ["ERKEK", "Erkek"],
  ["UNISEX", "Unisex"],
  ["BELIRTILMEMIS", "Belirtilmemiş"],
] as const

const emptyForm = { name: "", genderCategory: "BELIRTILMEMIS", initialVolumeMl: "", currentVolumeMl: "", minimumStockThresholdMl: "5", notes: "", supplier: "", pricePerMl: "" }
const n = (s: string) => (s.trim() === "" ? NaN : Number(s.replace(",", ".")))
type SortKey = "name" | "current" | "used" | "status"
const STATUS_ORDER: Record<Status, number> = { BITTI: 0, AZ_STOK: 1, YETERSIZ: 2, TUTARSIZ: 3, MEVCUT: 4 }

export default function EssencesPage() {
  return (
    <Suspense fallback={null}>
      <EssencesInner />
    </Suspense>
  )
}

function EssencesInner() {
  const router = useRouter()
  const sp = useSearchParams()
  const confirm = useConfirm()
  const [essences, setEssences] = useState<Essence[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const statusFilter = sp.get("status") ?? ""
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "name", dir: 1 })

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Essence | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const [adjustTarget, setAdjustTarget] = useState<Essence | null>(null)
  const [adjustAmount, setAdjustAmount] = useState("")
  const [adjustReason, setAdjustReason] = useState("")

  const [capacityTarget, setCapacityTarget] = useState<Essence | null>(null)
  const [bottleSize, setBottleSize] = useState("50")
  const [essenceRatio, setEssenceRatio] = useState("25")
  const [capacity, setCapacity] = useState<CapacityResult | null>(null)
  const [capacityLoading, setCapacityLoading] = useState(false)

  async function fetchEssences() {
    const res = await api<Essence[]>("/api/admin/essences")
    if (res.ok) setEssences(res.data)
    else toast.error(res.error)
    setLoading(false)
  }

  useEffect(() => {
    fetchEssences()
  }, [])

  function setStatusFilter(next: string) {
    router.replace(next ? `/admin/essences?status=${next}` : "/admin/essences")
  }

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setErrors({})
    setDialogOpen(true)
  }

  function openEdit(e: Essence) {
    setEditing(e)
    setErrors({})
    setForm({
      name: e.name,
      genderCategory: e.genderCategory,
      initialVolumeMl: String(e.initialVolumeMl),
      currentVolumeMl: String(e.currentVolumeMl),
      minimumStockThresholdMl: String(e.minimumStockThresholdMl),
      notes: e.notes ?? "",
      supplier: e.supplier ?? "",
      pricePerMl: e.pricePerMl != null ? String(e.pricePerMl) : "",
    })
    setDialogOpen(true)
  }

  async function handleSave() {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = "Esans adı gerekli"
    if (!(n(form.initialVolumeMl) > 0)) e.initialVolumeMl = "Pozitif bir miktar girin"
    if (!editing && form.currentVolumeMl.trim() && !(n(form.currentVolumeMl) >= 0)) e.currentVolumeMl = "Geçerli bir miktar girin"
    if (!(n(form.minimumStockThresholdMl) >= 0)) e.minimumStockThresholdMl = "0 veya pozitif bir değer girin"
    if (form.pricePerMl.trim() && !(n(form.pricePerMl) >= 0)) e.pricePerMl = "Geçerli bir fiyat girin"
    setErrors(e)
    if (Object.keys(e).length || saving) return

    const opt = (v: string) => (v.trim() ? v.trim() : null)
    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      genderCategory: form.genderCategory,
      initialVolumeMl: n(form.initialVolumeMl),
      minimumStockThresholdMl: n(form.minimumStockThresholdMl),
      notes: opt(form.notes),
      supplier: opt(form.supplier),
      pricePerMl: form.pricePerMl.trim() ? n(form.pricePerMl) : null,
    }
    // Kalan stok yalnızca oluştururken girilir; sonrası "Stok Düzelt" (sebepli) akışıyla değişir.
    if (!editing && form.currentVolumeMl.trim()) payload.currentVolumeMl = n(form.currentVolumeMl)

    setSaving(true)
    const res = await api(editing ? `/api/admin/essences/${editing.id}` : "/api/admin/essences", { method: editing ? "PATCH" : "POST", json: payload })
    setSaving(false)
    if (res.ok) {
      toast.success(editing ? "Esans güncellendi" : "Esans oluşturuldu")
      setDialogOpen(false)
      fetchEssences()
    } else toast.error(res.error)
  }

  async function handleDelete(e: Essence) {
    if ((e._count?.batches ?? 0) > 0) {
      toast.error(`Bu esansı kullanan ${e._count!.batches} parti var. Önce partileri silin veya başka esansa taşıyın.`)
      return
    }
    const ok = await confirm({ title: "Esans silinsin mi?", description: `${e.name} listeden kaldırılacak. Stok geçmişi korunur.`, confirmLabel: "Sil", destructive: true })
    if (!ok) return
    const res = await api(`/api/admin/essences/${e.id}`, { method: "DELETE" })
    if (res.ok) {
      toast.success("Esans silindi")
      fetchEssences()
    } else toast.error(res.error)
  }

  async function handleAdjust() {
    if (!adjustTarget) return
    const v = n(adjustAmount)
    if (!(v >= 0)) return toast.error("Geçerli bir miktar girin")
    if (adjustReason.trim().length < 3) return toast.error("Düzeltme nedeni zorunlu (en az 3 karakter)")
    const res = await api(`/api/admin/essences/${adjustTarget.id}`, { method: "PATCH", json: { currentVolumeMl: v, adjustmentReason: adjustReason.trim() } })
    if (res.ok) {
      toast.success("Stok güncellendi")
      setAdjustTarget(null)
      fetchEssences()
    } else toast.error(res.error)
  }

  async function handleReconcile(e: Essence) {
    const ok = await confirm({
      title: "Stok defteri eşitlensin mi?",
      description: `Kayıtlı kalan stok (${fmtMl(e.currentVolumeMl)}) doğru kabul edilecek ve hareket geçmişine ${e.ledgerDiffMl > 0 ? "+" : ""}${fmtMl(e.ledgerDiffMl)} düzeltme kaydı eklenecek.`,
      confirmLabel: "Eşitle",
      reasonLabel: "Sebep (zorunlu)",
    })
    if (!ok) return
    const res = await api(`/api/admin/essences/${e.id}/reconcile`, { method: "POST", json: { reason: ok.reason } })
    if (res.ok) {
      toast.success("Stok defteri eşitlendi")
      fetchEssences()
    } else toast.error(res.error)
  }

  async function calculateCapacity() {
    if (!capacityTarget) return
    const ratio = n(essenceRatio)
    if (!(ratio > 0 && ratio <= 100)) return toast.error("0–100 arası bir oran girin")
    setCapacityLoading(true)
    const res = await api<CapacityResult>(`/api/admin/essences/${capacityTarget.id}/production-capacity?bottleSizeMl=${encodeURIComponent(bottleSize)}&essenceRatio=${ratio / 100}`)
    setCapacityLoading(false)
    if (res.ok) setCapacity(res.data)
    else toast.error(res.error)
  }

  function openCapacity(e: Essence) {
    setCapacityTarget(e)
    setCapacity(null)
    setBottleSize("50")
    setEssenceRatio("25")
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("tr-TR")
    const list = essences.filter((e) => {
      if (q && !e.name.toLocaleLowerCase("tr-TR").includes(q) && !(e.supplier ?? "").toLocaleLowerCase("tr-TR").includes(q)) return false
      if (!statusFilter) return true
      if (statusFilter === "TUTARSIZ") return Math.abs(e.ledgerDiffMl) > 0.01
      return e.status === statusFilter
    })
    const val = (e: Essence): string | number =>
      sort.key === "name" ? e.name : sort.key === "current" ? e.currentVolumeMl : sort.key === "used" ? e.totalUsedMl : STATUS_ORDER[e.status]
    return list.sort((a, b) => {
      const va = val(a)
      const vb = val(b)
      return (typeof va === "string" ? va.localeCompare(vb as string, "tr") : va - (vb as number)) * sort.dir
    })
  }, [essences, search, statusFilter, sort])

  function exportCsv() {
    const rows = [
      ["Ad", "Cinsiyet", "Kalan (ml)", "Başlangıç (ml)", "Min. Eşik", "Kullanılan (ml)", "Durum", "Tedarikçi", "Ml Fiyatı (₺)"],
      ...filtered.map((e) => [e.name, e.genderCategory, String(e.currentVolumeMl), String(e.initialVolumeMl), String(e.minimumStockThresholdMl), String(e.totalUsedMl), e.status, e.supplier ?? "", e.pricePerMl != null ? String(e.pricePerMl) : ""]),
    ]
    const cell = (c: string) => `"${(/^[=+\-@]/.test(c) ? `'${c}` : c).replace(/"/g, '""')}"`
    const csv = rows.map((r) => r.map(cell).join(",")).join("\n")
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" }))
    const a = document.createElement("a")
    a.href = url
    a.download = "esanslar.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  const inconsistentCount = essences.filter((e) => Math.abs(e.ledgerDiffMl) > 0.01).length
  const lbl = "text-xs uppercase tracking-wide"
  const muted = { color: "var(--text-muted-warm)" }
  const err = (k: string) =>
    errors[k] ? (
      <p className="text-[11px] mt-1" style={{ color: "#b91c1c" }}>
        {errors[k]}
      </p>
    ) : null
  const sortTh = (k: SortKey, children: React.ReactNode) => (
    <th className="text-left px-4 py-3 text-xs uppercase tracking-wider font-medium" style={muted} aria-sort={sort.key === k ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
      <button type="button" onClick={() => setSort((s) => (s.key === k ? { key: k, dir: (s.dir * -1) as 1 | -1 } : { key: k, dir: k === "name" || k === "status" ? 1 : -1 }))} className="inline-flex items-center gap-1 hover:text-[var(--charcoal)]">
        {children} <ArrowUpDown size={11} aria-hidden />
      </button>
    </th>
  )
  const th = (children?: React.ReactNode) => (
    <th className="text-left px-4 py-3 text-xs uppercase tracking-wider font-medium" style={muted}>
      {children}
    </th>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-3xl font-serif" style={{ color: "var(--charcoal)", fontFamily: "var(--font-gloock)" }}>
            Esanslar
          </h1>
          <p className="text-sm mt-1" style={muted}>
            {essences.length} esans · {essences.filter((e) => e.status === "BITTI").length} bitti · {essences.filter((e) => e.status === "AZ_STOK").length} az stok
            {inconsistentCount > 0 && ` · ${inconsistentCount} tutarsız`}
          </p>
        </div>
        <div className="flex gap-2 shrink-0 flex-wrap">
          <Button onClick={exportCsv} variant="outline" size="sm" style={{ borderColor: "var(--border)" }}>
            <Download size={13} className="mr-1.5" /> CSV
          </Button>
          <Button onClick={openCreate} style={{ background: "var(--charcoal)", color: "var(--ivory)" }}>
            <Plus size={14} className="mr-1.5" /> Yeni Esans
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={muted} aria-hidden />
          <label htmlFor="essence-search" className="sr-only">
            Esans ara
          </label>
          <Input id="essence-search" placeholder="Esans veya tedarikçi ara..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" style={{ background: "#fff", borderColor: "var(--border)" }} />
        </div>
        <Select value={statusFilter || "ALL"} onValueChange={(v) => setStatusFilter(v === "ALL" || !v ? "" : (v as string))}>
          <SelectTrigger className="w-full sm:w-48" style={{ background: "#fff", borderColor: "var(--border)" }} aria-label="Durum filtresi">
            <SelectValue>{(v: string) => ({ ALL: "Tüm durumlar", MEVCUT: "Mevcut", AZ_STOK: "Az Stok", BITTI: "Bitti", TUTARSIZ: "Veri tutarsız" })[v] ?? "Tüm durumlar"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tüm durumlar</SelectItem>
            <SelectItem value="MEVCUT">Mevcut</SelectItem>
            <SelectItem value="AZ_STOK">Az Stok</SelectItem>
            <SelectItem value="BITTI">Bitti</SelectItem>
            <SelectItem value="TUTARSIZ">Veri tutarsız</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)", background: "#fff" }}>
        {loading ? (
          <div className="py-16 text-center" style={muted}>
            <Droplets size={28} className="mx-auto mb-3 animate-pulse opacity-30" />
            <p className="text-sm">Yükleniyor...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center" style={muted}>
            <Droplets size={28} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">{essences.length ? "Filtreye uygun esans bulunamadı" : "Henüz esans eklenmemiş"}</p>
            {!essences.length && (
              <Button onClick={openCreate} variant="outline" size="sm" className="mt-3">
                İlk esansı ekle
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[860px]">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--ivory)" }}>
                  {sortTh("name", "Esans Adı")}
                  {th("Cinsiyet")}
                  {sortTh("current", "Kalan")}
                  {sortTh("used", "Kullanılan")}
                  {th("Tedarikçi")}
                  {th("₺/ml")}
                  {sortTh("status", "Durum")}
                  {th(<span className="sr-only">Eylemler</span>)}
                </tr>
              </thead>
              <tbody>
                {filtered.map((e, i) => {
                  const inconsistent = Math.abs(e.ledgerDiffMl) > 0.01
                  return (
                    <tr key={e.id} style={{ borderBottom: i < filtered.length - 1 ? "1px solid var(--border)" : "none" }}>
                      <td className="px-4 py-3 font-medium" style={{ color: "var(--charcoal)" }}>
                        {e.name}
                        <span className="block text-[11px] font-normal" style={muted}>
                          {e._count?.batches ?? 0} parti · eşik {fmtMl(e.minimumStockThresholdMl)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <GenderBadge gender={e.genderCategory} />
                      </td>
                      <td className="px-4 py-3 font-mono text-sm" style={{ color: e.currentVolumeMl <= 0 ? "#b91c1c" : "var(--charcoal)" }}>
                        {fmtMl(e.currentVolumeMl)}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs" style={muted}>
                        {fmtMl(e.totalUsedMl)}
                      </td>
                      <td className="px-4 py-3 text-xs" style={muted}>
                        {e.supplier ?? "—"}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs" style={muted}>
                        {e.pricePerMl != null ? `₺${e.pricePerMl.toFixed(2)}` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-start gap-1">
                          <StockBadge status={e.status} />
                          {inconsistent && (
                            <button type="button" onClick={() => handleReconcile(e)} title={`Hareket geçmişi toplamı kalan stoktan ${fmtMl(e.ledgerDiffMl)} farklı. Eşitlemek için tıkla.`}>
                              <StockBadge status="TUTARSIZ" />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button type="button" onClick={() => openCapacity(e)} className="text-xs px-2 py-1 rounded border hover:bg-blue-50" style={{ borderColor: "rgba(96,165,250,0.5)", color: "#1d4ed8" }} title="Kaç şişe üretilebilir?" aria-label={`${e.name}: kaç şişe üretilebilir?`}>
                            <Calculator size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAdjustTarget(e)
                              setAdjustAmount(String(e.currentVolumeMl))
                              setAdjustReason("")
                            }}
                            className="text-xs px-2 py-1 rounded border hover:bg-amber-50"
                            style={{ borderColor: "rgba(201,168,92,0.5)", color: "#8B7140" }}
                            aria-label={`${e.name} stoğunu düzelt`}
                          >
                            Stok Düzelt
                          </button>
                          {inconsistent && (
                            <button type="button" onClick={() => handleReconcile(e)} className="p-1.5 rounded hover:bg-violet-50" title="Stok defterini eşitle" aria-label={`${e.name} stok defterini eşitle`}>
                              <Scale size={13} style={{ color: "#6d28d9" }} />
                            </button>
                          )}
                          <button type="button" onClick={() => openEdit(e)} className="p-1.5 rounded hover:bg-gray-100" aria-label={`${e.name} düzenle`} title="Düzenle">
                            <Pencil size={13} style={muted} />
                          </button>
                          <button type="button" onClick={() => handleDelete(e)} className="p-1.5 rounded hover:bg-red-50" aria-label={`${e.name} sil`} title="Sil">
                            <Trash2 size={13} style={{ color: "#b91c1c" }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Oluştur / Düzenle */}
      <Dialog open={dialogOpen} onOpenChange={(o) => !saving && setDialogOpen(o)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md" style={{ background: "var(--ivory)", borderColor: "var(--border)" }}>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "var(--font-gloock)", color: "var(--charcoal)" }}>{editing ? "Esans Düzenle" : "Yeni Esans"}</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4 mt-2"
            noValidate
            onSubmit={(ev) => {
              ev.preventDefault()
              handleSave()
            }}
          >
            <div>
              <Label htmlFor="es-name" className={lbl} style={muted}>
                Esans Adı *
              </Label>
              <Input id="es-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="mt-1" maxLength={200} aria-invalid={!!errors.name} />
              {err("name")}
            </div>
            <div>
              <Label htmlFor="es-gender" className={lbl} style={muted}>
                Cinsiyet
              </Label>
              <Select value={form.genderCategory} onValueChange={(v) => setForm((f) => ({ ...f, genderCategory: (v as string) ?? "BELIRTILMEMIS" }))}>
                <SelectTrigger id="es-gender" className="mt-1 w-full">
                  <SelectValue>{(v: string) => GENDERS.find(([g]) => g === v)?.[1] ?? "Seç"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {GENDERS.map(([v, l]) => (
                    <SelectItem key={v} value={v}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="es-initial" className={lbl} style={muted}>
                  Başlangıç ml *
                </Label>
                <Input id="es-initial" inputMode="decimal" value={form.initialVolumeMl} onChange={(e) => setForm((f) => ({ ...f, initialVolumeMl: e.target.value }))} className="mt-1" aria-invalid={!!errors.initialVolumeMl} />
                {err("initialVolumeMl")}
              </div>
              {editing ? (
                <div>
                  <p className={lbl} style={muted}>
                    Kalan ml
                  </p>
                  <p className="mt-2 font-mono text-sm" style={{ color: "var(--charcoal)" }}>
                    {fmtMl(editing.currentVolumeMl)}
                  </p>
                  <p className="text-[11px]" style={muted}>
                    &quot;Stok Düzelt&quot; ile değiştirilir
                  </p>
                </div>
              ) : (
                <div>
                  <Label htmlFor="es-current" className={lbl} style={muted}>
                    Kalan ml
                  </Label>
                  <Input id="es-current" inputMode="decimal" value={form.currentVolumeMl} onChange={(e) => setForm((f) => ({ ...f, currentVolumeMl: e.target.value }))} className="mt-1" placeholder="Boşsa başlangıç" aria-invalid={!!errors.currentVolumeMl} />
                  {err("currentVolumeMl")}
                </div>
              )}
            </div>
            {editing && n(form.initialVolumeMl) !== editing.initialVolumeMl && n(form.initialVolumeMl) > 0 && (
              <p className="text-[11px] rounded px-2 py-1.5" style={{ background: "rgba(234,179,8,0.1)", color: "#854d0e" }} role="status">
                Başlangıç stoğu değişirse kalan stok da aynı fark kadar ({n(form.initialVolumeMl) - editing.initialVolumeMl > 0 ? "+" : ""}
                {fmtMl(n(form.initialVolumeMl) - editing.initialVolumeMl)}) güncellenir ve stok geçmişine kaydedilir.
              </p>
            )}
            <div>
              <Label htmlFor="es-min" className={lbl} style={muted}>
                Min. Stok Eşiği (ml)
              </Label>
              <Input id="es-min" inputMode="decimal" value={form.minimumStockThresholdMl} onChange={(e) => setForm((f) => ({ ...f, minimumStockThresholdMl: e.target.value }))} className="mt-1" aria-invalid={!!errors.minimumStockThresholdMl} />
              {err("minimumStockThresholdMl")}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="es-supplier" className={lbl} style={muted}>
                  Tedarikçi
                </Label>
                <Input id="es-supplier" value={form.supplier} onChange={(e) => setForm((f) => ({ ...f, supplier: e.target.value }))} className="mt-1" placeholder="İsteğe bağlı" maxLength={200} />
              </div>
              <div>
                <Label htmlFor="es-price" className={lbl} style={muted}>
                  ₺ / ml
                </Label>
                <Input id="es-price" inputMode="decimal" value={form.pricePerMl} onChange={(e) => setForm((f) => ({ ...f, pricePerMl: e.target.value }))} className="mt-1" placeholder="örn. 1.50" aria-invalid={!!errors.pricePerMl} />
                {err("pricePerMl")}
              </div>
            </div>
            <div>
              <Label htmlFor="es-notes" className={lbl} style={muted}>
                Notlar
              </Label>
              <Textarea id="es-notes" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className="mt-1" rows={2} maxLength={4000} />
            </div>
            <Button type="submit" disabled={saving} className="w-full" style={{ background: "var(--charcoal)", color: "var(--ivory)" }}>
              {saving ? "Kaydediliyor..." : editing ? "Güncelle" : "Oluştur"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Stok düzeltme */}
      <Dialog open={!!adjustTarget} onOpenChange={(o) => !o && setAdjustTarget(null)}>
        <DialogContent style={{ background: "var(--ivory)", borderColor: "var(--border)" }}>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "var(--font-gloock)", color: "var(--charcoal)" }}>Stok Düzeltme — {adjustTarget?.name}</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4 mt-2"
            onSubmit={(ev) => {
              ev.preventDefault()
              handleAdjust()
            }}
          >
            <p className="text-sm" style={muted}>
              Mevcut stok:{" "}
              <span className="font-mono font-medium" style={{ color: "var(--charcoal)" }}>
                {adjustTarget && fmtMl(adjustTarget.currentVolumeMl)}
              </span>
            </p>
            <div>
              <Label htmlFor="adj-amount" className={lbl} style={muted}>
                Yeni miktar (ml)
              </Label>
              <Input id="adj-amount" inputMode="decimal" value={adjustAmount} onChange={(e) => setAdjustAmount(e.target.value)} className="mt-1 font-mono" />
              {adjustTarget && n(adjustAmount) >= 0 && (
                <p className="text-[11px] mt-1" style={muted}>
                  Fark: {n(adjustAmount) - adjustTarget.currentVolumeMl > 0 ? "+" : ""}
                  {fmtMl(n(adjustAmount) - adjustTarget.currentVolumeMl)}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="adj-reason" className={lbl} style={muted}>
                Düzeltme nedeni <span style={{ color: "#b91c1c" }}>*</span>
              </Label>
              <Textarea id="adj-reason" value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} className="mt-1" rows={2} placeholder="örn. Yeni şişe alındı, tartımda fark çıktı" required minLength={3} maxLength={500} />
            </div>
            <Button type="submit" disabled={adjustReason.trim().length < 3} className="w-full" style={{ background: "var(--gold)", color: "var(--obsidian)" }}>
              Stoğu Güncelle
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Kaç şişe */}
      <Dialog open={!!capacityTarget} onOpenChange={(o) => !o && setCapacityTarget(null)}>
        <DialogContent style={{ background: "var(--ivory)", borderColor: "var(--border)" }}>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "var(--font-gloock)", color: "var(--charcoal)" }}>Üretim Hesabı</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="rounded-lg px-4 py-3" style={{ background: "rgba(201,168,92,0.08)", border: "1px solid rgba(201,168,92,0.25)" }}>
              <p className="text-xs" style={muted}>
                Esans
              </p>
              <p className="font-medium" style={{ color: "var(--charcoal)" }}>
                {capacityTarget?.name}
              </p>
              <p className="text-xs mt-0.5 font-mono" style={muted}>
                Mevcut stok: {capacityTarget && fmtMl(capacityTarget.currentVolumeMl)}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="cap-size" className={lbl} style={muted}>
                  Şişe (ml)
                </Label>
                <Input id="cap-size" inputMode="decimal" value={bottleSize} onChange={(e) => setBottleSize(e.target.value)} className="mt-1 font-mono" />
              </div>
              <div>
                <Label htmlFor="cap-ratio" className={lbl} style={muted}>
                  Esans oranı (%)
                </Label>
                <Input id="cap-ratio" inputMode="decimal" value={essenceRatio} onChange={(e) => setEssenceRatio(e.target.value)} className="mt-1 font-mono" />
              </div>
            </div>
            <Button onClick={calculateCapacity} disabled={capacityLoading} className="w-full" style={{ background: "var(--charcoal)", color: "var(--ivory)" }}>
              {capacityLoading ? "Hesaplanıyor..." : "Hesapla"}
            </Button>
            {capacity && (
              <div className="space-y-3" aria-live="polite">
                <div className="rounded-lg p-4 text-center space-y-1" style={{ background: "#fff", border: "1px solid var(--border)" }}>
                  <p className="text-4xl font-serif" style={{ color: "var(--charcoal)", fontFamily: "var(--font-gloock)" }}>
                    {capacity.possibleBottleCount}
                  </p>
                  <p className="text-sm" style={muted}>
                    adet {fmtMl(capacity.bottleSizeMl)} şişe üretilebilir
                  </p>
                  <p className="text-xs mt-2" style={muted}>
                    Her şişe için {fmtMl(capacity.requiredEssencePerBottleMl)} esans · üretim sonrası {fmtMl(capacity.remainingAfterProductionMl)} kalır
                  </p>
                  {capacityTarget?.pricePerMl != null && capacity.possibleBottleCount > 0 && (
                    <p className="text-xs mt-1 font-medium" style={{ color: "#8B7140" }}>
                      Şişe başı esans maliyeti: ₺{(capacity.requiredEssencePerBottleMl * capacityTarget.pricePerMl).toFixed(2)}
                    </p>
                  )}
                </div>
                <table className="w-full text-xs rounded-lg overflow-hidden" style={{ background: "#fff", border: "1px solid var(--border)" }}>
                  <caption className="text-left text-[11px] mb-1" style={muted}>
                    Standart şişeler (%{n(essenceRatio)} oranla)
                  </caption>
                  <thead>
                    <tr style={{ background: "var(--ivory)" }}>
                      <th className="text-left px-3 py-2 font-medium" style={muted}>
                        Şişe
                      </th>
                      <th className="text-left px-3 py-2 font-medium" style={muted}>
                        Şişe başı esans
                      </th>
                      <th className="text-left px-3 py-2 font-medium" style={muted}>
                        Adet
                      </th>
                      <th className="text-left px-3 py-2 font-medium" style={muted}>
                        Artan
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {capacity.standardSizes.map((s) => (
                      <tr key={s.bottleSizeMl} style={{ borderTop: "1px solid var(--border)" }}>
                        <td className="px-3 py-2 font-mono">{fmtMl(s.bottleSizeMl)}</td>
                        <td className="px-3 py-2 font-mono">{fmtMl(s.requiredEssencePerBottleMl)}</td>
                        <td className="px-3 py-2 font-mono font-semibold" style={{ color: "var(--charcoal)" }}>
                          {s.possibleBottleCount}
                        </td>
                        <td className="px-3 py-2 font-mono">{fmtMl(s.remainingAfterProductionMl)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
