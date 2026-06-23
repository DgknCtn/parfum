import { notFound } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import type { Metadata } from "next"

export const revalidate = 3600

const genderLabels: Record<string, string> = {
  KADIN: "Kadın",
  ERKEK: "Erkek",
  UNISEX: "Unisex",
  BELIRTILMEMIS: "",
}

const genderColors: Record<string, string> = {
  KADIN: "#c026d3",
  ERKEK: "#2563eb",
  UNISEX: "#059669",
  BELIRTILMEMIS: "#6b7280",
}

export async function generateStaticParams() {
  const perfumes = await prisma.perfume.findMany({
    where: { publicVisible: true },
    select: { slug: true },
  })
  return perfumes.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const perfume = await prisma.perfume.findUnique({ where: { slug, publicVisible: true } })
  if (!perfume) return { title: "Parfüm Bulunamadı" }
  return {
    title: perfume.name,
    description: perfume.description ?? `${perfume.name} — el yapımı parfüm reçetesi`,
  }
}

export default async function PerfumeDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const perfume = await prisma.perfume.findUnique({
    where: { slug, publicVisible: true },
    include: {
      batches: {
        where: { deletedAt: null },
        orderBy: { productionDate: "desc" },
        select: {
          id: true,
          batchLabel: true,
          productionDate: true,
          totalVolumeMl: true,
          essenceRatio: true,
          essenceVolumeMl: true,
          alcoholVolumeMl: true,
          waterVolumeMl: true,
          notes: true,
        },
      },
    },
  })

  if (!perfume) notFound()

  const gender = perfume.genderCategory
  const genderColor = genderColors[gender] ?? "#6b7280"
  const genderLabel = genderLabels[gender]

  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      {/* Back */}
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-xs mb-10 transition-colors hover:text-[var(--gold)]"
        style={{ color: "var(--text-muted-warm)" }}
      >
        ← Koleksiyona Dön
      </Link>

      {/* Hero */}
      <div className="mb-12">
        {perfume.brandName && (
          <p className="text-[10px] tracking-[0.4em] uppercase mb-3" style={{ color: "var(--gold)" }}>
            {perfume.brandName}
          </p>
        )}
        <div className="flex items-start gap-4">
          <h1
            className="flex-1 text-4xl md:text-5xl leading-none"
            style={{
              color: "var(--ivory)",
              fontFamily: "var(--font-gloock)",
              letterSpacing: "-0.02em",
            }}
          >
            {perfume.name}
          </h1>
          {genderLabel && (
            <span
              className="mt-1 text-xs px-3 py-1 rounded-full shrink-0"
              style={{
                background: `${genderColor}18`,
                color: genderColor,
                border: `1px solid ${genderColor}30`,
              }}
            >
              {genderLabel}
            </span>
          )}
        </div>
        {perfume.description && (
          <p className="mt-4 text-sm leading-relaxed" style={{ color: "var(--text-muted-warm)" }}>
            {perfume.description}
          </p>
        )}
      </div>

      {/* Divider */}
      <div className="h-px mb-12" style={{ background: "rgba(201,168,92,0.15)" }} />

      {/* Batches */}
      {perfume.batches.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm" style={{ color: "var(--text-muted-warm)" }}>
            Bu parfüm için henüz public parti bilgisi paylaşılmamış.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <h2 className="text-xs tracking-[0.3em] uppercase" style={{ color: "var(--gold)" }}>
            Üretim Reçeteleri ({perfume.batches.length} Parti)
          </h2>

          {perfume.batches.map((batch, i) => {
            const total = batch.totalVolumeMl
            const essencePct = (batch.essenceVolumeMl / total) * 100
            const alcoholPct = (batch.alcoholVolumeMl / total) * 100
            const waterPct = (batch.waterVolumeMl / total) * 100

            return (
              <article
                key={batch.id}
                className="rounded-xl p-6 space-y-5"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                {/* Batch header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span
                      className="text-sm font-medium"
                      style={{ color: "var(--ivory)", fontFamily: "var(--font-gloock)" }}
                    >
                      {batch.batchLabel}
                    </span>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted-warm)" }}>
                      {new Date(batch.productionDate).toLocaleDateString("tr-TR", { year: "numeric", month: "long", day: "numeric" })}
                    </p>
                  </div>
                  <span
                    className="text-xl font-mono shrink-0"
                    style={{ color: "var(--gold)", fontFamily: "var(--font-gloock)" }}
                  >
                    %{(batch.essenceRatio * 100).toFixed(0)}
                  </span>
                </div>

                {/* Composition bar */}
                <div className="space-y-1.5">
                  <div className="flex rounded-full overflow-hidden h-2">
                    <div style={{ width: `${essencePct}%`, background: "var(--gold)" }} />
                    <div style={{ width: `${alcoholPct}%`, background: "rgba(201,168,92,0.35)" }} />
                    <div style={{ width: `${waterPct}%`, background: "rgba(201,168,92,0.12)" }} />
                  </div>
                  <div className="flex items-center gap-3 flex-wrap text-[10px]" style={{ color: "var(--text-muted-warm)" }}>
                    <span>
                      <span style={{ color: "var(--gold)" }}>■</span> Esans {essencePct.toFixed(0)}%
                    </span>
                    <span>
                      <span style={{ color: "rgba(201,168,92,0.5)" }}>■</span> Alkol {alcoholPct.toFixed(0)}%
                    </span>
                    <span>
                      <span style={{ color: "rgba(201,168,92,0.2)" }}>■</span> Su {waterPct.toFixed(0)}%
                    </span>
                  </div>
                </div>

                {/* Detailed values */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Toplam", value: `${total} ml` },
                    { label: "Esans", value: `${batch.essenceVolumeMl} ml` },
                    { label: "Alkol", value: `${batch.alcoholVolumeMl} ml` },
                    { label: "Su", value: `${batch.waterVolumeMl} ml` },
                  ].map(({ label, value }) => (
                    <div
                      key={label}
                      className="rounded-lg p-3 text-center"
                      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}
                    >
                      <p className="text-base font-mono" style={{ color: "var(--ivory)" }}>{value}</p>
                      <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted-warm)" }}>{label}</p>
                    </div>
                  ))}
                </div>

                {/* Notes */}
                {batch.notes && (
                  <div
                    className="rounded-lg px-4 py-3 text-sm italic leading-relaxed"
                    style={{
                      background: "rgba(201,168,92,0.04)",
                      borderLeft: "2px solid rgba(201,168,92,0.3)",
                      color: "var(--text-muted-warm)",
                    }}
                  >
                    "{batch.notes}"
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}

      {/* Notes */}
      {perfume.notes && (
        <div className="mt-12 pt-8 border-t" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
          <p className="text-xs uppercase tracking-widest mb-3" style={{ color: "var(--gold)" }}>Notlar</p>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted-warm)" }}>{perfume.notes}</p>
        </div>
      )}
    </div>
  )
}
