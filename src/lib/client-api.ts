"use client"

export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string; body: Record<string, unknown> }

/** Admin istemci fetch yardımcısı: JSON gövde, Türkçe hata mesajı ve 401'de girişe yönlendirme. */
export async function api<T = unknown>(url: string, init?: Omit<RequestInit, "body"> & { json?: unknown; body?: BodyInit }): Promise<ApiResult<T>> {
  try {
    const { json, ...rest } = init ?? {}
    const res = await fetch(url, {
      ...rest,
      ...(json !== undefined ? { body: JSON.stringify(json), headers: { "Content-Type": "application/json", ...(rest.headers ?? {}) } } : {}),
    })
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>
    if (res.ok) return { ok: true, data: body as T }
    if (res.status === 401 && typeof window !== "undefined") window.location.href = "/login"
    return { ok: false, status: res.status, error: typeof body.error === "string" ? body.error : "İşlem başarısız oldu", body }
  } catch {
    return { ok: false, status: 0, error: "Sunucuya ulaşılamadı. İnternet bağlantını kontrol et.", body: {} }
  }
}

export const fmtMl = (n: number) => `${(Math.round(n * 100) / 100).toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ml`
export const fmtPct = (ratio: number) => `%${(Math.round(ratio * 1000) / 10).toLocaleString("tr-TR", { maximumFractionDigits: 1 })}`
export const fmtDate = (d: string | Date, unknown?: boolean | null) =>
  unknown ? "Tarih bilinmiyor" : new Date(d).toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul" })
export const todayIstanbul = () => new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Istanbul" })
