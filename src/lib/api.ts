import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { z } from "zod"

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message)
  }
}

/** Tüm admin/public route'lar için ortak hata dönüştürücü. Teknik olmayan Türkçe mesaj döner. */
export function apiError(err: unknown) {
  if (err instanceof HttpError) {
    return NextResponse.json({ error: err.message, ...(err.details ?? {}) }, { status: err.status })
  }
  if (err instanceof z.ZodError) {
    const first = err.issues[0]
    const field = first?.path.join(".")
    return NextResponse.json(
      { error: field ? `Geçersiz alan: ${field} — ${first.message}` : "Geçersiz istek", issues: err.issues },
      { status: 400 }
    )
  }
  if (err instanceof SyntaxError) {
    return NextResponse.json({ error: "İstek gövdesi okunamadı" }, { status: 400 })
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2025") return NextResponse.json({ error: "Kayıt bulunamadı" }, { status: 404 })
    if (err.code === "P2003")
      return NextResponse.json({ error: "Bu kayda bağlı başka kayıtlar olduğu için işlem yapılamadı" }, { status: 409 })
    if (err.code === "P2002") return NextResponse.json({ error: "Bu değer zaten kullanılıyor" }, { status: 409 })
  }
  console.error(err)
  return NextResponse.json({ error: "Beklenmeyen bir hata oluştu" }, { status: 500 })
}

/** Query string'den güvenli pozitif tamsayı okur. */
export function parsePositiveInt(value: string | null, fallback: number, max = 10_000): number {
  const n = Number.parseInt(value ?? "", 10)
  if (!Number.isFinite(n) || n < 1) return fallback
  return Math.min(n, max)
}
