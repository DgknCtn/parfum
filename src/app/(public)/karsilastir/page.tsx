import { notFound } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Parfüm Karşılaştırma" }

const genderColors: Record<string, string> = {
  KADIN: "#c026d3", ERKEK: "#2563eb", UNISEX: "#059669", BELIRTILMEMIS: "#6b7280",
}
const genderLabels: Record<string, string> = {
  KADIN: "Kadın", ERKEK: "Erkek", UNISEX: "Unisex", BELIRTILMEMIS: "",
}

async function getPerfume(slug: string) {
  return prisma.perfume.findUnique({
    where: { slug, publicVisible: true },
    include: {
      batches: {
        where: { deletedAt: null },
        orderBy: { productionDate: "desc" },
        select: { batchLabel: true, productionDate: true, totalVolumeMl: true, essenceRatio: true, essenceVolumeMl: true, alcoholVolumeMl: true, waterVolumeMl: true, notes: true },
      },
    },
  })
}

async function getAllPerfumes() {
  return prisma.perfume.findMany({
    where: { publicVisible: true },
    select: { slug: true, name: true },
    orderBy: { name: "asc" },
  })
}

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ a?: string; b?: string }> }) {
  const { a, b } = await searchParams
  if (!a) notFound()

  const [perfumeA, allPerfumes] = await Promise.all([getPerfume(a), getAllPerfumes()])
  if (!perfumeA) notFound()

  const perfumeB = b ? await getPerfume(b) : null
  const latestA = perfumeA.batches[0]
  const latestB = perfumeB?.batches[0] ?? undefined

  type PerfumeType = NonNullable<Awaited<ReturnType<typeof getPerfume>>>
  type BatchType = PerfumeType["batches"][number]

  function PerfumeCol({ p, latest }: { p: PerfumeType; latest: BatchType | undefined }) {
    const color = genderColors[p.genderCategory] ?? "#6b7280"
    const gender = genderLabels[p.genderCategory]
    return (
      <div className="flex-1 min-w-0">
        <div className="rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="h-1" style={{ background: `linear-gradient(90deg, ${color}80, transparent)` }} />
          <div className="p-6 space-y-6">
            {p.brandName && <p className="text-[10px] tracking-[0.4em] uppercase" style={{ color: "var(--gold)" }}>{p.brandName}</p>}
            <div>
              <h2 className="text-2xl leading-tight mb-2" style={{ color: "var(--ivory)", fontFamily: "var(--font-gloock)" }}>{p.name}</h2>
              {gender && (
                <span className="text-xs px-2.5 py-0.5 rounded-full" style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}>
                  {gender}
                </span>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Parti Sayısı", value: String(p.batches.length) },
                { label: "Esans Oranı", value: latest ? `%${(latest.essenceRatio * 100).toFixed(0)}` : "—" },
                { label: "Son Hacim", value: latest ? `${latest.totalVolumeMl} ml` : "—" },
                { label: "Son Üretim", value: latest ? new Date(latest.productionDate).toLocaleDateString("tr-TR", { year: "numeric", month: "short" }) : "—" },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-lg p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <p className="text-xl font-mono" style={{ color: "var(--ivory)" }}>{value}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted-warm)" }}>{label}</p>
                </div>
              ))}
            </div>

            {/* Composition bar */}
            {latest && (
              <div>
                <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: "var(--text-muted-warm)" }}>Kompozisyon</p>
                <div className="flex rounded-full overflow-hidden h-2 mb-2">
                  <div style={{ width: `${(latest.essenceVolumeMl / latest.totalVolumeMl) * 100}%`, background: "var(--gold)" }} />
                  <div style={{ width: `${(latest.alcoholVolumeMl / latest.totalVolumeMl) * 100}%`, background: "rgba(201,168,92,0.35)" }} />
                  <div style={{ width: `${(latest.waterVolumeMl / latest.totalVolumeMl) * 100}%`, background: "rgba(201,168,92,0.12)" }} />
                </div>
                <div className="flex gap-3 text-[10px]" style={{ color: "var(--text-muted-warm)" }}>
                  <span><span style={{ color: "var(--gold)" }}>■</span> {latest.essenceVolumeMl} ml esans</span>
                  <span><span style={{ color: "rgba(201,168,92,0.5)" }}>■</span> {latest.alcoholVolumeMl} ml alkol</span>
                </div>
              </div>
            )}

            {/* Scent notes */}
            {(p.topNotes || p.middleNotes || p.baseNotes) && (
              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-widest" style={{ color: "var(--gold)" }}>Koku Notaları</p>
                {p.topNotes && <p className="text-xs"><span style={{ color: "var(--text-muted-warm)" }}>Üst: </span><span style={{ color: "var(--ivory)" }}>{p.topNotes}</span></p>}
                {p.middleNotes && <p className="text-xs"><span style={{ color: "var(--text-muted-warm)" }}>Orta: </span><span style={{ color: "var(--ivory)" }}>{p.middleNotes}</span></p>}
                {p.baseNotes && <p className="text-xs"><span style={{ color: "var(--text-muted-warm)" }}>Alt: </span><span style={{ color: "var(--ivory)" }}>{p.baseNotes}</span></p>}
              </div>
            )}

            <Link
              href={`/p/${p.slug}`}
              className="block text-center text-xs py-2 px-4 rounded-lg border transition-all hover:border-[var(--gold)] hover:text-[var(--gold)]"
              style={{ borderColor: "rgba(255,255,255,0.1)", color: "var(--text-muted-warm)" }}
            >
              Detay Sayfası →
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-16">
      <Link href="/" className="inline-flex items-center gap-1 text-xs mb-8 transition-colors hover:text-[var(--gold)]" style={{ color: "var(--text-muted-warm)" }}>
        ← Koleksiyona Dön
      </Link>

      <div className="mb-10">
        <p className="text-[10px] tracking-[0.4em] uppercase mb-2" style={{ color: "var(--gold)" }}>Karşılaştırma</p>
        <h1 className="text-3xl" style={{ color: "var(--ivory)", fontFamily: "var(--font-gloock)" }}>
          Parfüm Karşılaştır
        </h1>
      </div>

      {!b ? (
        <div className="rounded-xl p-6 mb-8" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(201,168,92,0.2)" }}>
          <p className="text-sm mb-3" style={{ color: "var(--text-muted-warm)" }}>
            Karşılaştırmak için ikinci bir parfüm seçin:
          </p>
          <div className="flex flex-wrap gap-2">
            {allPerfumes.filter(p => p.slug !== a).map(p => (
              <Link
                key={p.slug}
                href={`/karsilastir?a=${a}&b=${p.slug}`}
                className="text-xs px-3 py-1.5 rounded-full border transition-all hover:border-[var(--gold)] hover:text-[var(--gold)]"
                style={{ borderColor: "rgba(255,255,255,0.1)", color: "var(--text-muted-warm)" }}
              >
                {p.name}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex gap-4 md:gap-6 flex-col md:flex-row">
        <PerfumeCol p={perfumeA} latest={latestA ?? undefined} />

        {/* VS divider */}
        <div className="hidden md:flex flex-col items-center justify-center gap-2 shrink-0">
          <div className="w-px flex-1" style={{ background: "rgba(255,255,255,0.06)" }} />
          <span className="text-xs font-mono px-2 py-1 rounded" style={{ color: "var(--text-muted-warm)", background: "rgba(255,255,255,0.04)" }}>vs</span>
          <div className="w-px flex-1" style={{ background: "rgba(255,255,255,0.06)" }} />
        </div>

        {perfumeB ? (
          <PerfumeCol p={perfumeB} latest={latestB} />
        ) : (
          <div className="flex-1 rounded-xl flex items-center justify-center min-h-[300px]" style={{ border: "2px dashed rgba(255,255,255,0.08)" }}>
            <p className="text-sm" style={{ color: "var(--text-muted-warm)" }}>İkinci parfümü seçin</p>
          </div>
        )}
      </div>
    </div>
  )
}
