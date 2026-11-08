import Link from "next/link"
import { ArrowRight, Droplets, FlaskConical, Package, AlertTriangle, TrendingDown, Info, Scale, FileSpreadsheet, CheckCircle2 } from "lucide-react"
import { DashboardCharts } from "@/components/admin/DashboardCharts"
import { getDashboardInsights } from "@/lib/insights"

// Her istekte güncel veri (aksi halde build anında donuyordu)
export const dynamic = "force-dynamic"

const fmtMl = (n: number) => `${(Math.round(n * 100) / 100).toLocaleString("tr-TR")} ml`
const fmtDate = (d: Date, unknown?: boolean) => (unknown ? "Tarih bilinmiyor" : d.toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul" }))

const TONE = {
  danger: { bg: "rgba(239,68,68,0.07)", border: "rgba(239,68,68,0.25)", color: "#b91c1c", Icon: AlertTriangle },
  warn: { bg: "rgba(234,179,8,0.09)", border: "rgba(234,179,8,0.35)", color: "#854d0e", Icon: TrendingDown },
  info: { bg: "rgba(59,130,246,0.06)", border: "rgba(59,130,246,0.25)", color: "#1d4ed8", Icon: Info },
}

export default async function DashboardPage() {
  const d = await getDashboardInsights()

  const statCards = [
    { label: "Toplam Parfüm", value: d.totalPerfumes, sub: `${d.publicPerfumes} public yayında`, icon: FlaskConical, href: "/admin/perfumes", color: "#8B7140" },
    { label: "Toplam Esans", value: d.totalEssences, sub: `${d.lowStock.length} az stokta`, icon: Droplets, href: "/admin/essences", color: "#1d4ed8" },
    { label: "Az Stok", value: d.lowStock.length, sub: "yenileme gerekebilir", icon: TrendingDown, href: "/admin/essences?status=AZ_STOK", color: "#a16207" },
    { label: "Biten Esans", value: d.outOfStock.length, sub: "stok yok", icon: AlertTriangle, href: "/admin/essences?status=BITTI", color: "#b91c1c" },
    { label: "Veri Tutarsız", value: d.inconsistent.length, sub: "stok defteri farkı", icon: Scale, href: "/admin/essences?status=TUTARSIZ", color: "#6d28d9" },
    { label: "Üretilebilir Reçete", value: d.producible.length, sub: "mevcut stokla", icon: CheckCircle2, href: "#uretilebilir", color: "#15803d" },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-serif" style={{ color: "var(--charcoal)", fontFamily: "var(--font-gloock)" }}>
          Dashboard
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted-warm)" }}>
          Üretim ve stok durumuna genel bakış
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <Link key={card.label} href={card.href} className="rounded-xl p-4 border transition-all hover:shadow-md focus-visible:outline-2 focus-visible:outline-[var(--gold)]" style={{ background: "#fff", borderColor: "var(--border)" }}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted-warm)" }}>
                    {card.label}
                  </p>
                  <p className="text-3xl font-serif" style={{ color: "var(--charcoal)" }}>
                    {card.value}
                  </p>
                  <p className="text-[11px] mt-1" style={{ color: "var(--text-muted-warm)" }}>
                    {card.sub}
                  </p>
                </div>
                <div className="rounded-lg p-2 shrink-0" style={{ background: `${card.color}14` }}>
                  <Icon size={16} style={{ color: card.color }} aria-hidden />
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Akıllı öneriler */}
      {d.suggestions.length > 0 && (
        <section aria-labelledby="oneriler" className="space-y-2">
          <h2 id="oneriler" className="text-lg font-serif" style={{ color: "var(--charcoal)" }}>
            Dikkat Gerektirenler
          </h2>
          <ul className="space-y-2">
            {d.suggestions.slice(0, 10).map((s, i) => {
              const t = TONE[s.tone]
              return (
                <li key={i}>
                  <Link href={s.href} className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm hover:shadow-sm" style={{ background: t.bg, border: `1px solid ${t.border}`, color: t.color }}>
                    <t.Icon size={15} className="shrink-0" aria-hidden />
                    <span className="flex-1 min-w-0">{s.text}</span>
                    <ArrowRight size={13} className="shrink-0" aria-hidden />
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Son üretimler */}
        <section aria-labelledby="son-uretimler">
          <div className="flex items-center justify-between mb-3">
            <h2 id="son-uretimler" className="text-lg font-serif" style={{ color: "var(--charcoal)" }}>
              Son Üretimler
            </h2>
            <Link href="/admin/batches" className="text-xs flex items-center gap-1 hover:underline" style={{ color: "#8B7140" }}>
              Tümünü Gör <ArrowRight size={12} />
            </Link>
          </div>
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)", background: "#fff" }}>
            {d.recentBatches.length === 0 ? (
              <div className="py-10 text-center">
                <Package size={28} className="mx-auto mb-2 opacity-20" />
                <p className="text-sm" style={{ color: "var(--text-muted-warm)" }}>
                  Henüz üretim kaydı yok.
                </p>
              </div>
            ) : (
              <ul>
                {d.recentBatches.map((b, i) => (
                  <li key={b.id} style={{ borderBottom: i < d.recentBatches.length - 1 ? "1px solid var(--border)" : "none" }}>
                    <Link href={`/admin/perfumes/${b.perfume.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--ivory)]">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: "var(--charcoal)" }}>
                          {b.perfume.name}
                        </p>
                        <p className="text-[11px] truncate" style={{ color: "var(--text-muted-warm)" }}>
                          {b.batchLabel} · {b.essence.name}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-mono" style={{ color: "var(--charcoal)" }}>
                          {fmtMl(b.totalVolumeMl)}
                        </p>
                        <p className="text-[11px]" style={{ color: "var(--text-muted-warm)" }}>
                          {fmtDate(b.productionDate, b.productionDateUnknown)}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Üretilebilir reçeteler */}
        <section aria-labelledby="uretilebilir-baslik" id="uretilebilir">
          <h2 id="uretilebilir-baslik" className="text-lg font-serif mb-3" style={{ color: "var(--charcoal)" }}>
            Mevcut Stokla Üretilebilir
          </h2>
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)", background: "#fff" }}>
            {d.producible.length === 0 ? (
              <p className="py-10 text-center text-sm" style={{ color: "var(--text-muted-warm)" }}>
                Mevcut stokla son reçetesi üretilebilen parfüm yok.
              </p>
            ) : (
              <ul className="max-h-[360px] overflow-y-auto">
                {d.producible.map((p, i) => (
                  <li key={p.perfumeId} style={{ borderBottom: i < d.producible.length - 1 ? "1px solid var(--border)" : "none" }}>
                    <Link href={`/admin/perfumes/${p.perfumeId}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--ivory)]">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate" style={{ color: "var(--charcoal)" }}>
                          {p.perfumeName}
                        </p>
                        <p className="text-[11px]" style={{ color: "var(--text-muted-warm)" }}>
                          {fmtMl(p.totalVolumeMl)} · %{Math.round(p.essenceRatio * 1000) / 10} esans
                        </p>
                      </div>
                      <span className="text-sm font-mono font-semibold shrink-0" style={{ color: "#15803d" }}>
                        ×{p.count}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      {d.lastImport && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-xs" style={{ background: "#fff", border: "1px solid var(--border)", color: "var(--text-muted-warm)" }}>
          <FileSpreadsheet size={14} aria-hidden />
          <span>
            Son içe aktarma: <strong style={{ color: "var(--charcoal)" }}>{d.lastImport.filename}</strong> · {d.lastImport.createdAt.toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })} · {d.lastImport.successfulRows} başarılı, {d.lastImport.failedRows} hatalı, {d.lastImport.warningsCount} uyarılı
          </span>
        </div>
      )}

      <DashboardCharts />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: "Yeni Parfüm", href: "/admin/perfumes", desc: "Parfüm veya reçete ekle" },
          { label: "Yeni Üretim", href: "/admin/batches", desc: "Üretim partisi kaydet" },
          { label: "Excel İçe Aktar", href: "/admin/import", desc: "PARFUM.xlsx yükle" },
        ].map((action) => (
          <Link key={action.href} href={action.href} className="rounded-xl p-4 border transition-all hover:shadow-sm group" style={{ background: "#fff", borderColor: "var(--border)" }}>
            <p className="text-sm font-medium group-hover:text-[#8B7140]" style={{ color: "var(--charcoal)" }}>
              {action.label}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted-warm)" }}>
              {action.desc}
            </p>
          </Link>
        ))}
      </div>
    </div>
  )
}
