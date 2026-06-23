"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { StockBadge, GenderBadge } from "@/components/admin/StockBadge"
import { toast } from "sonner"
import { ArrowLeft, FlaskConical, Globe, EyeOff, Plus, Pencil, Trash2, Calculator } from "lucide-react"

interface Batch {
  id: string
  batchLabel: string
  productionDate: string
  totalVolumeMl: number
  essenceRatio: number
  essenceVolumeMl: number
  alcoholVolumeMl: number
  waterVolumeMl: number
  cost: number | null
  publicVisible: boolean
  notes: string | null
  essence: { id: string; name: string; currentVolumeMl: number; status: string }
}

interface Perfume {
  id: string
  name: string
  brandName: string | null
  genderCategory: string
  publicVisible: boolean
  slug: string
  description: string | null
  notes: string | null
  latestBatchDate: string | null
  totalProducedMl: number
  batches: Batch[]
}

interface Essence { id: string; name: string; currentVolumeMl: number; status: string }

export default function PerfumeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [perfume, setPerfume] = useState<Perfume | null>(null)
  const [essences, setEssences] = useState<Essence[]>([])
  const [loading, setLoading] = useState(true)

  // Batch create dialog
  const [batchDialogOpen, setBatchDialogOpen] = useState(false)
  const [batchForm, setBatchForm] = useState({
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

  // Batch edit dialog
  const [editBatchDialogOpen, setEditBatchDialogOpen] = useState(false)
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null)
  const [editBatchForm, setEditBatchForm] = useState({ publicVisible: false, notes: "" })

  const recalculate = useCallback(() => {
    const total = parseFloat(batchForm.totalVolumeMl)
    const ratio = parseFloat(batchForm.essenceRatio) / 100
    if (!isNaN(total) && !isNaN(ratio)) {
      const esansMl = total * ratio
      const remaining = total - esansMl
      setBatchForm(f => ({
        ...f,
        essenceVolumeMl: esansMl.toFixed(1),
        alcoholVolumeMl: (remaining * 0.85).toFixed(1),
        waterVolumeMl: (remaining * 0.15).toFixed(1),
      }))
      const sel = essences.find(e => e.id === batchForm.essenceId)
      if (sel) {
        setStockCheck({ ok: sel.currentVolumeMl >= esansMl, available: sel.currentVolumeMl, required: esansMl })
      }
    }
  }, [batchForm.totalVolumeMl, batchForm.essenceRatio, batchForm.essenceId, essences])

  useEffect(() => { recalculate() }, [recalculate])

  async function fetchData() {
    const [pRes, eRes] = await Promise.all([
      fetch(`/api/admin/perfumes/${id}`),
      fetch("/api/admin/essences"),
    ])
    if (pRes.ok) setPerfume(await pRes.json())
    else router.push("/admin/perfumes")
    if (eRes.ok) setEssences(await eRes.json())
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [id])

  async function handleTogglePublic() {
    if (!perfume) return
    const res = await fetch(`/api/admin/perfumes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publicVisible: !perfume.publicVisible }),
    })
    if (res.ok) { toast.success("Görünürlük güncellendi"); fetchData() }
    else toast.error("Güncelleme başarısız")
  }

  async function handleCreateBatch() {
    if (!batchForm.essenceId || !batchForm.batchLabel) {
      toast.error("Esans ve parti adı zorunlu")
      return
    }
    const payload = {
      perfumeId: id,
      essenceId: batchForm.essenceId,
      batchLabel: batchForm.batchLabel,
      productionDate: batchForm.productionDate,
      totalVolumeMl: parseFloat(batchForm.totalVolumeMl),
      essenceRatio: parseFloat(batchForm.essenceRatio) / 100,
      essenceVolumeMl: parseFloat(batchForm.essenceVolumeMl),
      alcoholVolumeMl: parseFloat(batchForm.alcoholVolumeMl),
      waterVolumeMl: parseFloat(batchForm.waterVolumeMl),
      cost: batchForm.cost ? parseFloat(batchForm.cost) : undefined,
      notes: batchForm.notes || undefined,
      publicVisible: batchForm.publicVisible,
    }
    const res = await fetch("/api/admin/batches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (res.ok) {
      const data = await res.json()
      toast.success(`Üretim kaydedildi. Kalan esans: ${data.stockStatus.currentVolumeMl.toFixed(1)} ml`)
      setBatchDialogOpen(false)
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

  function openEditBatch(batch: Batch) {
    setEditingBatch(batch)
    setEditBatchForm({ publicVisible: batch.publicVisible, notes: batch.notes ?? "" })
    setEditBatchDialogOpen(true)
  }

  async function handleEditBatch() {
    if (!editingBatch) return
    const res = await fetch(`/api/admin/batches/${editingBatch.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        publicVisible: editBatchForm.publicVisible,
        notes: editBatchForm.notes || undefined,
      }),
    })
    if (res.ok) { toast.success("Parti güncellendi"); setEditBatchDialogOpen(false); fetchData() }
    else toast.error("Güncelleme başarısız")
  }

  async function handleDeleteBatch(batchId: string) {
    if (!confirm("Bu üretim kaydını silmek istiyor musunuz? Stok iade edilecek.")) return
    const res = await fetch(`/api/admin/batches/${batchId}`, { method: "DELETE" })
    if (res.ok) { toast.success("Üretim silindi, stok iade edildi"); fetchData() }
    else toast.error("Silinemedi")
  }

  if (loading) {
    return (
      <div className="py-24 text-center" style={{ color: "var(--text-muted-warm)" }}>
        <FlaskConical size={28} className="mx-auto mb-3 animate-pulse opacity-30" />
        <p className="text-sm">Yükleniyor...</p>
      </div>
    )
  }

  if (!perfume) return null

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link href="/admin/perfumes" className="inline-flex items-center gap-1.5 text-sm mb-4 hover:opacity-70 transition-opacity" style={{ color: "var(--text-muted-warm)" }}>
          <ArrowLeft size={13} /> Parfümler
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-serif" style={{ color: "var(--charcoal)", fontFamily: "var(--font-gloock)" }}>
                {perfume.name}
              </h1>
              <GenderBadge gender={perfume.genderCategory} />
            </div>
            {perfume.brandName && (
              <p className="text-sm" style={{ color: "var(--text-muted-warm)" }}>{perfume.brandName}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTogglePublic}
              style={{ borderColor: "var(--border)" }}
            >
              {perfume.publicVisible ? <><Globe size={13} className="mr-1.5" /> Public</> : <><EyeOff size={13} className="mr-1.5" /> Gizli</>}
            </Button>
            <Button onClick={() => setBatchDialogOpen(true)} size="sm" style={{ background: "var(--charcoal)", color: "var(--ivory)" }}>
              <Plus size={13} className="mr-1.5" /> Yeni Parti
            </Button>
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Toplam Üretim", value: `${perfume.totalProducedMl} ml` },
          { label: "Parti Sayısı", value: perfume.batches.length },
          { label: "Son Üretim", value: perfume.latestBatchDate ? new Date(perfume.latestBatchDate).toLocaleDateString("tr-TR") : "—" },
          { label: "Görünürlük", value: perfume.publicVisible ? "Public" : "Gizli" },
        ].map((c) => (
          <div key={c.label} className="rounded-xl border p-4" style={{ background: "#fff", borderColor: "var(--border)" }}>
            <p className="text-xs uppercase tracking-wider mb-1" style={{ color: "var(--text-muted-warm)" }}>{c.label}</p>
            <p className="text-xl font-serif" style={{ color: "var(--charcoal)" }}>{c.value}</p>
          </div>
        ))}
      </div>

      {perfume.notes && (
        <div className="rounded-xl border p-4 text-sm" style={{ background: "#fff", borderColor: "var(--border)", color: "var(--charcoal)" }}>
          <p className="text-xs uppercase tracking-wider mb-1" style={{ color: "var(--text-muted-warm)" }}>Notlar</p>
          {perfume.notes}
        </div>
      )}

      {/* Batches Table */}
      <div>
        <h2 className="text-lg font-serif mb-3" style={{ color: "var(--charcoal)", fontFamily: "var(--font-gloock)" }}>
          Üretim Partileri
        </h2>
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)", background: "#fff" }}>
          {perfume.batches.length === 0 ? (
            <div className="py-12 text-center" style={{ color: "var(--text-muted-warm)" }}>
              <FlaskConical size={24} className="mx-auto mb-2 opacity-20" />
              <p className="text-sm">Henüz üretim partisi yok</p>
              <Button onClick={() => setBatchDialogOpen(true)} variant="outline" size="sm" className="mt-3">
                İlk partiyi ekle
              </Button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs uppercase tracking-wider" style={{ borderColor: "var(--border)", color: "var(--text-muted-warm)" }}>
                  <th className="px-4 py-3 text-left font-medium">Parti</th>
                  <th className="px-4 py-3 text-left font-medium">Tarih</th>
                  <th className="px-4 py-3 text-left font-medium">Esans</th>
                  <th className="px-4 py-3 text-right font-medium">Hacim</th>
                  <th className="px-4 py-3 text-right font-medium">Oran</th>
                  <th className="px-4 py-3 text-center font-medium">Public</th>
                  <th className="px-4 py-3 text-right font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {perfume.batches.map((batch, i) => (
                  <tr key={batch.id} className="border-b last:border-0 hover:bg-gray-50/60 transition-colors" style={{ borderColor: "var(--border)" }}>
                    <td className="px-4 py-3 font-medium" style={{ color: "var(--charcoal)" }}>{batch.batchLabel}</td>
                    <td className="px-4 py-3" style={{ color: "var(--text-muted-warm)" }}>
                      {new Date(batch.productionDate).toLocaleDateString("tr-TR")}
                    </td>
                    <td className="px-4 py-3">
                      <div style={{ color: "var(--charcoal)" }}>{batch.essence.name}</div>
                      <StockBadge status={batch.essence.status as never} />
                    </td>
                    <td className="px-4 py-3 text-right" style={{ color: "var(--charcoal)" }}>
                      <div>{batch.totalVolumeMl} ml</div>
                      <div className="text-xs" style={{ color: "var(--text-muted-warm)" }}>
                        E:{batch.essenceVolumeMl}ml A:{batch.alcoholVolumeMl}ml S:{batch.waterVolumeMl}ml
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-medium" style={{ color: "var(--charcoal)" }}>
                      %{(batch.essenceRatio * 100).toFixed(0)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {batch.publicVisible
                        ? <Globe size={13} style={{ color: "#22c55e", margin: "0 auto" }} />
                        : <EyeOff size={13} style={{ color: "var(--text-muted-warm)", margin: "0 auto" }} />
                      }
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditBatch(batch)}>
                          <Pencil size={12} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => handleDeleteBatch(batch.id)}>
                          <Trash2 size={12} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* New Batch Dialog */}
      <Dialog open={batchDialogOpen} onOpenChange={setBatchDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Yeni Üretim Partisi</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Parti Adı *</Label>
                <Input value={batchForm.batchLabel} onChange={e => setBatchForm(f => ({ ...f, batchLabel: e.target.value }))} placeholder="1. Parti" />
              </div>
              <div className="space-y-1.5">
                <Label>Üretim Tarihi</Label>
                <Input type="date" value={batchForm.productionDate} onChange={e => setBatchForm(f => ({ ...f, productionDate: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Kullanılan Esans *</Label>
              <Select value={batchForm.essenceId} onValueChange={v => setBatchForm(f => ({ ...f, essenceId: v ?? "" }))}>
                <SelectTrigger><SelectValue placeholder="Esans seçin" /></SelectTrigger>
                <SelectContent>
                  {essences.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.name} ({e.currentVolumeMl.toFixed(1)} ml)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Toplam Hacim (ml)</Label>
                <Input type="number" value={batchForm.totalVolumeMl} onChange={e => setBatchForm(f => ({ ...f, totalVolumeMl: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Esans Oranı (%)</Label>
                <Input type="number" value={batchForm.essenceRatio} onChange={e => setBatchForm(f => ({ ...f, essenceRatio: e.target.value }))} />
              </div>
            </div>
            {(batchForm.essenceVolumeMl || batchForm.alcoholVolumeMl) && (
              <div className="rounded-lg p-3 text-xs space-y-1" style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.2)", color: "var(--charcoal)" }}>
                <div className="flex items-center gap-1.5 font-medium mb-1"><Calculator size={12} /> Hesaplanan bileşenler</div>
                <div>Esans: {batchForm.essenceVolumeMl} ml · Alkol: {batchForm.alcoholVolumeMl} ml · Su: {batchForm.waterVolumeMl} ml</div>
                {stockCheck && (
                  <div className={stockCheck.ok ? "text-green-600" : "text-red-500"}>
                    {stockCheck.ok
                      ? `✓ Stok yeterli (Mevcut: ${stockCheck.available.toFixed(1)} ml)`
                      : `✗ Yetersiz stok (Mevcut: ${stockCheck.available.toFixed(1)} ml, Gerekli: ${stockCheck.required.toFixed(1)} ml)`
                    }
                  </div>
                )}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Maliyet (₺)</Label>
                <Input type="number" value={batchForm.cost} onChange={e => setBatchForm(f => ({ ...f, cost: e.target.value }))} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label>Public Görünürlük</Label>
                <Select value={batchForm.publicVisible ? "true" : "false"} onValueChange={v => setBatchForm(f => ({ ...f, publicVisible: v === "true" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Public</SelectItem>
                    <SelectItem value="false">Gizli</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notlar</Label>
              <Textarea value={batchForm.notes} onChange={e => setBatchForm(f => ({ ...f, notes: e.target.value }))} rows={3} />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setBatchDialogOpen(false)}>İptal</Button>
              <Button onClick={handleCreateBatch} style={{ background: "var(--charcoal)", color: "var(--ivory)" }}>Kaydet</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Batch Dialog */}
      <Dialog open={editBatchDialogOpen} onOpenChange={setEditBatchDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Partiyi Düzenle — {editingBatch?.batchLabel}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Public Görünürlük</Label>
              <Select
                value={editBatchForm.publicVisible ? "true" : "false"}
                onValueChange={v => setEditBatchForm(f => ({ ...f, publicVisible: v === "true" }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Public</SelectItem>
                  <SelectItem value="false">Gizli</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Notlar</Label>
              <Textarea value={editBatchForm.notes} onChange={e => setEditBatchForm(f => ({ ...f, notes: e.target.value }))} rows={3} />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setEditBatchDialogOpen(false)}>İptal</Button>
              <Button onClick={handleEditBatch} style={{ background: "var(--charcoal)", color: "var(--ivory)" }}>Kaydet</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
