import Link from "next/link"
import type { Metadata } from "next"
import { prisma } from "@/lib/prisma"
import { publicPerfumeWhere, getPublicPerfume, formatBatchDate, formatRatio, formatMl } from "@/lib/catalog"
import { GenderBadge, StockBadge, GENDER_COLOR } from "@/components/public/Badges"

export const metadata: Metadata = { title: "Parfüm Karşılaştırma", robots: { index: false, follow: true } }

type Perfume = NonNullable<Awaited<ReturnType<typeof getPublicPerfume>>>

function PerfumeCol({ p }: { p: Perfume }) {
  const latest = p.batches[0]
  const color = GENDER_COLOR[p.genderCategory]
  const sum = latest ? latest.essenceVolumeMl + latest.alcoholVolumeMl + latest.waterVolumeMl || latest.totalVolumeMl : 1
  const parts = latest
    ? [
        { label: "esans", ml: latest.essenceVolumeMl, color: "var(--gold)" },
        { label: "alkol", ml: latest.alcoholVolumeMl, color: "rgba(201,168,92,0.4)" },
        { label: "su", ml: latest.waterVolumeMl, color: "rgba(201,168,92,0.15)" },
      ]
    : []
  return (
    <div className="flex-1 min-w-0">
      <div className="rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="h-1" style={{ background: `linear-gradient(90deg, ${color}80, transparent)` }} />
        <div className="p-5 sm:p-6 space-y-6">
          <div>
            {p.brandName && (
              <p className="text-[10px] tracking-[0.4em] uppercase mb-1" style={{ color: "var(--gold)" }}>
                {p.brandName}
              </p>
            )}
            <h2 className="text-2xl leading-tight mb-2 break-words" style={{ color: "var(--ivory)", fontFamily: "var(--font-gloock)" }}>
              {p.name}
            </h2>
            <div className="flex gap-2 flex-wrap">
              <GenderBadge gender={p.genderCategory} />
              <StockBadge stock={p.stock} />
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-3">
            {[
              { label: "Parti Sayısı", value: String(p.batches.length) },
              { label: "Esans Oranı", value: latest ? formatRatio(latest.essenceRatio) : "—" },
              { label: "Son Hacim", value: latest ? formatMl(latest.totalVolumeMl) : "—" },
              { label: "Son Üretim", value: latest ? formatBatchDate(latest, { year: "numeric", month: "short" }) : "—" },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-lg p-3 flex flex-col-reverse" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <dt className="text-[10px] mt-0.5" style={{ color: "var(--text-muted-warm)" }}>
                  {label}
                </dt>
                <dd className="text-lg font-mono" style={{ color: "var(--ivory)" }}>
                  {value}
                </dd>
              </div>
            ))}
          </dl>

          {latest && (
            <div>
              <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: "var(--text-muted-warm)" }}>
                Kompozisyon (son parti)
              </p>
              <div className="flex rounded-full overflow-hidden h-2 mb-2" role="img" aria-label={parts.map((x) => `${formatMl(x.ml)} ${x.label}`).join(", ")}>
                {parts.map((x) => (
                  <div key={x.label} style={{ width: `${(x.ml / sum) * 100}%`, background: x.color }} />
                ))}
              </div>
              <div className="flex gap-3 flex-wrap text-[11px]" style={{ color: "var(--text-muted-warm)" }}>
                {parts.map((x) => (
                  <span key={x.label}>
                    <span aria-hidden style={{ color: x.color }}>
                      ■
                    </span>{" "}
                    {formatMl(x.ml)} {x.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {(p.topNotes || p.middleNotes || p.baseNotes) && (
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-widest" style={{ color: "var(--gold)" }}>
                Koku Notaları
              </p>
              {[
                ["Üst", p.topNotes],
                ["Orta", p.middleNotes],
                ["Alt", p.baseNotes],
              ]
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <p key={k} className="text-xs">
                    <span style={{ color: "var(--text-muted-warm)" }}>{k}: </span>
                    <span style={{ color: "var(--ivory)" }}>{v}</span>
                  </p>
                ))}
            </div>
          )}

          <Link
            href={`/p/${p.slug}`}
            className="block text-center text-xs py-2 px-4 rounded-lg border transition-all hover:border-[var(--gold)] hover:text-[var(--gold)]"
            style={{ borderColor: "rgba(255,255,255,0.12)", color: "var(--text-muted-warm)" }}
          >
            Detay Sayfası →
          </Link>
        </div>
      </div>
    </div>
  )
}

const selectCls = "w-full rounded-lg px-3 py-2 text-sm bg-white/[0.05] border border-white/15 focus:border-[var(--gold)] outline-none"

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ a?: string; b?: string }> }) {
  const { a, b } = await searchParams
  const [all, perfumeA, perfumeB] = await Promise.all([
    prisma.perfume.findMany({ where: publicPerfumeWhere, select: { slug: true, name: true, brandName: true }, orderBy: { name: "asc" } }),
    a ? getPublicPerfume(a) : null,
    b ? getPublicPerfume(b) : null,
  ])
  const label = (p: { name: string; brandName: string | null }) => (p.brandName ? `${p.brandName} — ${p.name}` : p.name)

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 md:py-16">
      <Link href="/" className="inline-flex items-center gap-1 text-xs mb-8 py-1 transition-colors hover:text-[var(--gold)]" style={{ color: "var(--text-muted-warm)" }}>
        ← Koleksiyona Dön
      </Link>

      <div className="mb-8">
        <p className="text-[10px] tracking-[0.4em] uppercase mb-2" style={{ color: "var(--gold)" }}>
          Karşılaştırma
        </p>
        <h1 className="text-3xl" style={{ color: "var(--ivory)", fontFamily: "var(--font-gloock)" }}>
          Parfüm Karşılaştır
        </h1>
      </div>

      {/* JS gerektirmeyen seçici */}
      <form method="get" action="/karsilastir" className="rounded-xl p-4 sm:p-5 mb-8 grid gap-3 sm:grid-cols-[1fr_1fr_auto] items-end" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(201,168,92,0.2)" }}>
        {(["a", "b"] as const).map((key, i) => (
          <div key={key}>
            <label htmlFor={`sel-${key}`} className="block text-[11px] mb-1" style={{ color: "var(--text-muted-warm)" }}>
              {i === 0 ? "Birinci parfüm" : "İkinci parfüm"}
            </label>
            <select id={`sel-${key}`} name={key} defaultValue={(key === "a" ? perfumeA?.slug : perfumeB?.slug) ?? ""} className={selectCls} style={{ color: "var(--ivory)", colorScheme: "dark" }} required>
              <option value="" disabled>
                Seçin...
              </option>
              {all.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {label(p)}
                </option>
              ))}
            </select>
          </div>
        ))}
        <button type="submit" className="rounded-lg px-4 py-2 text-xs tracking-widest uppercase font-semibold" style={{ background: "var(--gold)", color: "var(--obsidian)" }}>
          Karşılaştır
        </button>
      </form>

      {(a && !perfumeA) || (b && !perfumeB) ? (
        <p className="text-sm mb-6" role="alert" style={{ color: "#fca5a5" }}>
          Seçilen parfümlerden biri bulunamadı veya artık yayında değil.
        </p>
      ) : null}

      <div className="flex gap-4 md:gap-6 flex-col md:flex-row">
        {perfumeA ? (
          <PerfumeCol p={perfumeA} />
        ) : (
          <Placeholder text="Birinci parfümü seçin" />
        )}
        <div className="hidden md:flex flex-col items-center justify-center gap-2 shrink-0" aria-hidden>
          <div className="w-px flex-1" style={{ background: "rgba(255,255,255,0.06)" }} />
          <span className="text-xs font-mono px-2 py-1 rounded" style={{ color: "var(--text-muted-warm)", background: "rgba(255,255,255,0.04)" }}>
            vs
          </span>
          <div className="w-px flex-1" style={{ background: "rgba(255,255,255,0.06)" }} />
        </div>
        {perfumeB ? <PerfumeCol p={perfumeB} /> : <Placeholder text="İkinci parfümü seçin" />}
      </div>
    </div>
  )
}

function Placeholder({ text }: { text: string }) {
  return (
    <div className="flex-1 rounded-xl flex items-center justify-center min-h-[200px] md:min-h-[300px]" style={{ border: "2px dashed rgba(255,255,255,0.1)" }}>
      <p className="text-sm" style={{ color: "var(--text-muted-warm)" }}>
        {text}
      </p>
    </div>
  )
}
