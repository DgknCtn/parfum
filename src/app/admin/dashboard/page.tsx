import { prisma } from "@/lib/prisma"
import { StockBadge } from "@/components/admin/StockBadge"
import Link from "next/link"
import { ArrowRight, Droplets, FlaskConical, Package, AlertTriangle, TrendingDown, CheckCircle2 } from "lucide-react"

async function getDashboardData() {
  const [
    totalPerfumes,
    publicPerfumes,
    totalEssences,
    lowStockEssences,
    outOfStockEssences,
    recentBatches,
    inconsistentEssences,
  ] = await Promise.all([
    prisma.perfume.count(),
    prisma.perfume.count({ where: { publicVisible: true } }),
    prisma.essence.count(),
    prisma.essence.count({ where: { status: "AZ_STOK" } }),
    prisma.essence.count({ where: { status: "BITTI" } }),
    prisma.batch.findMany({
      where: { deletedAt: null },
      orderBy: { productionDate: "desc" },
      take: 6,
      include: {
        perfume: { select: { name: true, genderCategory: true } },
        essence: { select: { name: true } },
      },
    }),
    prisma.essence.count({ where: { status: "TUTARSIZ" } }),
  ])

  return {
    totalPerfumes,
    publicPerfumes,
    totalEssences,
    lowStockEssences,
    outOfStockEssences,
    recentBatches,
    inconsistentEssences,
  }
}

export default async function DashboardPage() {
  const data = await getDashboardData()

  const statCards = [
    {
      label: "Toplam Parfüm",
      value: data.totalPerfumes,
      sub: `${data.publicPerfumes} public yayında`,
      icon: FlaskConical,
      href: "/admin/perfumes",
      color: "var(--gold)",
    },
    {
      label: "Toplam Esans",
      value: data.totalEssences,
      sub: `${data.lowStockEssences} az stokta`,
      icon: Droplets,
      href: "/admin/essences",
      color: "#60a5fa",
    },
    {
      label: "Az Stok",
      value: data.lowStockEssences,
      sub: "yenileme gerekebilir",
      icon: TrendingDown,
      href: "/admin/essences?status=AZ_STOK",
      color: "#facc15",
    },
    {
      label: "Biten Esans",
      value: data.outOfStockEssences,
      sub: "stok yok",
      icon: AlertTriangle,
      href: "/admin/essences?status=BITTI",
      color: "#f87171",
    },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1
          className="text-3xl font-serif"
          style={{ color: "var(--charcoal)", fontFamily: "var(--font-gloock)" }}
        >
          Dashboard
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted-warm)" }}>
          Üretim ve stok durumuna genel bakış
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <Link key={card.label} href={card.href}>
              <div
                className="rounded-xl p-5 border transition-all hover:shadow-md cursor-pointer"
                style={{
                  background: "#FFFFFF",
                  borderColor: "var(--border)",
                }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wider mb-2" style={{ color: "var(--text-muted-warm)" }}>
                      {card.label}
                    </p>
                    <p className="text-3xl font-serif" style={{ color: "var(--charcoal)" }}>
                      {card.value}
                    </p>
                    <p className="text-xs mt-1" style={{ color: "var(--text-muted-warm)" }}>
                      {card.sub}
                    </p>
                  </div>
                  <div className="rounded-lg p-2.5" style={{ background: `${card.color}18` }}>
                    <Icon size={18} style={{ color: card.color }} />
                  </div>
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Alerts */}
      {(data.outOfStockEssences > 0 || data.inconsistentEssences > 0) && (
        <div className="space-y-2">
          {data.outOfStockEssences > 0 && (
            <Link href="/admin/essences?status=BITTI">
              <div
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm"
                style={{
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.2)",
                  color: "#dc2626",
                }}
              >
                <AlertTriangle size={15} />
                <span className="flex-1 min-w-0">{data.outOfStockEssences} esans stoğu tükendi. Lütfen kontrol edin.</span>
                <ArrowRight size={13} className="shrink-0 ml-auto" />
              </div>
            </Link>
          )}
          {data.inconsistentEssences > 0 && (
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm"
              style={{
                background: "rgba(139,92,246,0.08)",
                border: "1px solid rgba(139,92,246,0.2)",
                color: "#7c3aed",
              }}
            >
              <AlertTriangle size={15} />
              <span>{data.inconsistentEssences} esansta veri tutarsızlığı var.</span>
            </div>
          )}
        </div>
      )}

      {/* Recent Batches */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-serif" style={{ color: "var(--charcoal)" }}>
            Son Üretimler
          </h2>
          <Link
            href="/admin/batches"
            className="text-xs flex items-center gap-1 hover:opacity-80 transition-opacity"
            style={{ color: "var(--gold)" }}
          >
            Tümünü Gör <ArrowRight size={12} />
          </Link>
        </div>

        <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)", background: "#FFFFFF" }}><div className="overflow-x-auto">
          {data.recentBatches.length === 0 ? (
            <div className="py-12 text-center">
              <Package size={32} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm" style={{ color: "var(--text-muted-warm)" }}>
                Henüz üretim kaydı yok.
              </p>
              <Link
                href="/admin/batches"
                className="text-xs mt-2 inline-block"
                style={{ color: "var(--gold)" }}
              >
                İlk üretimi ekle →
              </Link>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--ivory)" }}>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider font-medium" style={{ color: "var(--text-muted-warm)" }}>Parfüm</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider font-medium" style={{ color: "var(--text-muted-warm)" }}>Esans</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider font-medium" style={{ color: "var(--text-muted-warm)" }}>Parti</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider font-medium" style={{ color: "var(--text-muted-warm)" }}>Tarih</th>
                  <th className="text-right px-4 py-3 text-xs uppercase tracking-wider font-medium" style={{ color: "var(--text-muted-warm)" }}>Hacim</th>
                </tr>
              </thead>
              <tbody>
                {data.recentBatches.map((batch, i) => (
                  <tr
                    key={batch.id}
                    style={{ borderBottom: i < data.recentBatches.length - 1 ? "1px solid var(--border)" : "none" }}
                  >
                    <td className="px-4 py-3 font-medium" style={{ color: "var(--charcoal)" }}>
                      {batch.perfume.name}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--text-muted-warm)" }}>
                      {batch.essence.name}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--text-muted-warm)" }}>
                      {batch.batchLabel}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--text-muted-warm)" }}>
                      {new Date(batch.productionDate).toLocaleDateString("tr-TR")}
                    </td>
                    <td className="px-4 py-3 text-xs text-right font-mono" style={{ color: "var(--charcoal)" }}>
                      {batch.totalVolumeMl} ml
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div></div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: "Yeni Parfüm", href: "/admin/perfumes", desc: "Parfüm veya reçete ekle" },
          { label: "Yeni Üretim", href: "/admin/batches", desc: "Üretim partisi kaydet" },
          { label: "Excel İçe Aktar", href: "/admin/import", desc: "PARFUM.xlsx yükle" },
        ].map((action) => (
          <Link key={action.href} href={action.href}>
            <div
              className="rounded-xl p-4 border transition-all hover:shadow-sm cursor-pointer group"
              style={{ background: "#FFFFFF", borderColor: "var(--border)" }}
            >
              <p className="text-sm font-medium group-hover:text-[var(--gold)] transition-colors" style={{ color: "var(--charcoal)" }}>
                {action.label}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted-warm)" }}>
                {action.desc}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
