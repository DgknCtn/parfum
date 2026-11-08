"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/client-api"
import { ScrollText } from "lucide-react"

interface Item {
  id: string
  action: string
  entityType: string
  entityId: string | null
  message: string
  createdBy: string | null
  createdAt: string
}

const TYPES = [
  ["", "Tümü"],
  ["batch", "Partiler"],
  ["essence", "Esanslar"],
  ["perfume", "Parfümler"],
  ["import", "İçe aktarma"],
  ["system", "Sistem"],
] as const

export default function ActivityPage() {
  const [items, setItems] = useState<Item[]>([])
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [type, setType] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api<{ items: Item[]; pages: number }>(`/api/admin/activity?page=${page}${type ? `&entityType=${type}` : ""}`).then((r) => {
      if (r.ok) {
        setItems(r.data.items)
        setPages(r.data.pages)
        setError(null)
      } else setError(r.error)
      setLoading(false)
    })
  }, [page, type])

  const muted = { color: "var(--text-muted-warm)" }
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif" style={{ color: "var(--charcoal)", fontFamily: "var(--font-gloock)" }}>
          Etkinlik Günlüğü
        </h1>
        <p className="text-sm mt-1" style={muted}>
          Üretim, stok, görünürlük ve içe aktarma işlemlerinin kaydı
        </p>
      </div>

      <div className="flex gap-1 flex-wrap" role="group" aria-label="Kayıt türü">
        {TYPES.map(([v, l]) => (
          <button
            key={v}
            type="button"
            aria-pressed={type === v}
            onClick={() => {
              if (v === type) return
              setLoading(true)
              setType(v)
              setPage(1)
            }}
            className="px-3 py-1.5 rounded-lg text-xs border"
            style={{ background: type === v ? "var(--charcoal)" : "#fff", color: type === v ? "var(--ivory)" : "var(--text-muted-warm)", borderColor: type === v ? "var(--charcoal)" : "var(--border)" }}
          >
            {l}
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="text-sm" style={{ color: "#b91c1c" }}>
          {error} — Veritabanı şeması güncellenmediyse <code>npx prisma db push</code> çalıştırın.
        </p>
      )}

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)", background: "#fff" }}>
        {loading ? (
          <p className="py-12 text-center text-sm" style={muted}>
            Yükleniyor...
          </p>
        ) : items.length === 0 ? (
          <div className="py-12 text-center" style={muted}>
            <ScrollText size={26} className="mx-auto mb-2 opacity-25" />
            <p className="text-sm">Henüz kayıt yok</p>
          </div>
        ) : (
          <ol>
            {items.map((it, i) => (
              <li key={it.id} className="px-4 py-3 flex gap-3" style={{ borderBottom: i < items.length - 1 ? "1px solid var(--border)" : "none" }}>
                <time className="text-[11px] font-mono shrink-0 w-28 pt-0.5" style={muted} dateTime={it.createdAt}>
                  {new Date(it.createdAt).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul", day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
                </time>
                <div className="min-w-0">
                  <p className="text-sm" style={{ color: "var(--charcoal)" }}>
                    {it.message}
                  </p>
                  <p className="text-[11px]" style={muted}>
                    {it.createdBy ?? "sistem"}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => (setLoading(true), setPage((p) => p - 1))}>
            Önceki
          </Button>
          <span className="text-xs" style={muted}>
            {page} / {pages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => (setLoading(true), setPage((p) => p + 1))}>
            Sonraki
          </Button>
        </div>
      )}
    </div>
  )
}
