import { notFound } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import type { Metadata } from "next"
import { prisma } from "@/lib/prisma"
import {
  getPublicPerfume,
  getSimilarPerfumes,
  publicPerfumeWhere,
  formatBatchDate,
  formatRatio,
  formatMl,
  GENDER_LABEL,
  type PublicBatch,
} from "@/lib/catalog"
import { QrShare } from "@/components/public/QrShare"
import { GenderBadge, StockBadge } from "@/components/public/Badges"

export const revalidate = 3600

type Props = { params: Promise<{ slug: string }> }

export async function generateStaticParams() {
  const perfumes = await prisma.perfume.findMany({ where: publicPerfumeWhere, select: { slug: true } })
  return perfumes.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const perfume = await getPublicPerfume(slug)
  if (!perfume) return { title: "Parfüm Bulunamadı", robots: { index: false } }
  const latest = perfume.batches[0]
  const title = perfume.brandName ? `${perfume.brandName} — ${perfume.name}` : perfume.name
  const description =
    perfume.description ??
    `${title} el yapımı parfüm reçetesi${latest ? `: ${formatRatio(latest.essenceRatio)} esans oranı, ${formatMl(latest.totalVolumeMl)}` : ""}.`
  return {
    title,
    description,
    alternates: { canonical: `/p/${perfume.slug}` },
    openGraph: {
      type: "article",
      title,
      description,
      url: `/p/${perfume.slug}`,
      ...(perfume.coverImageUrl ? { images: [{ url: perfume.coverImageUrl, alt: title }] } : {}),
    },
  }
}

const TERMS = [
  ["Esans oranı", "Parfümün toplam hacmi içindeki koku esansının yüzdesi. Yükseldikçe koku daha yoğun ve kalıcı olur."],
  ["Esans", "Kokuyu veren konsantre parfüm yağı."],
  ["Alkol", "Esansı çözen ve kokunun yayılmasını sağlayan taşıyıcı (genelde parfüm alkolü)."],
  ["Su", "Alkolün sertliğini yumuşatmak için az miktarda eklenen saf su."],
  ["Toplam hacim", "Şişedeki parfümün toplam miktarı (ml)."],
] as const

export default async function PerfumeDetailPage({ params }: Props) {
  const { slug } = await params
  const perfume = await getPublicPerfume(slug)
  if (!perfume) notFound()
  const similar = await getSimilarPerfumes(perfume)

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 md:py-16">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-xs mb-8 py-1 transition-colors hover:text-[var(--gold)]"
        style={{ color: "var(--text-muted-warm)" }}
      >
        ← Koleksiyona Dön
      </Link>

      {perfume.coverImageUrl && (
        <div className="relative w-full h-56 sm:h-72 rounded-xl overflow-hidden mb-8">
          <Image src={perfume.coverImageUrl} alt={perfume.name} fill priority sizes="(min-width: 768px) 768px, 100vw" className="object-cover" />
        </div>
      )}

      {/* Hero */}
      <header className="mb-10">
        {perfume.brandName && (
          <p className="text-[10px] tracking-[0.4em] uppercase mb-3" style={{ color: "var(--gold)" }}>
            {perfume.brandName}
          </p>
        )}
        <h1
          className="text-4xl md:text-5xl leading-tight break-words"
          style={{ color: "var(--ivory)", fontFamily: "var(--font-gloock)", letterSpacing: "-0.02em" }}
        >
          {perfume.name}
        </h1>
        <div className="flex items-center gap-2 flex-wrap mt-4">
          <GenderBadge gender={perfume.genderCategory} size="md" />
          <StockBadge stock={perfume.stock} size="md" />
        </div>
        {perfume.description && (
          <p className="mt-4 text-sm leading-relaxed" style={{ color: "var(--text-muted-warm)" }}>
            {perfume.description}
          </p>
        )}
      </header>

      <div className="h-px mb-10" style={{ background: "rgba(201,168,92,0.15)" }} />

      {/* Batches */}
      {perfume.batches.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-sm" style={{ color: "var(--text-muted-warm)" }}>
            Bu parfüm için henüz public reçete bilgisi paylaşılmamış.
          </p>
        </div>
      ) : (
        <section className="space-y-5" aria-labelledby="receteler">
          <h2 id="receteler" className="text-xs tracking-[0.3em] uppercase" style={{ color: "var(--gold)" }}>
            Üretim Reçeteleri ({perfume.batches.length} Parti)
          </h2>
          {perfume.batches.map((batch) => (
            <BatchCard key={batch.id} batch={batch} />
          ))}
        </section>
      )}

      {/* Koku Notaları */}
      {(perfume.topNotes || perfume.middleNotes || perfume.baseNotes) && (
        <section className="mt-12 pt-8 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }} aria-labelledby="notalar">
          <h2 id="notalar" className="text-xs uppercase tracking-widest mb-4" style={{ color: "var(--gold)" }}>
            Koku Notaları
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "Üst Nota", value: perfume.topNotes, desc: "İlk izlenim" },
              { label: "Orta Nota", value: perfume.middleNotes, desc: "Kalp notası" },
              { label: "Alt Nota", value: perfume.baseNotes, desc: "Kalıcı iz" },
            ]
              .filter((n) => n.value)
              .map(({ label, value, desc }) => (
                <div key={label} className="rounded-lg p-4" style={{ background: "rgba(201,168,92,0.04)", border: "1px solid rgba(201,168,92,0.12)" }}>
                  <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: "var(--gold)" }}>
                    {label}
                  </p>
                  <p className="text-sm" style={{ color: "var(--ivory)" }}>
                    {value}
                  </p>
                  <p className="text-[11px] mt-1" style={{ color: "var(--text-muted-warm)" }}>
                    {desc}
                  </p>
                </div>
              ))}
          </div>
        </section>
      )}

      {/* Terimler */}
      <details className="mt-10 rounded-lg px-4 py-3 group" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <summary className="text-xs cursor-pointer select-none" style={{ color: "var(--text-muted-warm)" }}>
          Terimler ne anlama geliyor?
        </summary>
        <dl className="mt-3 space-y-2 text-xs">
          {TERMS.map(([term, def]) => (
            <div key={term}>
              <dt className="inline font-medium" style={{ color: "var(--ivory)" }}>
                {term}:{" "}
              </dt>
              <dd className="inline" style={{ color: "var(--text-muted-warm)" }}>
                {def}
              </dd>
            </div>
          ))}
        </dl>
      </details>

      {/* Benzer parfümler */}
      {similar.length > 0 && (
        <section className="mt-12 pt-8 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }} aria-labelledby="benzer">
          <h2 id="benzer" className="text-xs uppercase tracking-widest mb-4" style={{ color: "var(--gold)" }}>
            {perfume.genderCategory !== "BELIRTILMEMIS" ? `${GENDER_LABEL[perfume.genderCategory]} kategorisinde diğer kokular` : "Diğer kokular"}
          </h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {similar.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/p/${s.slug}`}
                  className="flex items-center justify-between gap-3 rounded-lg px-4 py-3 transition-colors hover:border-[var(--gold)] focus-visible:outline-2 focus-visible:outline-[var(--gold)]"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <span className="min-w-0">
                    {s.brandName && (
                      <span className="block text-[10px] tracking-widest uppercase truncate" style={{ color: "var(--text-muted-warm)" }}>
                        {s.brandName}
                      </span>
                    )}
                    <span className="block text-sm truncate" style={{ color: "var(--ivory)", fontFamily: "var(--font-gloock)" }}>
                      {s.name}
                    </span>
                  </span>
                  <StockBadge stock={s.stock} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <QrShare />
    </div>
  )
}

function BatchCard({ batch }: { batch: PublicBatch }) {
  const total = batch.totalVolumeMl
  const sum = batch.essenceVolumeMl + batch.alcoholVolumeMl + batch.waterVolumeMl
  // Bar her zaman %100'e ölçeklenir; bileşen toplamı farklıysa ayrıca belirtilir.
  const base = sum > 0 ? sum : total
  const parts = [
    { label: "Esans", ml: batch.essenceVolumeMl, color: "var(--gold)" },
    { label: "Alkol", ml: batch.alcoholVolumeMl, color: "rgba(201,168,92,0.4)" },
    { label: "Su", ml: batch.waterVolumeMl, color: "rgba(201,168,92,0.15)" },
  ]
  const mismatch = total > 0 && Math.abs(sum - total) / total > 0.02

  return (
    <article className="rounded-xl p-5 sm:p-6 space-y-5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-medium" style={{ color: "var(--ivory)", fontFamily: "var(--font-gloock)" }}>
            {batch.batchLabel}
          </h3>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted-warm)" }}>
            {formatBatchDate(batch)}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xl font-mono" style={{ color: "var(--gold)" }}>
            {formatRatio(batch.essenceRatio)}
          </p>
          <p className="text-[10px]" style={{ color: "var(--text-muted-warm)" }}>
            esans oranı
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex rounded-full overflow-hidden h-2" role="img" aria-label={parts.map((p) => `${p.label} ${formatMl(p.ml)}`).join(", ")}>
          {parts.map((p) => (
            <div key={p.label} style={{ width: `${(p.ml / base) * 100}%`, background: p.color }} />
          ))}
        </div>
        <div className="flex items-center gap-3 flex-wrap text-[11px]" style={{ color: "var(--text-muted-warm)" }}>
          {parts.map((p) => (
            <span key={p.label}>
              <span aria-hidden style={{ color: p.color }}>
                ■
              </span>{" "}
              {p.label} %{Math.round((p.ml / base) * 100)}
            </span>
          ))}
        </div>
        {mismatch && (
          <p className="text-[11px]" style={{ color: "var(--text-muted-warm)" }}>
            Not: bileşenlerin toplamı ({formatMl(sum)}) toplam hacimden ({formatMl(total)}) biraz farklı.
          </p>
        )}
      </div>

      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Toplam", value: formatMl(total) },
          { label: "Esans", value: formatMl(batch.essenceVolumeMl) },
          { label: "Alkol", value: formatMl(batch.alcoholVolumeMl) },
          { label: "Su", value: formatMl(batch.waterVolumeMl) },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg p-3 text-center flex flex-col-reverse" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <dt className="text-[10px] mt-0.5" style={{ color: "var(--text-muted-warm)" }}>
              {label}
            </dt>
            <dd className="text-base font-mono" style={{ color: "var(--ivory)" }}>
              {value}
            </dd>
          </div>
        ))}
      </dl>

      {batch.notes && (
        <blockquote
          className="rounded-lg px-4 py-3 text-sm italic leading-relaxed whitespace-pre-line"
          style={{ background: "rgba(201,168,92,0.04)", borderLeft: "2px solid rgba(201,168,92,0.3)", color: "var(--text-muted-warm)" }}
        >
          {batch.notes}
        </blockquote>
      )}
    </article>
  )
}
