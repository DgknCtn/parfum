"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { StockBadge } from "@/components/admin/StockBadge"
import { toast } from "sonner"
import { Plus, Package, Trash2, AlertCircle, CheckCircle2, Calculator } from "lucide-react"

interface Batch {
  id: string
  batchLabel: string
  productionDate: string
  totalVolumeMl: number
  essenceRatio: number
  essenceVolumeMl: number
  alcoholVolumeMl: number
  waterVolumeMl: number
  publicVisible: boolean
  notes: string | null
  perfume: { id: string; name: string; brandName: string | null }
  essence: { id: string; name: string; currentVolumeMl: number; status: string }
}

interface Perfume { id: string; name: string }
interface Essence { id: string; name: string; currentVolumeMl: number; status: string }

export default function BatchesPage() {
  const [batches, setBatches] = useState<Batch[]>([])
  const [perfumes, setPerfumes] = useState<Perfume[]>([])
  const [essences, setEssences] = useState<Essence[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)

  const [form, setForm] = useState({
    perfumeId: "",
    essenceId: "",
    batchLabel: "",
    productionDate: new Date().toISOString().split("T")[0],
    totalVolumeMl: "50",
    essenceRatio: "25",
    essenceVolumeMl: "",
    alcoholVolumeMl: "",
    waterVolumeMl: "",
    cost: "",
    notes: "",
    publicVisible: false,
  })

  const [stockCheck, setStockCheck] = useState<{ ok: boolean; available: number; required: number } | null>(null)

  const recalculate = useCallback(() => {
    const total = parseFloat(form.totalVolumeMl)
    const ratio = parseFloat(form.essenceRatio) / 100
    if (!isNaN(total) && !isNaN(ratio)) {
      const esansMl = total * ratio
      const remaining = total - esansMl
      setForm(f => ({
        ...f,
        essenceVolumeMl: esansMl.toFixed(1),
        alcoholVolumeMl: (remaining * 0.85).toFixed(1),
        waterVolumeMl: (remaining * 0.15).toFixed(1),
      }))

      const sel = essences.find(e => e.id === form.essenceId)
      if (sel) {
        setStockCheck({ ok: sel.currentVolumeMl >= esansMl, available: sel.currentVolumeMl, required: esansMl })
      }
    }
  }, [form.totalVolumeMl, form.essenceRatio, form.essenceId, essences])

  useEffect(() => { recalculate() }, [recalculate])

  async function fetchData() {
    const [bRes, pRes, eRes] = await Promise.all([
      fetch("/api/admin/batches"),
      fetch("/api/admin/perfumes"),
      fetch("/api/admin/essences"),
    ])
    if (bRes.ok) setBatches(await bRes.json())
    if (pRes.ok) setPerfumes(await pRes.json())
    if (eRes.ok) setEssences(await eRes.json())
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  async function handleSave() {
    if (!form.perfumeId || !form.essenceId || !form.batchLabel) {
      toast.error("Parfüm, esans ve parti adı zorunlu")
      return
    }

    const payload = {
      perfumeId: form.perfumeId,
      essenceId: form.essenceId,
      batchLabel: form.batchLabel,
      productionDate: form.productionDate,
      totalVolumeMl: parseFloat(form.totalVolumeMl),
      essenceRatio: parseFloat(form.essenceRatio) / 100,
      essenceVolumeMl: parseFloat(form.essenceVolumeMl),
      alcoholVolumeMl: parseFloat(form.alcoholVolumeMl),
      waterVolumeMl: parseFloat(form.waterVolumeMl),
      cost: form.cost ? parseFloat(form.cost) : undefined,
      notes: form.notes || undefined,
      publicVisible: form.publicVisible,
    }

    const res = await fetch("/api/admin/batches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (res.ok) {
      const data = await res.json()
      toast.success(`Üretim kaydedildi. Kalan esans: ${data.stockStatus.currentVolumeMl.toFixed(1)} ml`)
      setDialogOpen(false)
      fetchData()
    } else {
      const err = await res.json()
      if (err.available !== undefined) {
        toast.error(`Yetersiz stok! Mevcut: ${err.available.toFixed(1)} ml, Gerekli: ${err.required.toFixed(1)} ml`)
      } else {
        toast.error("Kayıt oluşturulamadı")
      }
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Bu üretim kaydını silmek istiyor musunuz? Stok iade edilecek.")) return
    const res = await fetch(`/api/admin/batches/${id}`, { method: "DELETE" })
    if (res.ok) { toast.success("Üretim silindi, stok iade edildi"); fetchData() }
    else toast.error("Silinemedi")
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif" style={{ color: "var(--charcoal)", fontFamily: "var(--font-gloock)" }}>
            Üretim Partileri
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted-warm)" }}>
            {batches.length} üretim kaydı
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} style={{ background: "var(--charcoal)", color: "var(--ivory)" }}>
          <Plus size={14} className="mr-1.5" /> Yeni Üretim
        </Button>
      </div>

      {/* Batches Table */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)", background: "#fff" }}>
        {loading ? (
          <div className="py-16 text-center"><Package size={28} className="mx-auto mb-3 animate-pulse opacity-30" /><p className="text-sm" style={{ color: "var(--text-muted-warm)" }}>Yükleniyor...</p></div>
        ) : batches.length === 0 ? (
          <div className="py-16 text-center"><Package size={28} className="mx-auto mb-3 opacity-20" /><p className="text-sm" style={{ color: "var(--text-muted-warm)" }}>Henüz üretim kaydı yok</p><Button onClick={() => setDialogOpen(true)} variant="outline" size="sm" className="mt-3">İlk üretimi ekle</Button></div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--ivory)" }}>
                {["Parfüm", "Esans", "Parti", "Tarih", "Hacim", "Oran", "Esans ml", "Eylem"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs uppercase tracking-wider font-medium" style={{ color: "var(--text-muted-warm)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {batches.map((b, i) => (
                <tr key={b.id} style={{ borderBottom: i < batches.length - 1 ? "1px solid var(--border)" : "none" }}>
                  <td className="px-4 py-3 font-medium" style={{ color: "var(--charcoal)" }}>{b.perfume.name}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: "var(--text-muted-warm)" }}>{b.essence.name}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: "var(--charcoal)" }}>{b.batchLabel}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: "var(--text-muted-warm)" }}>{new Date(b.productionDate).toLocaleDateString("tr-TR")}</td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--charcoal)" }}>{b.totalVolumeMl} ml</td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--gold)" }}>%{(b.essenceRatio * 100).toFixed(0)}</td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--charcoal)" }}>{b.essenceVolumeMl} ml</td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleDelete(b.id)} className="p-1.5 rounded hover:bg-red-50 transition-colors">
                      <Trash2 size={13} style={{ color: "#dc2626" }} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* New Batch Dialog - Calculator Mode */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg" style={{ background: "var(--ivory)", borderColor: "var(--border)" }}>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "var(--font-gloock)", color: "var(--charcoal)" }}>
              <Calculator size={16} className="inline mr-2" style={{ color: "var(--gold)" }} />
              Yeni Üretim
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2 max-h-[70vh] overflow-y-auto pr-1">
            {/* Perfume + Essence */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs uppercase tracking-wide" style={{ color: "var(--text-muted-warm)" }}>Parfüm</Label>
                <Select value={form.perfumeId} onValueChange={v => setForm(f => ({ ...f, perfumeId: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Seç..." /></SelectTrigger>
                  <SelectContent>
                    {perfumes.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wide" style={{ color: "var(--text-muted-warm)" }}>Esans</Label>
                <Select value={form.essenceId} onValueChange={v => setForm(f => ({ ...f, essenceId: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Seç..." /></SelectTrigger>
                  <SelectContent>
                    {essences.map(e => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name} ({e.currentVolumeMl.toFixed(0)} ml)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Stock check banner */}
            {stockCheck && (
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${stockCheck.ok ? "text-green-700" : "text-red-600"}`}
                style={{ background: stockCheck.ok ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)", border: `1px solid ${stockCheck.ok ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}` }}>
                {stockCheck.ok ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                {stockCheck.ok
                  ? `Stok yeterli. Mevcut: ${stockCheck.available.toFixed(1)} ml`
                  : `Yetersiz stok! Mevcut: ${stockCheck.available.toFixed(1)} ml, Gerekli: ${stockCheck.required.toFixed(1)} ml`}
              </div>
            )}

            {/* Batch label + date */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs uppercase tracking-wide" style={{ color: "var(--text-muted-warm)" }}>Parti Adı</Label>
                <Input value={form.batchLabel} onChange={e => setForm(f => ({ ...f, batchLabel: e.target.value }))} className="mt-1" placeholder="1. Parti" />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wide" style={{ color: "var(--text-muted-warm)" }}>Yapım Tarihi</Label>
                <Input type="date" value={form.productionDate} onChange={e => setForm(f => ({ ...f, productionDate: e.target.value }))} className="mt-1" />
              </div>
            </div>

            {/* Calculator section */}
            <div className="rounded-lg p-4 space-y-3" style={{ background: "rgba(201,168,92,0.06)", border: "1px solid rgba(201,168,92,0.2)" }}>
              <p className="text-xs font-medium tracking-wide uppercase" style={{ color: "var(--gold)" }}>
                <Calculator size={11} className="inline mr-1" /> Hesaplama
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs" style={{ color: "var(--text-muted-warm)" }}>Toplam Hacim (ml)</Label>
                  <Input type="number" value={form.totalVolumeMl} onChange={e => setForm(f => ({ ...f, totalVolumeMl: e.target.value }))} className="mt-1 font-mono" />
                </div>
                <div>
                  <Label className="text-xs" style={{ color: "var(--text-muted-warm)" }}>Esans Oranı (%)</Label>
                  <Input type="number" value={form.essenceRatio} onChange={e => setForm(f => ({ ...f, essenceRatio: e.target.value }))} className="mt-1 font-mono" min={0} max={100} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Esans ml", field: "essenceVolumeMl", accent: true },
                  { label: "Alkol ml", field: "alcoholVolumeMl", accent: false },
                  { label: "Su ml", field: "waterVolumeMl", accent: false },
                ].map(({ label, field, accent }) => (
                  <div key={field}>
                    <Label className="text-xs" style={{ color: accent ? "var(--gold)" : "var(--text-muted-warm)" }}>{label}</Label>
                    <Input
                      type="number"
                      value={form[field as keyof typeof form] as string}
                      onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                      className="mt-1 font-mono text-sm"
                      style={{ borderColor: accent ? "rgba(201,168,92,0.4)" : undefined }}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs uppercase tracking-wide" style={{ color: "var(--text-muted-warm)" }}>Maliyet (₺)</Label>
                <Input type="number" value={form.cost} onChange={e => setForm(f => ({ ...f, cost: e.target.value }))} className="mt-1" placeholder="İsteğe bağlı" />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.publicVisible} onChange={e => setForm(f => ({ ...f, publicVisible: e.target.checked }))} className="accent-[var(--gold)]" />
                  <span className="text-xs" style={{ color: "var(--text-muted-warm)" }}>Public göster</span>
                </label>
              </div>
            </div>

            <div>
              <Label className="text-xs uppercase tracking-wide" style={{ color: "var(--text-muted-warm)" }}>Notlar</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="mt-1" rows={2} />
            </div>

            <Button
              onClick={handleSave}
              disabled={stockCheck !== null && !stockCheck.ok}
              className="w-full"
              style={{ background: "var(--charcoal)", color: "var(--ivory)" }}
            >
              Üretimi Kaydet & Stoğu Düş
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
