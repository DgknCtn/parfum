"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { GenderBadge } from "@/components/admin/StockBadge"
import { toast } from "sonner"
import { Plus, Search, FlaskConical, Globe, EyeOff, Pencil, Trash2 } from "lucide-react"

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
  _count?: { batches: number }
}

export default function PerfumesPage() {
  const [perfumes, setPerfumes] = useState<Perfume[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Perfume | null>(null)
  const [form, setForm] = useState({
    name: "",
    brandName: "",
    genderCategory: "BELIRTILMEMIS",
    description: "",
    publicVisible: false,
    notes: "",
  })

  async function fetchPerfumes() {
    const res = await fetch("/api/admin/perfumes")
    if (res.ok) setPerfumes(await res.json())
    setLoading(false)
  }

  useEffect(() => { fetchPerfumes() }, [])

  function openCreate() {
    setEditing(null)
    setForm({ name: "", brandName: "", genderCategory: "BELIRTILMEMIS", description: "", publicVisible: false, notes: "" })
    setDialogOpen(true)
  }

  function openEdit(p: Perfume) {
    setEditing(p)
    setForm({
      name: p.name,
      brandName: p.brandName ?? "",
      genderCategory: p.genderCategory,
      description: p.description ?? "",
      publicVisible: p.publicVisible,
      notes: p.notes ?? "",
    })
    setDialogOpen(true)
  }

  async function handleSave() {
    const payload = {
      name: form.name,
      brandName: form.brandName || undefined,
      genderCategory: form.genderCategory,
      description: form.description || undefined,
      publicVisible: form.publicVisible,
      notes: form.notes || undefined,
    }
    const url = editing ? `/api/admin/perfumes/${editing.id}` : "/api/admin/perfumes"
    const method = editing ? "PATCH" : "POST"
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
    if (res.ok) {
      toast.success(editing ? "Parfüm güncellendi" : "Parfüm oluşturuldu")
      setDialogOpen(false)
      fetchPerfumes()
    } else {
      toast.error("Bir hata oluştu")
    }
  }

  async function togglePublic(p: Perfume) {
    const res = await fetch(`/api/admin/perfumes/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publicVisible: !p.publicVisible }),
    })
    if (res.ok) {
      toast.success(p.publicVisible ? "Gizlendi" : "Public yapıldı")
      fetchPerfumes()
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Bu parfümü silmek istediğinize emin misiniz?")) return
    const res = await fetch(`/api/admin/perfumes/${id}`, { method: "DELETE" })
    if (res.ok) { toast.success("Parfüm silindi"); fetchPerfumes() }
    else toast.error("Silinemedi")
  }

  const filtered = perfumes.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.brandName ?? "").toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-3xl font-serif" style={{ color: "var(--charcoal)", fontFamily: "var(--font-gloock)" }}>
            Parfümler
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted-warm)" }}>
            {perfumes.length} parfüm · {perfumes.filter(p => p.publicVisible).length} public
          </p>
        </div>
        <Button onClick={openCreate} className="shrink-0" style={{ background: "var(--charcoal)", color: "var(--ivory)" }}>
          <Plus size={14} className="mr-1.5" /> Yeni Parfüm
        </Button>
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted-warm)" }} />
        <Input placeholder="Parfüm veya marka ara..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" style={{ background: "#fff", borderColor: "var(--border)" }} />
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)", background: "#fff" }}>
        {loading ? (
          <div className="py-16 text-center" style={{ color: "var(--text-muted-warm)" }}>
            <FlaskConical size={28} className="mx-auto mb-3 animate-pulse opacity-30" />
            <p className="text-sm">Yükleniyor...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center" style={{ color: "var(--text-muted-warm)" }}>
            <FlaskConical size={28} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">{search ? "Eşleşen parfüm bulunamadı" : "Henüz parfüm eklenmemiş"}</p>
            {!search && <Button onClick={openCreate} variant="outline" size="sm" className="mt-3">İlk parfümü ekle</Button>}
          </div>
        ) : (
          <div className="overflow-x-auto"><table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--ivory)" }}>
                {["Parfüm Adı", "Marka", "Cinsiyet", "Partiler", "Son Üretim", "Görünürlük", "Eylemler"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs uppercase tracking-wider font-medium" style={{ color: "var(--text-muted-warm)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => (
                <tr key={p.id} style={{ borderBottom: i < filtered.length - 1 ? "1px solid var(--border)" : "none" }}>
                  <td className="px-4 py-3 font-medium" style={{ color: "var(--charcoal)" }}>
                    <Link href={`/admin/perfumes/${p.id}`} className="hover:underline" style={{ color: "var(--charcoal)" }}>
                      {p.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: "var(--text-muted-warm)" }}>{p.brandName ?? "—"}</td>
                  <td className="px-4 py-3"><GenderBadge gender={p.genderCategory} /></td>
                  <td className="px-4 py-3 font-mono text-xs text-center" style={{ color: "var(--text-muted-warm)" }}>{p._count?.batches ?? 0}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: "var(--text-muted-warm)" }}>
                    {p.latestBatchDate ? new Date(p.latestBatchDate).toLocaleDateString("tr-TR") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => togglePublic(p)} className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded border transition-colors"
                      style={{
                        background: p.publicVisible ? "rgba(34,197,94,0.08)" : "transparent",
                        borderColor: p.publicVisible ? "rgba(34,197,94,0.3)" : "var(--border)",
                        color: p.publicVisible ? "#16a34a" : "var(--text-muted-warm)",
                      }}>
                      {p.publicVisible ? <><Globe size={11} /> Public</> : <><EyeOff size={11} /> Gizli</>}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(p)} className="p-1.5 rounded hover:bg-gray-100 transition-colors">
                        <Pencil size={13} style={{ color: "var(--text-muted-warm)" }} />
                      </button>
                      <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded hover:bg-red-50 transition-colors">
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent style={{ background: "var(--ivory)", borderColor: "var(--border)" }}>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "var(--font-gloock)", color: "var(--charcoal)" }}>
              {editing ? "Parfüm Düzenle" : "Yeni Parfüm"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-xs uppercase tracking-wide" style={{ color: "var(--text-muted-warm)" }}>Parfüm Adı</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="mt-1" placeholder="Christian Dior - Sauvage" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wide" style={{ color: "var(--text-muted-warm)" }}>Marka</Label>
              <Input value={form.brandName} onChange={e => setForm(f => ({ ...f, brandName: e.target.value }))} className="mt-1" placeholder="İsteğe bağlı" />
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
            <div>
              <Label className="text-xs uppercase tracking-wide" style={{ color: "var(--text-muted-warm)" }}>Açıklama</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="mt-1" rows={2} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="publicVisible" checked={form.publicVisible} onChange={e => setForm(f => ({ ...f, publicVisible: e.target.checked }))} className="accent-[var(--gold)]" />
              <Label htmlFor="publicVisible" className="text-xs cursor-pointer" style={{ color: "var(--text-muted-warm)" }}>
                Public katalogda görünsün
              </Label>
            </div>
            <Button onClick={handleSave} className="w-full" style={{ background: "var(--charcoal)", color: "var(--ivory)" }}>
              {editing ? "Güncelle" : "Oluştur"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
