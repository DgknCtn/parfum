"use client"

import { useState, useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { History, ArrowUpCircle, ArrowDownCircle, SlidersHorizontal, RefreshCw, Trash2 } from "lucide-react"

interface Essence { id: string; name: string }
interface Movement {
  id: string
  movementType: string
  quantityMl: number
  reason: string | null
  createdAt: string
  createdBy: string | null
  essence: { id: string; name: string }
  batch: { id: string; batchLabel: string; perfume: { name: string } } | null
}

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  initial_import:    { label: "İlk Giriş",     color: "#60a5fa" },
  production_usage:  { label: "Üretimde Kullanıldı", color: "#f87171" },
  manual_adjustment: { label: "Manuel Düzeltme",  color: "#facc15" },
  correction:        { label: "Düzeltme",       color: "#a78bfa" },
  deletion_reversal: { label: "Silme İadesi",   color: "#34d399" },
}

export default function StockMovementsPage() {
  const [movements, setMovements] = useState<Movement[]>([])
  const [essences, setEssences] = useState<Essence[]>([])
  const [loading, setLoading] = useState(true)
  const [essenceFilter, setEssenceFilter] = useState("")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  async function fetchMovements(p = 1, eId = essenceFilter) {
    setLoading(true)
    const params = new URLSearchParams({ page: String(p) })
    if (eId) params.set("essenceId", eId)
    const res = await fetch(`/api/admin/stock-movements?${params}`)
    if (res.ok) {
      const data = await res.json()
      setMovements(data.movements)
      setTotalPages(data.pages)
      setTotal(data.total)
    }
    setLoading(false)
  }

  async function fetchEssences() {
    const res = await fetch("/api/admin/essences")
    if (res.ok) setEssences(await res.json())
  }

  useEffect(() => { fetchEssences(); fetchMovements() }, [])

  function handleFilterChange(val: string | null) {
    const v = !val || val === "ALL" ? "" : val
    setEssenceFilter(v)
    setPage(1)
    fetchMovements(1, v)
  }

  function handlePage(p: number) {
    setPage(p)
    fetchMovements(p)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-3xl font-serif" style={{ color: "var(--charcoal)", fontFamily: "var(--font-gloock)" }}>
            Stok Geçmişi
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted-warm)" }}>
            {total} hareket kaydı
          </p>
        </div>
      </div>

      <div className="flex gap-3 items-center flex-wrap">
        <SlidersHorizontal size={14} style={{ color: "var(--text-muted-warm)" }} />
        <Select value={essenceFilter || "ALL"} onValueChange={handleFilterChange}>
          <SelectTrigger className="w-56" style={{ background: "#fff", borderColor: "var(--border)" }}>
            <SelectValue placeholder="Tüm esanslar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tüm esanslar</SelectItem>
            {essences.map(e => (
              <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)", background: "#fff" }}>
        {loading ? (
          <div className="py-16 text-center" style={{ color: "var(--text-muted-warm)" }}>
            <RefreshCw size={28} className="mx-auto mb-3 animate-spin opacity-30" />
            <p className="text-sm">Yükleniyor...</p>
          </div>
        ) : movements.length === 0 ? (
          <div className="py-16 text-center" style={{ color: "var(--text-muted-warm)" }}>
            <History size={28} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">Kayıt bulunamadı</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--ivory)" }}>
                  {["Tarih", "Esans", "Hareket Tipi", "Miktar (ml)", "Parfüm / Parti", "Neden", "Kim"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs uppercase tracking-wider font-medium" style={{ color: "var(--text-muted-warm)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {movements.map((m, i) => {
                  const type = TYPE_LABELS[m.movementType] ?? { label: m.movementType, color: "#94a3b8" }
                  const isPositive = m.quantityMl >= 0
                  return (
                    <tr key={m.id} style={{ borderBottom: i < movements.length - 1 ? "1px solid var(--border)" : "none" }}>
                      <td className="px-4 py-3 text-xs font-mono" style={{ color: "var(--text-muted-warm)" }}>
                        {new Date(m.createdAt).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" })}
                      </td>
                      <td className="px-4 py-3 font-medium" style={{ color: "var(--charcoal)" }}>{m.essence.name}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${type.color}22`, color: type.color, border: `1px solid ${type.color}44` }}>
                          {type.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {isPositive
                            ? <ArrowUpCircle size={13} className="text-green-500 shrink-0" />
                            : <ArrowDownCircle size={13} className="text-red-400 shrink-0" />
                          }
                          <span className="font-mono text-xs" style={{ color: isPositive ? "#16a34a" : "#dc2626" }}>
                            {isPositive ? "+" : ""}{m.quantityMl.toFixed(1)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: "var(--text-muted-warm)" }}>
                        {m.batch ? `${m.batch.perfume.name} / ${m.batch.batchLabel}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs max-w-[200px] truncate" style={{ color: "var(--text-muted-warm)" }}>
                        {m.reason ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: "var(--text-muted-warm)" }}>
                        {m.createdBy ? m.createdBy.split("@")[0] : "—"}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => handlePage(page - 1)}
            disabled={page === 1}
            className="text-xs px-3 py-1.5 rounded border disabled:opacity-30 transition-opacity"
            style={{ borderColor: "var(--border)", color: "var(--charcoal)" }}
          >
            ← Önceki
          </button>
          <span className="text-xs" style={{ color: "var(--text-muted-warm)" }}>
            {page} / {totalPages}
          </span>
          <button
            onClick={() => handlePage(page + 1)}
            disabled={page === totalPages}
            className="text-xs px-3 py-1.5 rounded border disabled:opacity-30 transition-opacity"
            style={{ borderColor: "var(--border)", color: "var(--charcoal)" }}
          >
            Sonraki →
          </button>
        </div>
      )}
    </div>
  )
}
