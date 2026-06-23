import Link from "next/link"
import { Suspense } from "react"
import { prisma } from "@/lib/prisma"
import { SearchInput } from "@/components/public/SearchInput"

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

interface SearchParams {
  gender?: string
  q?: string
  status?: string
}

async function getPerfumes(searchParams: SearchParams) {
  return prisma.perfume.findMany({
    where: {
      publicVisible: true,
      ...(searchParams.gender ? { genderCategory: searchParams.gender as never } : {}),
      ...(searchParams.q
        ? {
            OR: [
              { name: { contains: searchParams.q, mode: "insensitive" } },
              { brandName: { contains: searchParams.q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ latestBatchDate: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      brandName: true,
      genderCategory: true,
      description: true,
      slug: true,
      latestBatchDate: true,
      batches: {
        where: { publicVisible: true, deletedAt: null },
        orderBy: { productionDate: "desc" },
        take: 1,
        select: { essenceRatio: true, totalVolumeMl: true, batchLabel: true },
      },
    },
  })
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const perfumes = await getPerfumes(params)

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden py-24 px-6">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            background: "radial-gradient(ellipse at 50% 0%, rgba(201,168,92,0.3) 0%, transparent 70%)",
          }}
        />
        <div className="relative max-w-6xl mx-auto text-center">
          <p
            className="text-[10px] tracking-[0.5em] uppercase mb-4"
            style={{ color: "var(--gold)" }}
          >
            El Yapımı Koleksiyon
          </p>
          <h1
            className="text-5xl md:text-7xl mb-6"
            style={{
              color: "var(--ivory)",
              fontFamily: "var(--font-gloock)",
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
            }}
          >
            Parfüm
            <br />
            <span style={{ color: "var(--gold)" }}>Kataloğu</span>
          </h1>
          <p className="text-sm max-w-md mx-auto" style={{ color: "var(--text-muted-warm)", lineHeight: 1.7 }}>
            Özenle hazırlanmış el yapımı parfümler. Detaylı reçete oranları ve üretim notlarıyla.
          </p>
        </div>
      </section>

      {/* Filters */}
      <section className="max-w-6xl mx-auto px-6 pb-8">
        <div className="flex items-center gap-3 flex-wrap mb-4">
          <Suspense fallback={null}>
            <SearchInput defaultValue={params.q} />
          </Suspense>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { label: "Tümü", gender: undefined },
            { label: "Kadın", gender: "KADIN" },
            { label: "Erkek", gender: "ERKEK" },
            { label: "Unisex", gender: "UNISEX" },
          ].map((f) => {
            const active = (params.gender ?? undefined) === f.gender
            return (
              <Link
                key={f.label}
                href={f.gender ? `/?gender=${f.gender}` : "/"}
                className="px-4 py-1.5 rounded-full text-xs tracking-wide transition-all"
                style={{
                  background: active ? "var(--gold)" : "rgba(255,255,255,0.05)",
                  color: active ? "var(--obsidian)" : "var(--text-muted-warm)",
                  border: active ? "1px solid var(--gold)" : "1px solid rgba(255,255,255,0.1)",
                  fontWeight: active ? 600 : 400,
                }}
              >
                {f.label}
              </Link>
            )
          })}
        </div>
      </section>

      {/* Grid */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        {perfumes.length === 0 ? (
          <div className="py-24 text-center">
            <p className="text-4xl mb-4" style={{ fontFamily: "var(--font-gloock)", color: "var(--ivory)" }}>
              Parfüm Bulunamadı
            </p>
            <p className="text-sm" style={{ color: "var(--text-muted-warm)" }}>
              {params.q
                ? `"${params.q}" ile eşleşen parfüm bulunamadı.`
                : params.gender
                  ? `${genderLabels[params.gender]} kategorisinde henüz parfüm yok.`
                  : "Henüz hiç parfüm eklenmemiş."}
            </p>
            {(params.gender || params.q) && (
              <Link href="/" className="text-sm mt-4 inline-block" style={{ color: "var(--gold)" }}>
                Tüm koleksiyonu gör →
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {perfumes.map((p) => {
              const latestBatch = p.batches[0]
              const gender = p.genderCategory
              const color = genderColors[gender] ?? "#6b7280"
              const label = genderLabels[gender]

              return (
                <Link key={p.id} href={`/p/${p.slug}`}>
                  <article
                    className="group rounded-xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl cursor-pointer"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    {/* Card top accent */}
                    <div className="h-1" style={{ background: `linear-gradient(90deg, ${color}80, transparent)` }} />

                    <div className="p-5 space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          {p.brandName && (
                            <p className="text-[10px] tracking-widest uppercase mb-0.5 truncate" style={{ color: "var(--text-muted-warm)" }}>
                              {p.brandName}
                            </p>
                          )}
                          <h2
                            className="text-base leading-snug group-hover:text-[var(--gold)] transition-colors truncate"
                            style={{ color: "var(--ivory)", fontFamily: "var(--font-gloock)" }}
                          >
                            {p.name}
                          </h2>
                        </div>
                        {label && (
                          <span
                            className="shrink-0 text-[10px] px-2 py-0.5 rounded-full"
                            style={{
                              background: `${color}18`,
                              color,
                              border: `1px solid ${color}30`,
                            }}
                          >
                            {label}
                          </span>
                        )}
                      </div>

                      {/* Divider */}
                      <div className="h-px" style={{ background: "rgba(255,255,255,0.05)" }} />

                      {/* Formula preview */}
                      {latestBatch ? (
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <p className="text-lg font-mono" style={{ color: "var(--gold)" }}>
                              %{(latestBatch.essenceRatio * 100).toFixed(0)}
                            </p>
                            <p className="text-[10px]" style={{ color: "var(--text-muted-warm)" }}>esans</p>
                          </div>
                          <div className="h-8 w-px" style={{ background: "rgba(255,255,255,0.05)" }} />
                          <div className="text-center">
                            <p className="text-lg font-mono" style={{ color: "var(--ivory)" }}>
                              {latestBatch.totalVolumeMl}
                            </p>
                            <p className="text-[10px]" style={{ color: "var(--text-muted-warm)" }}>ml</p>
                          </div>
                          <div className="ml-auto text-right">
                            <p className="text-[10px]" style={{ color: "var(--text-muted-warm)" }}>
                              {latestBatch.batchLabel}
                            </p>
                            {p.latestBatchDate && (
                              <p className="text-[10px]" style={{ color: "var(--text-muted-warm)" }}>
                                {new Date(p.latestBatchDate).toLocaleDateString("tr-TR", { year: "numeric", month: "short" })}
                              </p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs" style={{ color: "var(--text-muted-warm)" }}>Reçete bilgisi yok</p>
                      )}

                      {/* CTA */}
                      <div
                        className="flex items-center justify-between pt-1 text-[11px] tracking-wider uppercase opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ color: "var(--gold)" }}
                      >
                        <span>Detayları İncele</span>
                        <span>→</span>
                      </div>
                    </div>
                  </article>
                </Link>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
