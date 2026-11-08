import { NextResponse } from "next/server"
import { getCatalog, formatRatio, formatMl, STOCK_LABEL, GENDER_LABEL } from "@/lib/catalog"
import { parseCatalogParams } from "@/lib/schemas"
import { apiError, parsePositiveInt } from "@/lib/api"
import { rateLimit, clientIp } from "@/lib/rate-limit"

export const dynamic = "force-dynamic"

/** GET /api/public/perfumes?gender=ERKEK&stock=available&q=sauvage&sort=name&page=1 */
export async function GET(request: Request) {
  try {
    const rl = rateLimit(`public:${clientIp(request)}`, 60, 60_000)
    if (!rl.ok)
      return NextResponse.json({ error: "Çok fazla istek. Lütfen biraz sonra tekrar deneyin." }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } })
    const { searchParams } = new URL(request.url)
    const params = parseCatalogParams(Object.fromEntries(searchParams.entries()))
    const page = parsePositiveInt(searchParams.get("page"), 1, 1000)
    const pageSize = 24

    const all = await getCatalog(params)
    const items = all.slice((page - 1) * pageSize, page * pageSize).map((p) => ({
      id: p.id,
      name: p.name,
      brandName: p.brandName,
      slug: p.slug,
      genderCategory: GENDER_LABEL[p.genderCategory],
      stockStatus: p.stock ? STOCK_LABEL[p.stock] : null,
      latestBatchDate: p.latestBatchDate?.toISOString().slice(0, 10) ?? null,
      summary: p.latestBatch
        ? `${formatRatio(p.latestBatch.essenceRatio)} esans oranı ile üretilmiş ${formatMl(p.latestBatch.totalVolumeMl)} reçete`
        : null,
    }))

    return NextResponse.json({ items, total: all.length, page, pageSize, pages: Math.max(1, Math.ceil(all.length / pageSize)) })
  } catch (err) {
    return apiError(err)
  }
}
