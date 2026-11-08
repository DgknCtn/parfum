/**
 * Basit, instance başına bellek içi sabit pencere hız sınırlayıcı.
 * Fluid Compute instance'ları yeniden kullandığı için kötüye kullanımı büyük ölçüde keser;
 * kesin global limit için Vercel Firewall rate-limit kuralı önerilir (README'ye bakın).
 */
const buckets = new Map<string, { count: number; reset: number }>()

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfter: number } {
  const now = Date.now()
  if (buckets.size > 10_000) {
    for (const [k, v] of buckets) if (v.reset < now) buckets.delete(k)
  }
  const b = buckets.get(key)
  if (!b || b.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs })
    return { ok: true, retryAfter: 0 }
  }
  b.count++
  return { ok: b.count <= limit, retryAfter: Math.ceil((b.reset - now) / 1000) }
}

export function clientIp(request: Request): string {
  return request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
}
