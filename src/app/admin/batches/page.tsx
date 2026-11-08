"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { BatchFormDialog, type BatchLike } from "@/components/admin/BatchFormDialog"
import { useConfirm } from "@/components/admin/ConfirmDialog"
import { toast } from "sonner"
import { Plus, Package, Trash2, Pencil, Copy, Eye, EyeOff, ArrowUpDown, AlertTriangle, CheckSquare, Globe } from "lucide-react"
import { api, fmtDate, fmtMl, fmtPct } from "@/lib/client-api"

interface Batch extends BatchLike {
  perfume: { id: string; name: string; brandName: string | null }
  essence: { id: string; name: string; currentVolumeMl: number; status: string }
}
interface Perfume {
  id: string
  name: string
  brandName: string | null
}
interface Essence {
  id: string
  name: string
  currentVolumeMl: number
}

type SortKey = "date" | "perfume" | "ratio" | "volume"

export default function BatchesPage() {
  const confirm = useConfirm()
  const [batches, setBatches] = useState<Batch[]>([])
  const [perfumes, setPerfumes] = useState<Perfume[]>([])
  const [essences, setEssences] = useState<Essence[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [visibility, setVisibility] = useState<"all" | "public" | "hidden">("all")
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "date", dir: -1 })
  const [dialog, setDialogState] = useState<{ open: boolean; key: number; mode: React.ComponentProps<typeof BatchFormDialog>["mode"] }>({
    open: false,
    key: 0,
    mode: { kind: "create" },
  })
  // Her açılışta yeni key → form sıfırdan başlar
  const setDialog = (d: { open: boolean; mode: React.ComponentProps<typeof BatchFormDialog>["mode"] }) => setDialogState((prev) => ({ ...d, key: prev.key + 1 }))
  const [busyId, setBusyId] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  async function bulkVisibility(body: { ids: string[]; publicVisible: boolean } | { scope: "publicPerfumes"; publicVisible: boolean }) {
    const res = await api<{ updated: number }>("/api/admin/batches/bulk-visibility", { method: "PATCH", json: body })
    if (res.ok) {
      toast.success(`${res.data.updated} parti ${body.publicVisible ? "public yapıldı" : "gizlendi"}`)
      setSelected(new Set())
      fetchData()
    } else toast.error(res.error)
  }

  async function publishAllOfPublicPerfumes() {
    const hidden = batches.filter((b) => !b.publicVisible).length
    const ok = await confirm({
      title: "Public parfümlerin partileri yayınlansın mı?",
      description: `Public katalogda görünen parfümlerin gizli tüm partileri (en fazla ${hidden}) yayınlanır; reçete oranları ve parti notları ziyaretçilere görünür. Maliyet hiçbir zaman gösterilmez.`,
      confirmLabel: "Yayınla",
    })
    if (ok) bulkVisibility({ scope: "publicPerfumes", publicVisible: true })
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function fetchData() {
    const [b, p, e] = await Promise.all([
      api<Batch[]>("/api/admin/batches"),
      api<Perfume[]>("/api/admin/perfumes"),
      api<Essence[]>("/api/admin/essences"),
    ])
    if (b.ok) setBatches(b.data)
    if (p.ok) setPerfumes(p.data)
    if (e.ok) setEssences(e.data)
    setLoadError(!b.ok ? b.error : !p.ok ? p.error : !e.ok ? e.error : null)
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const rows = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("tr-TR")
    const filtered = batches.filter((b) => {
      if (visibility === "public" && !b.publicVisible) return false
      if (visibility === "hidden" && b.publicVisible) return false
      if (!q) return true
      return [b.perfume.name, b.perfume.brandName ?? "", b.essence.name, b.batchLabel].some((s) => s.toLocaleLowerCase("tr-TR").includes(q))
    })
    const val = (b: Batch) =>
      sort.key === "date" ? new Date(b.productionDate).getTime() : sort.key === "perfume" ? b.perfume.name : sort.key === "ratio" ? b.essenceRatio : b.totalVolumeMl
    return filtered.sort((a, b) => {
      const va = val(a)
      const vb = val(b)
      const c = typeof va === "string" ? va.localeCompare(vb as string, "tr") : (va as number) - (vb as number)
      return c * sort.dir
    })
  }, [batches, search, visibility, sort])

  function toggleSort(key: SortKey) {
    setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: key === "perfume" ? 1 : -1 }))
  }

  async function toggleVisibility(b: Batch) {
    setBusyId(b.id)
    const res = await api(`/api/admin/batches/${b.id}`, { method: "PATCH", json: { publicVisible: !b.publicVisible } })
    setBusyId(null)
    if (res.ok) {
      toast.success(b.publicVisible ? "Parti gizlendi" : "Parti public yapıldı")
      setBatches((list) => list.map((x) => (x.id === b.id ? { ...x, publicVisible: !x.publicVisible } : x)))
    } else toast.error(res.error)
  }

  async function handleDelete(b: Batch) {
    const ok = await confirm({
      title: "Üretim kaydı silinsin mi?",
      description: `${b.perfume.name} — ${b.batchLabel}. Kullanılan ${fmtMl(b.essenceVolumeMl)} ${b.essence.name} esansı stoğa iade edilecek.`,
      confirmLabel: "Sil ve stoğu iade et",
      destructive: true,
    })
    if (!ok) return
    setBusyId(b.id)
    const res = await api(`/api/admin/batches/${b.id}`, { method: "DELETE" })
    setBusyId(null)
    if (res.ok) {
      toast.success("Üretim silindi, stok iade edildi")
      fetchData()
    } else toast.error(res.error)
  }

  const sortTh = (k: SortKey, children: React.ReactNode) => (
    <th className="text-left px-4 py-3 text-xs uppercase tracking-wider font-medium" style={{ color: "var(--text-muted-warm)" }} aria-sort={sort.key === k ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
      <button type="button" onClick={() => toggleSort(k)} className="inline-flex items-center gap-1 hover:text-[var(--charcoal)]">
        {children}
        <ArrowUpDown size={11} aria-hidden />
      </button>
    </th>
  )
  const th = (children?: React.ReactNode) => (
    <th className="text-left px-4 py-3 text-xs uppercase tracking-wider font-medium" style={{ color: "var(--text-muted-warm)" }}>
      {children}
    </th>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-3xl font-serif" style={{ color: "var(--charcoal)", fontFamily: "var(--font-gloock)" }}>
            Üretim Partileri
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted-warm)" }}>
            {batches.length} üretim kaydı · {batches.filter((b) => b.publicVisible).length} public
          </p>
        </div>
        <div className="flex gap-2 flex-wrap shrink-0">
          {batches.some((b) => !b.publicVisible) && (
            <Button variant="outline" size="sm" onClick={publishAllOfPublicPerfumes} style={{ borderColor: "rgba(34,197,94,0.4)", color: "#15803d" }}>
              <Globe size={13} className="mr-1.5" /> Public parfümlerin partilerini yayınla
            </Button>
          )}
          <Button onClick={() => setDialog({ open: true, mode: { kind: "create" } })} style={{ background: "var(--charcoal)", color: "var(--ivory)" }}>
            <Plus size={14} className="mr-1.5" /> Yeni Üretim
          </Button>
        </div>
      </div>

      {batches.length > 0 && batches.every((b) => !b.publicVisible) && (
        <div role="status" className="flex items-start gap-2 rounded-lg px-4 py-3 text-sm" style={{ background: "rgba(234,179,8,0.1)", border: "1px solid rgba(234,179,8,0.35)", color: "#854d0e" }}>
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          Hiçbir parti public değil — public katalogda reçete oranları görünmüyor. Yayınlamak istediğin partileri seç veya &quot;Public parfümlerin partilerini yayınla&quot; butonunu kullan.
        </div>
      )}

      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg flex-wrap" style={{ background: "rgba(201,168,92,0.1)", border: "1px solid rgba(201,168,92,0.3)" }}>
          <CheckSquare size={14} style={{ color: "#8B7140" }} />
          <span className="text-sm font-medium" style={{ color: "var(--charcoal)" }}>
            {selected.size} parti seçildi
          </span>
          <div className="flex gap-2 ml-auto">
            <button type="button" onClick={() => bulkVisibility({ ids: [...selected], publicVisible: true })} className="text-xs px-3 py-1.5 rounded border" style={{ borderColor: "rgba(34,197,94,0.4)", color: "#15803d", background: "rgba(34,197,94,0.08)" }}>
              <Eye size={11} className="inline mr-1" /> Public Yap
            </button>
            <button type="button" onClick={() => bulkVisibility({ ids: [...selected], publicVisible: false })} className="text-xs px-3 py-1.5 rounded border" style={{ borderColor: "var(--border)", color: "var(--text-muted-warm)" }}>
              <EyeOff size={11} className="inline mr-1" /> Gizle
            </button>
            <button type="button" onClick={() => setSelected(new Set())} className="text-xs px-2 py-1.5" style={{ color: "var(--text-muted-warm)" }}>
              İptal
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-2 flex-wrap items-center">
        <label htmlFor="batch-search" className="sr-only">
          Partilerde ara
        </label>
        <Input id="batch-search" placeholder="Parfüm, esans veya parti ara..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs bg-white" />
        <div className="flex gap-1" role="group" aria-label="Görünürlük filtresi">
          {(
            [
              ["all", "Tümü"],
              ["public", "Public"],
              ["hidden", "Gizli"],
            ] as const
          ).map(([v, l]) => (
            <button
              key={v}
              type="button"
              aria-pressed={visibility === v}
              onClick={() => setVisibility(v)}
              className="px-3 py-1.5 rounded-lg text-xs border transition-all"
              style={{
                background: visibility === v ? "var(--charcoal)" : "#fff",
                color: visibility === v ? "var(--ivory)" : "var(--text-muted-warm)",
                borderColor: visibility === v ? "var(--charcoal)" : "var(--border)",
              }}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {loadError && (
        <div role="alert" className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm" style={{ background: "rgba(239,68,68,0.06)", color: "#b91c1c", border: "1px solid rgba(239,68,68,0.2)" }}>
          <AlertTriangle size={14} /> {loadError}
          <Button size="sm" variant="outline" className="ml-auto" onClick={fetchData}>
            Tekrar dene
          </Button>
        </div>
      )}

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)", background: "#fff" }}>
        {loading ? (
          <div className="py-16 text-center">
            <Package size={28} className="mx-auto mb-3 animate-pulse opacity-30" />
            <p className="text-sm" style={{ color: "var(--text-muted-warm)" }}>
              Yükleniyor...
            </p>
          </div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center">
            <Package size={28} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm" style={{ color: "var(--text-muted-warm)" }}>
              {batches.length ? "Filtreye uygun parti yok" : "Henüz üretim kaydı yok"}
            </p>
            {!batches.length && (
              <Button onClick={() => setDialog({ open: true, mode: { kind: "create" } })} variant="outline" size="sm" className="mt-3">
                İlk üretimi ekle
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[760px]">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--ivory)" }}>
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      aria-label="Görünen tüm partileri seç"
                      className="accent-[var(--gold)]"
                      checked={rows.length > 0 && rows.every((r) => selected.has(r.id))}
                      onChange={() => setSelected(rows.every((r) => selected.has(r.id)) ? new Set() : new Set(rows.map((r) => r.id)))}
                    />
                  </th>
                  {sortTh("perfume", "Parfüm")}
                  {th("Esans")}
                  {th("Parti")}
                  {sortTh("date", "Tarih")}
                  {sortTh("volume", "Hacim")}
                  {sortTh("ratio", "Oran")}
                  {th("Esans ml")}
                  {th("Görünürlük")}
                  {th(<span className="sr-only">Eylemler</span>)}
                </tr>
              </thead>
              <tbody>
                {rows.map((b, i) => (
                  <tr key={b.id} style={{ borderBottom: i < rows.length - 1 ? "1px solid var(--border)" : "none", opacity: busyId === b.id ? 0.5 : 1, background: selected.has(b.id) ? "rgba(201,168,92,0.04)" : undefined }}>
                    <td className="px-4 py-3">
                      <input type="checkbox" aria-label={`${b.perfume.name} ${b.batchLabel} seç`} className="accent-[var(--gold)]" checked={selected.has(b.id)} onChange={() => toggleSelect(b.id)} />
                    </td>
                    <td className="px-4 py-3 font-medium" style={{ color: "var(--charcoal)" }}>
                      {b.perfume.name}
                      {b.perfume.brandName && (
                        <span className="block text-[11px] font-normal" style={{ color: "var(--text-muted-warm)" }}>
                          {b.perfume.brandName}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--text-muted-warm)" }}>
                      {b.essence.name}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--charcoal)" }}>
                      {b.batchLabel}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: b.productionDateUnknown ? "#854d0e" : "var(--text-muted-warm)" }}>
                      {fmtDate(b.productionDate, b.productionDateUnknown)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--charcoal)" }}>
                      {fmtMl(b.totalVolumeMl)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: "#8B7140" }}>
                      {fmtPct(b.essenceRatio)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--charcoal)" }}>
                      {fmtMl(b.essenceVolumeMl)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => toggleVisibility(b)}
                        disabled={busyId === b.id}
                        className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border"
                        style={b.publicVisible ? { color: "#15803d", borderColor: "rgba(34,197,94,0.35)", background: "rgba(34,197,94,0.08)" } : { color: "var(--text-muted-warm)", borderColor: "var(--border)" }}
                        aria-label={`${b.batchLabel}: ${b.publicVisible ? "public — gizlemek için tıkla" : "gizli — yayınlamak için tıkla"}`}
                      >
                        {b.publicVisible ? <Eye size={11} /> : <EyeOff size={11} />}
                        {b.publicVisible ? "Public" : "Gizli"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => setDialog({ open: true, mode: { kind: "copy", from: b } })} className="p-1.5 rounded hover:bg-blue-50" aria-label={`${b.batchLabel} reçetesini kopyala`} title="Kopyala">
                          <Copy size={13} style={{ color: "#1d4ed8" }} />
                        </button>
                        <button type="button" onClick={() => setDialog({ open: true, mode: { kind: "edit", batch: b } })} className="p-1.5 rounded hover:bg-gray-100" aria-label={`${b.batchLabel} partisini düzenle`} title="Düzenle">
                          <Pencil size={13} style={{ color: "var(--text-muted-warm)" }} />
                        </button>
                        <button type="button" onClick={() => handleDelete(b)} disabled={busyId === b.id} className="p-1.5 rounded hover:bg-red-50" aria-label={`${b.batchLabel} partisini sil`} title="Sil">
                          <Trash2 size={13} style={{ color: "#b91c1c" }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <BatchFormDialog
        key={dialog.key}
        open={dialog.open}
        onOpenChange={(o) => setDialogState((d) => ({ ...d, open: o }))}
        mode={dialog.mode}
        perfumes={perfumes}
        essences={essences}
        onSaved={fetchData}
      />
    </div>
  )
}
