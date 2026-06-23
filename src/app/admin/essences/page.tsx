"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { StockBadge, GenderBadge } from "@/components/admin/StockBadge"
import { toast } from "sonner"
import { Plus, Search, Droplets, Pencil, Trash2, Download, Calculator, X } from "lucide-react"

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
  status: "MEVCUT" | "AZ_STOK" | "BITTI" | "YETERSIZ" | "TUTARSIZ"
}

interface CapacityResult {
  essenceName: string
  currentVolumeMl: number
  bottleSizeMl: number
  essenceRatio: number
  requiredPerBottle: number
  possibleBottles: number
  remainingAfterMl: number
}

const emptyForm = {
  name: "", genderCategory: "BELIRTILMEMIS",
  initialVolumeMl: "", currentVolumeMl: "",
  minimumStockThresholdMl: "5", notes: "",
  supplier: "", pricePerMl: "",
}

export default function EssencesPage() {
  const router = useRouter()
  const [essences, setEssences] = useState<Essence[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("")

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setStatusFilter(params.get("status") ?? "")
  }, [])

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Essence | null>(null)
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false)
  const [adjustTarget, setAdjustTarget] = useState<Essence | null>(null)
  const [adjustAmount, setAdjustAmount] = useState("")
  const [adjustReason, setAdjustReason] = useState("")

  // Kaç şişe widget
  const [capacityTarget, setCapacityTarget] = useState<Essence | null>(null)
  const [capacityOpen, setCapacityOpen] = useState(false)
  const [bottleSize, setBottleSize] = useState("50")
  const [essenceRatio, setEssenceRatio] = useState("25")
  const [capacityResult, setCapacityResult] = useState<CapacityResult | null>(null)
  const [capacityLoading, setCapacityLoading] = useState(false)

  const [form, setForm] = useState(emptyForm)

  async function fetchEssences() {
    const res = await fetch("/api/admin/essences")
    if (res.ok) setEssences(await res.json())
    setLoading(false)
  }

  useEffect(() => { fetchEssences() }, [])

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  function openEdit(e: Essence) {
    setEditing(e)
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
    const payload: Record<string, unknown> = {
      name: form.name,
      genderCategory: form.genderCategory,
      initialVolumeMl: parseFloat(form.initialVolumeMl),
      currentVolumeMl: parseFloat(form.currentVolumeMl),
      minimumStockThresholdMl: parseFloat(form.minimumStockThresholdMl),
      notes: form.notes || undefined,
      supplier: form.supplier || undefined,
    }
    if (form.pricePerMl !== "") payload.pricePerMl = parseFloat(form.pricePerMl)

    const url = editing ? `/api/admin/essences/${editing.id}` : "/api/admin/essences"
    const method = editing ? "PATCH" : "POST"
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })

    if (res.ok) {
      toast.success(editing ? "Esans güncellendi" : "Esans oluşturuldu")
      setDialogOpen(false)
      fetchEssences()
    } else {
      toast.error("Bir hata oluştu")
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Bu esansı silmek istediğinize emin misiniz?")) return
    const res = await fetch(`/api/admin/essences/${id}`, { method: "DELETE" })
    if (res.ok) { toast.success("Esans silindi"); fetchEssences() }
    else toast.error("Silinemedi")
  }

  async function handleAdjust() {
    if (!adjustTarget || !adjustReason.trim()) { toast.error("Düzeltme nedeni zorunlu"); return }
    const newVolume = parseFloat(adjustAmount)
    if (isNaN(newVolume) || newVolume < 0) { toast.error("Geçerli bir değer girin"); return }

    const res = await fetch(`/api/admin/essences/${adjustTarget.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentVolumeMl: newVolume, adjustmentReason: adjustReason }),
    })
    if (res.ok) { toast.success("Stok güncellendi"); setAdjustDialogOpen(false); fetchEssences() }
    else toast.error("Güncelleme başarısız")
  }

  async function calculateCapacity() {
    if (!capacityTarget) return
    setCapacityLoading(true)
    const res = await fetch(
      `/api/admin/essences/${capacityTarget.id}/production-capacity?bottleSizeMl=${bottleSize}&essenceRatio=${parseFloat(essenceRatio) / 100}`
    )
    if (res.ok) {
      const data = await res.json()
      setCapacityResult({
        ...data,
        requiredPerBottle: data.requiredPerBottleMl ?? data.requiredPerBottle,
        possibleBottles: data.possibleBottleCount ?? data.possibleBottles,
      })
    }
    setCapacityLoading(false)
  }

  function openCapacity(e: Essence) {
    setCapacityTarget(e)
    setCapacityResult(null)
    setBottleSize("50")
    setEssenceRatio("25")
    setCapacityOpen(true)
  }

  function exportCsv() {
    const rows = [
      ["Ad", "Cinsiyet", "Kalan (ml)", "Başlangıç (ml)", "Min. Eşik", "Kullanılan (ml)", "Durum", "Tedarikçi", "Ml Fiyatı (₺)"],
      ...filtered.map(e => [
        e.name, e.genderCategory,
        String(e.currentVolumeMl), String(e.initialVolumeMl),
        String(e.minimumStockThresholdMl), String(e.totalUsedMl),
        e.status, e.supplier ?? "", e.pricePerMl != null ? String(e.pricePerMl) : "",
      ])
    ]
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n")
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a"); a.href = url; a.download = "esanslar.csv"; a.click()
    URL.revokeObjectURL(url)
  }

  const filtered = essences.filter((e) => {
    const matchesSearch = e.name.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = !statusFilter || e.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-3xl font-serif" style={{ color: "var(--charcoal)", fontFamily: "var(--font-gloock)" }}>
            Esanslar
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted-warm)" }}>
            {essences.length} esans · {essences.filter(e => e.status === "BITTI").length} bitti · {essences.filter(e => e.status === "AZ_STOK").length} az stok
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
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted-warm)" }} />
          <Input
            placeholder="Esans ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            style={{ background: "#fff", borderColor: "var(--border)" }}
          />
        </div>
        <Select
          value={statusFilter || "ALL"}
          onValueChange={(v) => {
            const next = v === "ALL" || !v ? "" : v
            setStatusFilter(next)
            router.replace(next ? `/admin/essences?status=${next}` : "/admin/essences")
          }}
        >
          <SelectTrigger className="w-full sm:w-44" style={{ background: "#fff", borderColor: "var(--border)" }}>
            <SelectValue placeholder="Tüm durumlar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tüm durumlar</SelectItem>
            <SelectItem value="MEVCUT">Mevcut</SelectItem>
            <SelectItem value="AZ_STOK">Az Stok</SelectItem>
            <SelectItem value="BITTI">Bitti</SelectItem>
            <SelectItem value="TUTARSIZ">Tutarsız</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)", background: "#fff" }}>
        {loading ? (
          <div className="py-16 text-center" style={{ color: "var(--text-muted-warm)" }}>
            <Droplets size={28} className="mx-auto mb-3 animate-pulse opacity-30" />
            <p className="text-sm">Yükleniyor...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center" style={{ color: "var(--text-muted-warm)" }}>
            <Droplets size={28} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">{search ? "Eşleşen esans bulunamadı" : "Henüz esans eklenmemiş"}</p>
            {!search && (
              <Button onClick={openCreate} variant="outline" size="sm" className="mt-3">
                İlk esansı ekle
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto"><table className="w-full text-sm min-w-[780px]">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--ivory)" }}>
                {["Esans Adı", "Cinsiyet", "Kalan (ml)", "Tedarikçi", "₺/ml", "Durum", "Eylemler"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs uppercase tracking-wider font-medium" style={{ color: "var(--text-muted-warm)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((e, i) => (
                <tr key={e.id} style={{ borderBottom: i < filtered.length - 1 ? "1px solid var(--border)" : "none" }}>
                  <td className="px-4 py-3 font-medium" style={{ color: "var(--charcoal)" }}>{e.name}</td>
                  <td className="px-4 py-3"><GenderBadge gender={e.genderCategory} /></td>
                  <td className="px-4 py-3 font-mono text-sm" style={{ color: e.currentVolumeMl <= 0 ? "#dc2626" : "var(--charcoal)" }}>
                    {e.currentVolumeMl.toFixed(1)}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: "var(--text-muted-warm)" }}>{e.supplier ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--text-muted-warm)" }}>
                    {e.pricePerMl != null ? `₺${e.pricePerMl.toFixed(2)}` : "—"}
                  </td>
                  <td className="px-4 py-3"><StockBadge status={e.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openCapacity(e)}
                        className="text-xs px-2 py-1 rounded border hover:bg-blue-50 transition-colors"
                        style={{ borderColor: "rgba(96,165,250,0.4)", color: "#3b82f6" }}
                        title="Kaç şişe üretilebilir?"
                      >
                        <Calculator size={12} />
                      </button>
                      <button
                        onClick={() => { setAdjustTarget(e); setAdjustAmount(String(e.currentVolumeMl)); setAdjustReason(""); setAdjustDialogOpen(true) }}
                        className="text-xs px-2 py-1 rounded border hover:bg-amber-50 transition-colors"
                        style={{ borderColor: "rgba(201,168,92,0.4)", color: "var(--gold)" }}
                      >
                        Düzelt
                      </button>
                      <button onClick={() => openEdit(e)} className="p-1.5 rounded hover:bg-gray-100 transition-colors">
                        <Pencil size={13} style={{ color: "var(--text-muted-warm)" }} />
                      </button>
                      <button onClick={() => handleDelete(e.id)} className="p-1.5 rounded hover:bg-red-50 transition-colors">
                        <Trash2 size={13} style={{ color: "#dc2626" }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto" style={{ background: "var(--ivory)", borderColor: "var(--border)" }}>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "var(--font-gloock)", color: "var(--charcoal)" }}>
              {editing ? "Esans Düzenle" : "Yeni Esans"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-xs uppercase tracking-wide" style={{ color: "var(--text-muted-warm)" }}>Esans Adı</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wide" style={{ color: "var(--text-muted-warm)" }}>Cinsiyet</Label>
              <Select value={form.genderCategory} onValueChange={v => setForm(f => ({ ...f, genderCategory: v ?? "BELIRTILMEMIS" }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="KADIN">Kadın</SelectItem>
                  <SelectItem value="ERKEK">Erkek</SelectItem>
                  <SelectItem value="UNISEX">Unisex</SelectItem>
                  <SelectItem value="BELIRTILMEMIS">Belirtilmemiş</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs uppercase tracking-wide" style={{ color: "var(--text-muted-warm)" }}>Başlangıç ml</Label>
                <Input type="number" value={form.initialVolumeMl} onChange={e => setForm(f => ({ ...f, initialVolumeMl: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wide" style={{ color: "var(--text-muted-warm)" }}>Kalan ml</Label>
                <Input type="number" value={form.currentVolumeMl} onChange={e => setForm(f => ({ ...f, currentVolumeMl: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wide" style={{ color: "var(--text-muted-warm)" }}>Min. Stok Eşiği (ml)</Label>
              <Input type="number" value={form.minimumStockThresholdMl} onChange={e => setForm(f => ({ ...f, minimumStockThresholdMl: e.target.value }))} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs uppercase tracking-wide" style={{ color: "var(--text-muted-warm)" }}>Tedarikçi</Label>
                <Input value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} className="mt-1" placeholder="İsteğe bağlı" />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wide" style={{ color: "var(--text-muted-warm)" }}>₺ / ml</Label>
                <Input type="number" value={form.pricePerMl} onChange={e => setForm(f => ({ ...f, pricePerMl: e.target.value }))} className="mt-1" placeholder="örn. 1.50" min={0} step={0.01} />
              </div>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wide" style={{ color: "var(--text-muted-warm)" }}>Notlar</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="mt-1" rows={2} />
            </div>
            <Button onClick={handleSave} className="w-full" style={{ background: "var(--charcoal)", color: "var(--ivory)" }}>
              {editing ? "Güncelle" : "Oluştur"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stock Adjustment Dialog */}
      <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
        <DialogContent style={{ background: "var(--ivory)", borderColor: "var(--border)" }}>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "var(--font-gloock)", color: "var(--charcoal)" }}>
              Stok Düzeltme — {adjustTarget?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm" style={{ color: "var(--text-muted-warm)" }}>
              Mevcut stok: <span className="font-mono font-medium" style={{ color: "var(--charcoal)" }}>{adjustTarget?.currentVolumeMl.toFixed(1)} ml</span>
            </p>
            <div>
              <Label className="text-xs uppercase tracking-wide" style={{ color: "var(--text-muted-warm)" }}>Yeni Miktar (ml)</Label>
              <Input type="number" value={adjustAmount} onChange={e => setAdjustAmount(e.target.value)} className="mt-1 font-mono" min={0} />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wide" style={{ color: "var(--text-muted-warm)" }}>Düzeltme Nedeni <span className="text-red-500">*</span></Label>
              <Textarea value={adjustReason} onChange={e => setAdjustReason(e.target.value)} className="mt-1" rows={2} placeholder="Neden güncelleniyor?" />
            </div>
            <Button onClick={handleAdjust} className="w-full" style={{ background: "var(--gold)", color: "var(--obsidian)" }}>
              Stoğu Güncelle
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Kaç Şişe Dialog */}
      <Dialog open={capacityOpen} onOpenChange={setCapacityOpen}>
        <DialogContent style={{ background: "var(--ivory)", borderColor: "var(--border)" }}>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "var(--font-gloock)", color: "var(--charcoal)" }}>
              Üretim Hesabı
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="rounded-lg px-4 py-3" style={{ background: "rgba(201,168,92,0.08)", border: "1px solid rgba(201,168,92,0.2)" }}>
              <p className="text-xs" style={{ color: "var(--text-muted-warm)" }}>Esans</p>
              <p className="font-medium" style={{ color: "var(--charcoal)" }}>{capacityTarget?.name}</p>
              <p className="text-xs mt-0.5 font-mono" style={{ color: "var(--text-muted-warm)" }}>
                Mevcut stok: {capacityTarget?.currentVolumeMl.toFixed(1)} ml
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs uppercase tracking-wide" style={{ color: "var(--text-muted-warm)" }}>Şişe Boyutu (ml)</Label>
                <Select value={bottleSize} onValueChange={(v) => v && setBottleSize(v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["10","15","25","30","50","100"].map(v => (
                      <SelectItem key={v} value={v}>{v} ml</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wide" style={{ color: "var(--text-muted-warm)" }}>Esans Oranı (%)</Label>
                <Input type="number" value={essenceRatio} onChange={e => setEssenceRatio(e.target.value)} className="mt-1 font-mono" min={1} max={100} />
              </div>
            </div>
            <Button onClick={calculateCapacity} disabled={capacityLoading} className="w-full" style={{ background: "var(--charcoal)", color: "var(--ivory)" }}>
              {capacityLoading ? "Hesaplanıyor..." : "Hesapla"}
            </Button>
            {capacityResult && (
              <div className="rounded-lg p-4 text-center space-y-1" style={{ background: "#fff", border: "1px solid var(--border)" }}>
                <p className="text-4xl font-serif" style={{ color: "var(--charcoal)", fontFamily: "var(--font-gloock)" }}>
                  {capacityResult.possibleBottles}
                </p>
                <p className="text-sm" style={{ color: "var(--text-muted-warm)" }}>
                  adet {capacityResult.bottleSizeMl} ml şişe üretilebilir
                </p>
                <p className="text-xs mt-2" style={{ color: "var(--text-muted-warm)" }}>
                  Her şişe için {(capacityResult.requiredPerBottle ?? (capacityResult.bottleSizeMl * capacityResult.essenceRatio)).toFixed(1)} ml · Sonraki üretim sonrası {capacityResult.remainingAfterMl.toFixed(1)} ml kalır
                </p>
                {capacityTarget?.pricePerMl != null && capacityResult.possibleBottles > 0 && (
                  <p className="text-xs mt-1 font-medium" style={{ color: "var(--gold)" }}>
                    Toplam esans maliyeti: ₺{((capacityResult.possibleBottles * capacityResult.bottleSizeMl * (capacityResult.essenceRatio ?? parseFloat(essenceRatio) / 100)) * capacityTarget.pricePerMl).toFixed(2)}
                  </p>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
