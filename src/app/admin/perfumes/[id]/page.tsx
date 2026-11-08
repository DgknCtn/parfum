"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { StockBadge, GenderBadge } from "@/components/admin/StockBadge"
import { BatchFormDialog, type BatchLike } from "@/components/admin/BatchFormDialog"
import { useConfirm } from "@/components/admin/ConfirmDialog"
import { api, fmtDate, fmtMl, fmtPct } from "@/lib/client-api"
import { toast } from "sonner"
import { ArrowLeft, FlaskConical, Globe, EyeOff, Plus, Pencil, Trash2, Copy, Upload, ImageIcon, ExternalLink } from "lucide-react"

interface Batch extends BatchLike {
  cost: number | null
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
  coverImageUrl: string | null
  topNotes: string | null
  middleNotes: string | null
  baseNotes: string | null
  agingDays: number | null
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

  const confirm = useConfirm()
  const [dialog, setDialogState] = useState<{ open: boolean; key: number; mode: React.ComponentProps<typeof BatchFormDialog>["mode"] }>({
    open: false,
    key: 0,
    mode: { kind: "create" },
  })
  // Her açılışta yeni key → form sıfırdan başlar
  const setDialog = (d: { open: boolean; mode: React.ComponentProps<typeof BatchFormDialog>["mode"] }) => setDialogState((prev) => ({ ...d, key: prev.key + 1 }))
  const [uploading, setUploading] = useState(false)

  const load = () => Promise.all([api<Perfume>(`/api/admin/perfumes/${id}`), api<Essence[]>("/api/admin/essences")])
  const fetchData = () => load().then(apply)
  function apply([p, e]: Awaited<ReturnType<typeof load>>) {
    if (p.ok) setPerfume(p.data)
    else {
      toast.error(p.error)
      router.push("/admin/perfumes")
    }
    if (e.ok) setEssences(e.data)
    setLoading(false)
  }

  useEffect(() => {
    load().then(apply)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function handleTogglePublic() {
    if (!perfume) return
    const res = await api(`/api/admin/perfumes/${id}`, { method: "PATCH", json: { publicVisible: !perfume.publicVisible } })
    if (res.ok) {
      toast.success(perfume.publicVisible ? "Parfüm public katalogdan gizlendi" : "Parfüm public katalogda yayında")
      fetchData()
    } else toast.error(res.error)
  }

  async function handleDeleteBatch(batch: Batch) {
    const ok = await confirm({
      title: "Üretim kaydı silinsin mi?",
      description: `${batch.batchLabel}: kullanılan ${fmtMl(batch.essenceVolumeMl)} ${batch.essence.name} esansı stoğa iade edilecek.`,
      confirmLabel: "Sil ve stoğu iade et",
      destructive: true,
    })
    if (!ok) return
    const res = await api(`/api/admin/batches/${batch.id}`, { method: "DELETE" })
    if (res.ok) {
      toast.success("Üretim silindi, stok iade edildi")
      fetchData()
    } else toast.error(res.error)
  }

  async function toggleBatchVisibility(batch: Batch) {
    const res = await api(`/api/admin/batches/${batch.id}`, { method: "PATCH", json: { publicVisible: !batch.publicVisible } })
    if (res.ok) fetchData()
    else toast.error(res.error)
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ""
    if (file.size > 5 * 1024 * 1024) return toast.error("Dosya en fazla 5 MB olabilir")
    const fd = new FormData()
    fd.append("file", file)
    setUploading(true)
    const res = await api(`/api/admin/perfumes/${id}/upload-image`, { method: "POST", body: fd })
    setUploading(false)
    if (res.ok) {
      toast.success("Görsel yüklendi")
      fetchData()
    } else toast.error(res.error)
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
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <h1 className="text-3xl font-serif" style={{ color: "var(--charcoal)", fontFamily: "var(--font-gloock)" }}>
                {perfume.name}
              </h1>
              <GenderBadge gender={perfume.genderCategory} />
            </div>
            {perfume.brandName && (
              <p className="text-sm" style={{ color: "var(--text-muted-warm)" }}>{perfume.brandName}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTogglePublic}
              style={{ borderColor: "var(--border)" }}
            >
              {perfume.publicVisible ? <><Globe size={13} className="mr-1.5" /> Public</> : <><EyeOff size={13} className="mr-1.5" /> Gizli</>}
            </Button>
            {perfume.publicVisible && (
              <a href={`/p/${perfume.slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs px-2 py-1.5 rounded-md border" style={{ borderColor: "var(--border)", color: "var(--text-muted-warm)" }}>
                <ExternalLink size={12} /> Public sayfa
              </a>
            )}
            <Button onClick={() => setDialog({ open: true, mode: { kind: "create" } })} size="sm" style={{ background: "var(--charcoal)", color: "var(--ivory)" }}>
              <Plus size={13} className="mr-1.5" /> Yeni Parti
            </Button>
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Toplam Üretim", value: fmtMl(perfume.totalProducedMl) },
          { label: "Parti Sayısı", value: perfume.batches.length },
          { label: "Son Üretim", value: perfume.latestBatchDate && new Date(perfume.latestBatchDate).getUTCFullYear() > 1970 ? fmtDate(perfume.latestBatchDate) : "—" },
          { label: "Görünürlük", value: perfume.publicVisible ? "Public" : "Gizli" },
        ].map((c) => (
          <div key={c.label} className="rounded-xl border p-4" style={{ background: "#fff", borderColor: "var(--border)" }}>
            <p className="text-xs uppercase tracking-wider mb-1" style={{ color: "var(--text-muted-warm)" }}>{c.label}</p>
            <p className="text-xl font-serif" style={{ color: "var(--charcoal)" }}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Cover Image + Details */}
      <div className="flex gap-4 flex-wrap">
        {/* Image upload */}
        <div className="rounded-xl border overflow-hidden shrink-0" style={{ background: "#fff", borderColor: "var(--border)", width: 140, height: 140 }}>
          {perfume.coverImageUrl ? (
            <div className="relative w-full h-full group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={perfume.coverImageUrl} alt={perfume.name} className="w-full h-full object-cover" />
              <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 focus-within:opacity-100 cursor-pointer transition-opacity">
                <Upload size={20} className="text-white" aria-hidden />
                <span className="sr-only">Kapak görselini değiştir</span>
                <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={handleImageUpload} disabled={uploading} />
              </label>
            </div>
          ) : (
            <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer gap-2 hover:bg-gray-50 transition-colors">
              <ImageIcon size={24} style={{ color: "var(--text-muted-warm)", opacity: 0.5 }} aria-hidden />
              <span className="text-[10px] text-center px-2" style={{ color: "var(--text-muted-warm)" }}>{uploading ? "Yükleniyor..." : "Görsel Yükle (JPG/PNG/WEBP, ≤5 MB)"}</span>
              <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={handleImageUpload} disabled={uploading} />
            </label>
          )}
        </div>

        {/* Notes + scent notes */}
        <div className="flex-1 min-w-0 space-y-3">
          {perfume.notes && (
            <div className="rounded-xl border p-4 text-sm" style={{ background: "#fff", borderColor: "var(--border)", color: "var(--charcoal)" }}>
              <p className="text-xs uppercase tracking-wider mb-1" style={{ color: "var(--text-muted-warm)" }}>İç Notlar <span className="normal-case">(public&apos;te görünmez)</span></p>
              <p className="whitespace-pre-line">{perfume.notes}</p>
            </div>
          )}
          {(perfume.topNotes || perfume.middleNotes || perfume.baseNotes) && (
            <div className="rounded-xl border p-4" style={{ background: "#fff", borderColor: "var(--border)" }}>
              <p className="text-xs uppercase tracking-wider mb-2" style={{ color: "var(--text-muted-warm)" }}>Koku Notaları</p>
              <div className="space-y-1 text-xs" style={{ color: "var(--charcoal)" }}>
                {perfume.topNotes && <p><span style={{ color: "var(--text-muted-warm)" }}>Üst: </span>{perfume.topNotes}</p>}
                {perfume.middleNotes && <p><span style={{ color: "var(--text-muted-warm)" }}>Orta: </span>{perfume.middleNotes}</p>}
                {perfume.baseNotes && <p><span style={{ color: "var(--text-muted-warm)" }}>Alt: </span>{perfume.baseNotes}</p>}
              </div>
            </div>
          )}
          {perfume.agingDays != null && (
            <div className="rounded-xl border p-4 text-sm" style={{ background: "#fff", borderColor: "var(--border)" }}>
              <p className="text-xs uppercase tracking-wider mb-1" style={{ color: "var(--text-muted-warm)" }}>Dinlendirme</p>
              <p style={{ color: "var(--charcoal)" }}>{perfume.agingDays} gün</p>
            </div>
          )}
        </div>
      </div>

      {/* Batches Table */}
      <div>
        <h2 className="text-lg font-serif mb-3" style={{ color: "var(--charcoal)", fontFamily: "var(--font-gloock)" }}>
          Üretim Partileri
        </h2>
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)", background: "#fff" }}><div className="overflow-x-auto">
          {perfume.batches.length === 0 ? (
            <div className="py-12 text-center" style={{ color: "var(--text-muted-warm)" }}>
              <FlaskConical size={24} className="mx-auto mb-2 opacity-20" />
              <p className="text-sm">Henüz üretim partisi yok</p>
              <Button onClick={() => setDialog({ open: true, mode: { kind: "create" } })} variant="outline" size="sm" className="mt-3">
                İlk partiyi ekle
              </Button>
            </div>
          ) : (
            <table className="w-full text-sm min-w-[640px]">
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
                {perfume.batches.map((batch) => (
                  <tr key={batch.id} className="border-b last:border-0 hover:bg-gray-50/60 transition-colors" style={{ borderColor: "var(--border)" }}>
                    <td className="px-4 py-3 font-medium" style={{ color: "var(--charcoal)" }}>{batch.batchLabel}</td>
                    <td className="px-4 py-3" style={{ color: batch.productionDateUnknown ? "#854d0e" : "var(--text-muted-warm)" }}>
                      {fmtDate(batch.productionDate, batch.productionDateUnknown)}
                    </td>
                    <td className="px-4 py-3">
                      <div style={{ color: "var(--charcoal)" }}>{batch.essence.name}</div>
                      <StockBadge status={batch.essence.status as never} />
                    </td>
                    <td className="px-4 py-3 text-right" style={{ color: "var(--charcoal)" }}>
                      <div>{fmtMl(batch.totalVolumeMl)}</div>
                      <div className="text-xs" style={{ color: "var(--text-muted-warm)" }}>
                        E {fmtMl(batch.essenceVolumeMl)} · A {fmtMl(batch.alcoholVolumeMl)} · S {fmtMl(batch.waterVolumeMl)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-medium" style={{ color: "var(--charcoal)" }}>
                      {fmtPct(batch.essenceRatio)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => toggleBatchVisibility(batch)}
                        className="p-1 rounded hover:bg-gray-100"
                        aria-label={`${batch.batchLabel}: ${batch.publicVisible ? "public — gizle" : "gizli — yayınla"}`}
                        title={batch.publicVisible ? "Public (gizlemek için tıkla)" : "Gizli (yayınlamak için tıkla)"}
                      >
                        {batch.publicVisible ? <Globe size={13} style={{ color: "#15803d" }} /> : <EyeOff size={13} style={{ color: "var(--text-muted-warm)" }} />}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDialog({ open: true, mode: { kind: "copy", from: batch } })} title="Kopyala" aria-label={`${batch.batchLabel} reçetesini kopyala`}>
                          <Copy size={12} style={{ color: "#1d4ed8" }} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDialog({ open: true, mode: { kind: "edit", batch } })} title="Düzenle" aria-label={`${batch.batchLabel} partisini düzenle`}>
                          <Pencil size={12} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600 hover:text-red-700" onClick={() => handleDeleteBatch(batch)} title="Sil" aria-label={`${batch.batchLabel} partisini sil`}>
                          <Trash2 size={12} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div></div>
      </div>

      <BatchFormDialog
        key={dialog.key}
        open={dialog.open}
        onOpenChange={(o) => setDialogState((d) => ({ ...d, open: o }))}
        mode={dialog.mode}
        perfumes={[{ id: perfume.id, name: perfume.name, brandName: perfume.brandName }]}
        essences={essences}
        fixedPerfumeId={perfume.id}
        onSaved={fetchData}
      />
    </div>
  )
}
