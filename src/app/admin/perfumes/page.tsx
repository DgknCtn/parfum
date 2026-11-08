"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { GenderBadge } from "@/components/admin/StockBadge"
import { useConfirm } from "@/components/admin/ConfirmDialog"
import { api, fmtDate, fmtMl } from "@/lib/client-api"
import { toast } from "sonner"
import { Plus, Search, FlaskConical, Globe, EyeOff, Pencil, Trash2, Download, CheckSquare, ArrowUpDown } from "lucide-react"

interface Perfume {
  id: string
  name: string
  brandName: string | null
  genderCategory: string
  publicVisible: boolean
  slug: string
  description: string | null
  notes: string | null
  topNotes: string | null
  middleNotes: string | null
  baseNotes: string | null
  agingDays: number | null
  latestBatchDate: string | null
  totalProducedMl: number
  _count?: { batches: number }
}

const GENDERS = [
  ["KADIN", "Kadın"],
  ["ERKEK", "Erkek"],
  ["UNISEX", "Unisex"],
  ["BELIRTILMEMIS", "Belirtilmemiş"],
] as const

const emptyForm = {
  name: "",
  brandName: "",
  genderCategory: "BELIRTILMEMIS",
  description: "",
  publicVisible: false,
  notes: "",
  topNotes: "",
  middleNotes: "",
  baseNotes: "",
  agingDays: "",
}

type SortKey = "name" | "brand" | "batches" | "latest"
const hasDate = (d: string | null) => !!d && new Date(d).getUTCFullYear() > 1970

export default function PerfumesPage() {
  return (
    <Suspense fallback={null}>
      <PerfumesInner />
    </Suspense>
  )
}

function PerfumesInner() {
  const confirm = useConfirm()
  const sp = useSearchParams()
  const [perfumes, setPerfumes] = useState<Perfume[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [visibility, setVisibility] = useState<"all" | "public" | "hidden">(sp.get("filter") === "public" ? "public" : sp.get("filter") === "hidden" ? "hidden" : "all")
  const [gender, setGender] = useState<string>("all")
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "name", dir: 1 })
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Perfume | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  function applyPerfumes(res: Awaited<ReturnType<typeof api<Perfume[]>>>) {
    if (res.ok) setPerfumes(res.data)
    else toast.error(res.error)
    setLoading(false)
  }
  const fetchPerfumes = () => api<Perfume[]>("/api/admin/perfumes").then(applyPerfumes)

  useEffect(() => {
    api<Perfume[]>("/api/admin/perfumes").then(applyPerfumes)
     
  }, [])

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setErrors({})
    setDialogOpen(true)
  }

  function openEdit(p: Perfume) {
    setEditing(p)
    setErrors({})
    setForm({
      name: p.name,
      brandName: p.brandName ?? "",
      genderCategory: p.genderCategory,
      description: p.description ?? "",
      publicVisible: p.publicVisible,
      notes: p.notes ?? "",
      topNotes: p.topNotes ?? "",
      middleNotes: p.middleNotes ?? "",
      baseNotes: p.baseNotes ?? "",
      agingDays: p.agingDays != null ? String(p.agingDays) : "",
    })
    setDialogOpen(true)
  }

  async function handleSave() {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = "Parfüm adı gerekli"
    const aging = form.agingDays.trim() === "" ? null : Number(form.agingDays)
    if (aging !== null && (!Number.isInteger(aging) || aging < 0)) e.agingDays = "0 veya pozitif tam sayı girin"
    setErrors(e)
    if (Object.keys(e).length || saving) return

    // Boş bırakılan isteğe bağlı alanlar null gönderilir → mevcut değer temizlenir
    const opt = (v: string) => (v.trim() ? v.trim() : null)
    const payload = {
      name: form.name.trim(),
      brandName: opt(form.brandName),
      genderCategory: form.genderCategory,
      description: opt(form.description),
      publicVisible: form.publicVisible,
      notes: opt(form.notes),
      topNotes: opt(form.topNotes),
      middleNotes: opt(form.middleNotes),
      baseNotes: opt(form.baseNotes),
      agingDays: aging,
    }
    setSaving(true)
    const res = await api(editing ? `/api/admin/perfumes/${editing.id}` : "/api/admin/perfumes", {
      method: editing ? "PATCH" : "POST",
      json: payload,
    })
    setSaving(false)
    if (res.ok) {
      toast.success(editing ? "Parfüm güncellendi" : "Parfüm oluşturuldu")
      setDialogOpen(false)
      fetchPerfumes()
    } else toast.error(res.error)
  }

  async function togglePublic(p: Perfume) {
    const res = await api(`/api/admin/perfumes/${p.id}`, { method: "PATCH", json: { publicVisible: !p.publicVisible } })
    if (res.ok) {
      toast.success(p.publicVisible ? "Gizlendi" : "Public yapıldı")
      setPerfumes((list) => list.map((x) => (x.id === p.id ? { ...x, publicVisible: !x.publicVisible } : x)))
    } else toast.error(res.error)
  }

  async function handleDelete(p: Perfume) {
    const count = p._count?.batches ?? 0
    if (count > 0) {
      toast.error(`Bu parfümün ${count} aktif partisi var. Stokların doğru iade edilmesi için önce partileri silin.`)
      return
    }
    const ok = await confirm({ title: "Parfüm silinsin mi?", description: `${p.name} katalogdan ve listeden kaldırılacak.`, confirmLabel: "Sil", destructive: true })
    if (!ok) return
    const res = await api(`/api/admin/perfumes/${p.id}`, { method: "DELETE" })
    if (res.ok) {
      toast.success("Parfüm silindi")
      fetchPerfumes()
    } else toast.error(res.error)
  }

  async function handleBulkVisibility(visible: boolean) {
    const ids = Array.from(selected)
    const res = await api<{ updated: number }>("/api/admin/perfumes/bulk-visibility", { method: "PATCH", json: { ids, publicVisible: visible } })
    if (res.ok) {
      toast.success(`${res.data.updated} parfüm ${visible ? "public yapıldı" : "gizlendi"}`)
      setSelected(new Set())
      fetchPerfumes()
    } else toast.error(res.error)
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("tr-TR")
    const list = perfumes.filter((p) => {
      if (visibility === "public" && !p.publicVisible) return false
      if (visibility === "hidden" && p.publicVisible) return false
      if (gender !== "all" && p.genderCategory !== gender) return false
      if (!q) return true
      return [p.name, p.brandName ?? "", p.topNotes ?? "", p.middleNotes ?? "", p.baseNotes ?? ""].some((s) => s.toLocaleLowerCase("tr-TR").includes(q))
    })
    const val = (p: Perfume): string | number =>
      sort.key === "name" ? p.name : sort.key === "brand" ? p.brandName ?? "" : sort.key === "batches" ? p._count?.batches ?? 0 : hasDate(p.latestBatchDate) ? new Date(p.latestBatchDate!).getTime() : 0
    return list.sort((a, b) => {
      const va = val(a)
      const vb = val(b)
      return (typeof va === "string" ? va.localeCompare(vb as string, "tr") : va - (vb as number)) * sort.dir
    })
  }, [perfumes, search, visibility, gender, sort])

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    setSelected(selected.size === filtered.length ? new Set() : new Set(filtered.map((p) => p.id)))
  }

  function exportCsv() {
    const rows = [
      ["Ad", "Marka", "Cinsiyet", "Partiler", "Son Üretim", "Toplam ml", "Public", "Üst Nota", "Orta Nota", "Alt Nota", "Dinlenme (gün)"],
      ...filtered.map((p) => [
        p.name,
        p.brandName ?? "",
        p.genderCategory,
        String(p._count?.batches ?? 0),
        hasDate(p.latestBatchDate) ? fmtDate(p.latestBatchDate!) : "",
        String(p.totalProducedMl),
        p.publicVisible ? "Evet" : "Hayır",
        p.topNotes ?? "",
        p.middleNotes ?? "",
        p.baseNotes ?? "",
        p.agingDays != null ? String(p.agingDays) : "",
      ]),
    ]
    // CSV enjeksiyonuna karşı = + - @ ile başlayan hücreler kaçışlanır
    const cell = (c: string) => `"${(/^[=+\-@]/.test(c) ? `'${c}` : c).replace(/"/g, '""')}"`
    const csv = rows.map((r) => r.map(cell).join(",")).join("\n")
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "parfumler.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  function toggleSort(key: SortKey) {
    setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: key === "name" || key === "brand" ? 1 : -1 }))
  }

  const sortTh = (k: SortKey, children: React.ReactNode) => (
    <th className="text-left px-4 py-3 text-xs uppercase tracking-wider font-medium" style={{ color: "var(--text-muted-warm)" }} aria-sort={sort.key === k ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
      <button type="button" onClick={() => toggleSort(k)} className="inline-flex items-center gap-1 hover:text-[var(--charcoal)]">
        {children} <ArrowUpDown size={11} aria-hidden />
      </button>
    </th>
  )
  const lbl = "text-xs uppercase tracking-wide"
  const muted = { color: "var(--text-muted-warm)" }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-3xl font-serif" style={{ color: "var(--charcoal)", fontFamily: "var(--font-gloock)" }}>
            Parfümler
          </h1>
          <p className="text-sm mt-1" style={muted}>
            {perfumes.length} parfüm · {perfumes.filter((p) => p.publicVisible).length} public
          </p>
        </div>
        <div className="flex gap-2 shrink-0 flex-wrap">
          <Button onClick={exportCsv} variant="outline" size="sm" style={{ borderColor: "var(--border)" }}>
            <Download size={13} className="mr-1.5" /> CSV
          </Button>
          <Button onClick={openCreate} style={{ background: "var(--charcoal)", color: "var(--ivory)" }}>
            <Plus size={14} className="mr-1.5" /> Yeni Parfüm
          </Button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={muted} aria-hidden />
          <label htmlFor="perfume-search" className="sr-only">
            Parfüm ara
          </label>
          <Input id="perfume-search" placeholder="Ad, marka veya nota ara..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" style={{ background: "#fff", borderColor: "var(--border)" }} />
        </div>
        <div className="flex gap-1" role="group" aria-label="Görünürlük">
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
              className="px-3 py-1.5 rounded-lg text-xs border"
              style={{ background: visibility === v ? "var(--charcoal)" : "#fff", color: visibility === v ? "var(--ivory)" : "var(--text-muted-warm)", borderColor: visibility === v ? "var(--charcoal)" : "var(--border)" }}
            >
              {l}
            </button>
          ))}
        </div>
        <div className="flex gap-1 flex-wrap" role="group" aria-label="Cinsiyet">
          {[["all", "Tüm cinsiyetler"] as const, ...GENDERS].map(([v, l]) => (
            <button
              key={v}
              type="button"
              aria-pressed={gender === v}
              onClick={() => setGender(v)}
              className="px-3 py-1.5 rounded-lg text-xs border"
              style={{ background: gender === v ? "var(--charcoal)" : "#fff", color: gender === v ? "var(--ivory)" : "var(--text-muted-warm)", borderColor: gender === v ? "var(--charcoal)" : "var(--border)" }}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg flex-wrap" style={{ background: "rgba(201,168,92,0.1)", border: "1px solid rgba(201,168,92,0.3)" }}>
          <CheckSquare size={14} style={{ color: "#8B7140" }} />
          <span className="text-sm font-medium" style={{ color: "var(--charcoal)" }}>
            {selected.size} parfüm seçildi
          </span>
          <div className="flex gap-2 ml-auto">
            <button type="button" onClick={() => handleBulkVisibility(true)} className="text-xs px-3 py-1.5 rounded border" style={{ borderColor: "rgba(34,197,94,0.4)", color: "#15803d", background: "rgba(34,197,94,0.08)" }}>
              <Globe size={11} className="inline mr-1" /> Public Yap
            </button>
            <button type="button" onClick={() => handleBulkVisibility(false)} className="text-xs px-3 py-1.5 rounded border" style={{ borderColor: "var(--border)", color: "var(--text-muted-warm)" }}>
              <EyeOff size={11} className="inline mr-1" /> Gizle
            </button>
            <button type="button" onClick={() => setSelected(new Set())} className="text-xs px-2 py-1.5" style={muted}>
              İptal
            </button>
          </div>
        </div>
      )}

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)", background: "#fff" }}>
        {loading ? (
          <div className="py-16 text-center" style={muted}>
            <FlaskConical size={28} className="mx-auto mb-3 animate-pulse opacity-30" />
            <p className="text-sm">Yükleniyor...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center" style={muted}>
            <FlaskConical size={28} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">{perfumes.length ? "Filtreye uygun parfüm bulunamadı" : "Henüz parfüm eklenmemiş"}</p>
            {!perfumes.length && (
              <Button onClick={openCreate} variant="outline" size="sm" className="mt-3">
                İlk parfümü ekle
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[760px]">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--ivory)" }}>
                  <th className="px-4 py-3 w-10">
                    <input type="checkbox" aria-label="Tümünü seç" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleSelectAll} className="accent-[var(--gold)]" />
                  </th>
                  {sortTh("name", "Parfüm Adı")}
                  {sortTh("brand", "Marka")}
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider font-medium" style={muted}>
                    Cinsiyet
                  </th>
                  {sortTh("batches", "Partiler")}
                  {sortTh("latest", "Son Üretim")}
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider font-medium" style={muted}>
                    Görünürlük
                  </th>
                  <th className="px-4 py-3">
                    <span className="sr-only">Eylemler</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <tr key={p.id} style={{ borderBottom: i < filtered.length - 1 ? "1px solid var(--border)" : "none", background: selected.has(p.id) ? "rgba(201,168,92,0.04)" : undefined }}>
                    <td className="px-4 py-3">
                      <input type="checkbox" aria-label={`${p.name} seç`} checked={selected.has(p.id)} onChange={() => toggleSelect(p.id)} className="accent-[var(--gold)]" />
                    </td>
                    <td className="px-4 py-3 font-medium" style={{ color: "var(--charcoal)" }}>
                      <Link href={`/admin/perfumes/${p.id}`} className="hover:underline" style={{ color: "var(--charcoal)" }}>
                        {p.name}
                      </Link>
                      {(p.topNotes || p.middleNotes || p.baseNotes) && (
                        <div className="text-xs mt-0.5 truncate max-w-[200px]" style={muted}>
                          {[p.topNotes, p.middleNotes, p.baseNotes].filter(Boolean).join(" · ")}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs" style={muted}>
                      {p.brandName ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <GenderBadge gender={p.genderCategory} />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-center" style={muted}>
                      {p._count?.batches ?? 0}
                    </td>
                    <td className="px-4 py-3 text-xs" style={muted}>
                      {hasDate(p.latestBatchDate) ? fmtDate(p.latestBatchDate!) : "—"}
                      {p.agingDays != null &&
                        hasDate(p.latestBatchDate) &&
                        (() => {
                          const readyDate = new Date(p.latestBatchDate!)
                          readyDate.setDate(readyDate.getDate() + p.agingDays)
                          const now = new Date()
                          const isReady = readyDate <= now
                          return (
                            <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: isReady ? "rgba(34,197,94,0.1)" : "rgba(251,191,36,0.12)", color: isReady ? "#15803d" : "#854d0e" }}>
                              {isReady ? "Hazır" : `${Math.ceil((readyDate.getTime() - now.getTime()) / 86400000)} gün`}
                            </span>
                          )
                        })()}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => togglePublic(p)}
                        className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded border"
                        aria-label={`${p.name}: ${p.publicVisible ? "public — gizlemek için tıkla" : "gizli — yayınlamak için tıkla"}`}
                        style={{ background: p.publicVisible ? "rgba(34,197,94,0.08)" : "transparent", borderColor: p.publicVisible ? "rgba(34,197,94,0.35)" : "var(--border)", color: p.publicVisible ? "#15803d" : "var(--text-muted-warm)" }}
                      >
                        {p.publicVisible ? (
                          <>
                            <Globe size={11} /> Public
                          </>
                        ) : (
                          <>
                            <EyeOff size={11} /> Gizli
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => openEdit(p)} className="p-1.5 rounded hover:bg-gray-100" aria-label={`${p.name} düzenle`} title="Düzenle">
                          <Pencil size={13} style={muted} />
                        </button>
                        <button type="button" onClick={() => handleDelete(p)} className="p-1.5 rounded hover:bg-red-50" aria-label={`${p.name} sil`} title="Sil">
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
      <p className="text-xs" style={muted}>
        Toplam üretim: {fmtMl(perfumes.reduce((s, p) => s + p.totalProducedMl, 0))}
      </p>

      <Dialog open={dialogOpen} onOpenChange={(o) => !saving && setDialogOpen(o)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md" style={{ background: "var(--ivory)", borderColor: "var(--border)" }}>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "var(--font-gloock)", color: "var(--charcoal)" }}>{editing ? "Parfüm Düzenle" : "Yeni Parfüm"}</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4 mt-2"
            noValidate
            onSubmit={(e) => {
              e.preventDefault()
              handleSave()
            }}
          >
            <div>
              <Label htmlFor="pf-name" className={lbl} style={muted}>
                Parfüm Adı *
              </Label>
              <Input id="pf-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="mt-1" placeholder="Sauvage" maxLength={200} aria-invalid={!!errors.name} aria-describedby={errors.name ? "pf-name-err" : undefined} />
              {errors.name && (
                <p id="pf-name-err" className="text-[11px] mt-1" style={{ color: "#b91c1c" }}>
                  {errors.name}
                </p>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="pf-brand" className={lbl} style={muted}>
                  Marka / ilham
                </Label>
                <Input id="pf-brand" value={form.brandName} onChange={(e) => setForm((f) => ({ ...f, brandName: e.target.value }))} className="mt-1" placeholder="Christian Dior" maxLength={200} />
              </div>
              <div>
                <Label htmlFor="pf-aging" className={lbl} style={muted}>
                  Dinlenme (gün)
                </Label>
                <Input id="pf-aging" inputMode="numeric" value={form.agingDays} onChange={(e) => setForm((f) => ({ ...f, agingDays: e.target.value }))} className="mt-1" placeholder="örn. 30" aria-invalid={!!errors.agingDays} />
                {errors.agingDays && (
                  <p className="text-[11px] mt-1" style={{ color: "#b91c1c" }}>
                    {errors.agingDays}
                  </p>
                )}
              </div>
            </div>
            <div>
              <Label htmlFor="pf-gender" className={lbl} style={muted}>
                Cinsiyet
              </Label>
              <Select value={form.genderCategory} onValueChange={(v) => setForm((f) => ({ ...f, genderCategory: (v as string) ?? "BELIRTILMEMIS" }))}>
                <SelectTrigger id="pf-gender" className="mt-1 w-full">
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

            <fieldset className="rounded-lg p-3 space-y-3" style={{ background: "rgba(201,168,92,0.06)", border: "1px solid rgba(201,168,92,0.25)" }}>
              <legend className="text-[10px] uppercase tracking-widest font-medium px-1" style={{ color: "#8B7140" }}>
                Koku Notaları
              </legend>
              {(
                [
                  ["topNotes", "Üst Nota", "Bergamot, Limon"],
                  ["middleNotes", "Orta Nota", "Gül, Yasemin"],
                  ["baseNotes", "Alt Nota", "Sandal Ağacı, Misk, Amber"],
                ] as const
              ).map(([k, l, ph]) => (
                <div key={k}>
                  <Label htmlFor={`pf-${k}`} className={lbl} style={muted}>
                    {l}
                  </Label>
                  <Input id={`pf-${k}`} value={form[k]} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} className="mt-1" placeholder={ph} maxLength={500} />
                </div>
              ))}
            </fieldset>

            <div>
              <Label htmlFor="pf-desc" className={lbl} style={muted}>
                Açıklama <span className="normal-case">(public katalogda görünür)</span>
              </Label>
              <Textarea id="pf-desc" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="mt-1" rows={2} maxLength={2000} />
            </div>
            <div>
              <Label htmlFor="pf-notes" className={lbl} style={muted}>
                İç notlar <span className="normal-case">(yalnızca admin görür)</span>
              </Label>
              <Textarea id="pf-notes" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className="mt-1" rows={2} maxLength={4000} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="pf-public" checked={form.publicVisible} onChange={(e) => setForm((f) => ({ ...f, publicVisible: e.target.checked }))} className="accent-[var(--gold)]" />
              <Label htmlFor="pf-public" className="text-xs cursor-pointer" style={muted}>
                Public katalogda görünsün
              </Label>
            </div>
            <Button type="submit" disabled={saving} className="w-full" style={{ background: "var(--charcoal)", color: "var(--ivory)" }}>
              {saving ? "Kaydediliyor..." : editing ? "Güncelle" : "Oluştur"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
