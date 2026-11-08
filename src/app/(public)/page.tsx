import Link from "next/link"
import Image from "next/image"
import type { Metadata } from "next"
import { getCatalog, formatRatio, formatMl, GENDER_LABEL, STOCK_LABEL, type CatalogItem } from "@/lib/catalog"
import { parseCatalogParams, type CatalogParams } from "@/lib/schemas"
import { SearchInput } from "@/components/public/SearchInput"
import { GenderBadge, StockBadge, GENDER_COLOR } from "@/components/public/Badges"
import { getCatalogSettings } from "@/lib/settings"

type SP = Promise<Record<string, string | string[] | undefined>>

export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  const p = parseCatalogParams(await searchParams)
  const title = p.gender ? `${GENDER_LABEL[p.gender]} Parfümler` : "Parfüm Kataloğu"
  return {
    title: p.q ? `"${p.q}" araması` : title,
    description: p.gender
      ? `${GENDER_LABEL[p.gender]} kategorisindeki el yapımı parfümler, detaylı reçete oranlarıyla.`
      : undefined,
    alternates: { canonical: p.gender ? `/?gender=${p.gender}` : "/" },
    // Arama ve kombinasyon filtreleri indekslenmesin
    robots: p.q || p.stock || p.sortProvided ? { index: false, follow: true } : undefined,
  }
}

/** Mevcut filtreleri koruyarak yalnızca verilen alanları değiştiren link üretir. */
function catalogHref(params: Omit<CatalogParams, "sortProvided">, patch: Partial<Record<"gender" | "stock" | "sort" | "q", string | undefined>>) {
  const merged: Record<string, string | undefined> = {
    gender: params.gender,
    stock: params.stock,
    sort: params.sort,
    q: params.q,
    ...patch,
  }
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(merged)) if (v) sp.set(k, v)
  const s = sp.toString()
  return s ? `/?${s}` : "/"
}

function Pill({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "page" : undefined}
      className="px-3.5 py-1.5 rounded-full text-xs tracking-wide transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)]"
      style={{
        background: active ? "var(--gold)" : "rgba(255,255,255,0.05)",
        color: active ? "var(--obsidian)" : "var(--text-muted-warm)",
        border: active ? "1px solid var(--gold)" : "1px solid rgba(255,255,255,0.12)",
        fontWeight: active ? 600 : 400,
      }}
    >
      {children}
    </Link>
  )
}

function emptyMessage(p: Omit<CatalogParams, "sortProvided">) {
  if (p.q) return `"${p.q}" ile eşleşen kayıt bulunamadı.`
  if (p.gender && !p.stock) return `${GENDER_LABEL[p.gender]} kategorisinde henüz public parfüm yok.`
  if (p.gender || p.stock) return "Bu filtreye uygun parfüm bulunamadı."
  return "Henüz yayında parfüm yok."
}

export default async function CatalogPage({ searchParams }: { searchParams: SP }) {
  const settings = await getCatalogSettings()
  const parsed = parseCatalogParams(await searchParams)
  const params = parsed.sortProvided ? parsed : { ...parsed, sort: settings.defaultSort }
  const perfumes = await getCatalog(params)
  const titleWords = settings.heroTitle.trim().split(/\s+/)
  const titleLast = titleWords.length > 1 ? titleWords.pop() : null
  const filtered = !!(params.gender || params.q || params.stock)

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden py-8 md:py-20 px-4 sm:px-6">
        <div
          className="absolute inset-0 opacity-20"
          style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(201,168,92,0.3) 0%, transparent 70%)" }}
        />
        <div className="relative max-w-6xl mx-auto text-center">
          {settings.heroEyebrow && (
            <p className="text-[10px] tracking-[0.5em] uppercase mb-3" style={{ color: "var(--gold)" }}>
              {settings.heroEyebrow}
            </p>
          )}
          <h1
            className="text-4xl md:text-7xl mb-3 md:mb-6"
            style={{ color: "var(--ivory)", fontFamily: "var(--font-gloock)", lineHeight: 1.05, letterSpacing: "-0.02em" }}
          >
            {titleWords.join(" ")} {titleLast && <span style={{ color: "var(--gold)" }}>{titleLast}</span>}
          </h1>
          {settings.heroSubtitle && (
            <p className="text-sm max-w-md mx-auto hidden sm:block" style={{ color: "var(--text-muted-warm)", lineHeight: 1.7 }}>
              {settings.heroSubtitle}
            </p>
          )}
        </div>
      </section>

      {/* Filters */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-6 space-y-3" aria-label="Filtreler">
        <SearchInput key={params.q ?? ""} defaultValue={params.q} />

        <div className="flex items-center gap-2 flex-wrap" role="group" aria-label="Cinsiyet">
          {[
            { label: "Tümü", value: undefined },
            { label: "Kadın", value: "KADIN" },
            { label: "Erkek", value: "ERKEK" },
            { label: "Unisex", value: "UNISEX" },
          ].map((f) => (
            <Pill key={f.label} href={catalogHref(params, { gender: f.value })} active={params.gender === f.value}>
              {f.label}
            </Pill>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap" role="group" aria-label="Stok durumu">
          <Pill href={catalogHref(params, { stock: undefined })} active={!params.stock}>
            Tüm stoklar
          </Pill>
          {(["available", "low", "out"] as const).map((s) => (
            <Pill key={s} href={catalogHref(params, { stock: s })} active={params.stock === s}>
              {s === "available" ? "Stokta var" : STOCK_LABEL[s]}
            </Pill>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
          <p className="text-xs" style={{ color: "var(--text-muted-warm)" }} aria-live="polite">
            {perfumes.length} parfüm
          </p>
          <nav className="flex items-center gap-1 text-xs flex-wrap" aria-label="Sıralama">
            <span style={{ color: "var(--text-muted-warm)" }}>Sırala:</span>
            {(
              [
                ["newest", "En yeni"],
                ["name", "Ada göre"],
                ["gender", "Cinsiyet"],
                ["stock", "Stok"],
              ] as const
            ).map(([value, label]) => {
              const active = params.sort === value
              return (
                <Link
                  key={value}
                  href={catalogHref(params, { sort: value })}
                  scroll={false}
                  aria-current={active ? "true" : undefined}
                  className="px-2 py-1 rounded focus-visible:outline-2 focus-visible:outline-[var(--gold)]"
                  style={{ color: active ? "var(--gold)" : "var(--text-muted-warm)", fontWeight: active ? 600 : 400, textDecoration: active ? "underline" : "none", textUnderlineOffset: 4 }}
                >
                  {label}
                </Link>
              )
            })}
          </nav>
        </div>
      </section>

      {/* Grid */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-24">
        {perfumes.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-3xl mb-4" style={{ fontFamily: "var(--font-gloock)", color: "var(--ivory)" }}>
              Parfüm Bulunamadı
            </p>
            <p className="text-sm" style={{ color: "var(--text-muted-warm)" }}>
              {emptyMessage(params)}
            </p>
            {filtered && (
              <Link href="/" className="text-sm mt-4 inline-block" style={{ color: "var(--gold)" }}>
                Tüm koleksiyonu gör →
              </Link>
            )}
          </div>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {perfumes.map((p, i) => (
              <li key={p.id}>
                <PerfumeCard p={p} priority={i < 3} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function PerfumeCard({ p, priority }: { p: CatalogItem; priority: boolean }) {
  const latest = p.latestBatch
  const color = GENDER_COLOR[p.genderCategory]
  return (
    <div className="relative group h-full">
      <article
        className="h-full rounded-xl overflow-hidden transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-2xl group-focus-within:ring-1 group-focus-within:ring-[var(--gold)]"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        {p.coverImageUrl ? (
          <div className="relative w-full h-36">
            <Image
              src={p.coverImageUrl}
              alt=""
              fill
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover"
              priority={priority}
            />
          </div>
        ) : (
          <div className="h-1" style={{ background: `linear-gradient(90deg, ${color}80, transparent)` }} />
        )}

        <div className="p-5 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              {p.brandName && (
                <p className="text-[10px] tracking-widest uppercase mb-0.5 truncate" style={{ color: "var(--text-muted-warm)" }}>
                  {p.brandName}
                </p>
              )}
              <h2
                className="text-base leading-snug group-hover:text-[var(--gold)] transition-colors line-clamp-2 break-words"
                style={{ color: "var(--ivory)", fontFamily: "var(--font-gloock)" }}
              >
                {/* Kartın tamamını kaplayan link (erişilebilir ad = parfüm adı) */}
                <Link href={`/p/${p.slug}`} className="after:absolute after:inset-0 after:z-10 focus-visible:outline-none">
                  {p.name}
                </Link>
              </h2>
            </div>
            <div className="flex flex-col items-end gap-1">
              <GenderBadge gender={p.genderCategory} />
              <StockBadge stock={p.stock} />
            </div>
          </div>

          <div className="h-px" style={{ background: "rgba(255,255,255,0.06)" }} />

          {latest ? (
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-lg font-mono" style={{ color: "var(--gold)" }}>
                  {formatRatio(latest.essenceRatio)}
                </p>
                <p className="text-[10px]" style={{ color: "var(--text-muted-warm)" }}>
                  esans
                </p>
              </div>
              <div className="h-8 w-px" style={{ background: "rgba(255,255,255,0.06)" }} />
              <div className="text-center">
                <p className="text-lg font-mono" style={{ color: "var(--ivory)" }}>
                  {formatMl(latest.totalVolumeMl)}
                </p>
                <p className="text-[10px]" style={{ color: "var(--text-muted-warm)" }}>
                  toplam
                </p>
              </div>
              <div className="ml-auto text-right min-w-0">
                <p className="text-[11px] truncate" style={{ color: "var(--text-muted-warm)" }}>
                  {latest.batchLabel}
                </p>
                {p.latestBatchDate && (
                  <p className="text-[11px]" style={{ color: "var(--text-muted-warm)" }}>
                    {p.latestBatchDate.toLocaleDateString("tr-TR", { year: "numeric", month: "short", timeZone: "Europe/Istanbul" })}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-xs" style={{ color: "var(--text-muted-warm)" }}>
              Reçete bilgisi henüz paylaşılmadı
            </p>
          )}

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] tracking-wider uppercase" style={{ color: "var(--gold)" }} aria-hidden="true">
              Detaylar →
            </span>
          </div>
        </div>
      </article>
      <Link
        href={`/karsilastir?a=${p.slug}`}
        className="absolute bottom-4 right-4 z-20 text-[11px] px-2 py-1 rounded border transition-all hover:border-[var(--gold)] hover:text-[var(--gold)] focus-visible:outline-2 focus-visible:outline-[var(--gold)]"
        style={{ borderColor: "rgba(255,255,255,0.2)", color: "var(--text-muted-warm)", background: "rgba(0,0,0,0.4)" }}
        aria-label={`${p.name} parfümünü karşılaştır`}
      >
        ↔ Karşılaştır
      </Link>
    </div>
  )
}
