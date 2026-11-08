import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase/server"
import { requireAdmin, actorOf } from "@/lib/auth"
import { apiError, HttpError } from "@/lib/api"
import { logActivity } from "@/lib/activity"
import { revalidateCatalog } from "@/lib/revalidate"
import { rateLimit } from "@/lib/rate-limit"

const MAX_BYTES = 5 * 1024 * 1024

/** Dosya içeriğinin ilk baytlarından gerçek türü tespit eder (istemcinin MIME beyanına güvenilmez). SVG kabul edilmez. */
function sniffImageType(b: Uint8Array): { mime: string; ext: string } | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { mime: "image/jpeg", ext: "jpg" }
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { mime: "image/png", ext: "png" }
  if (
    b.length >= 12 &&
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
  )
    return { mime: "image/webp", ext: "webp" }
  return null
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAdmin()
    if (!rateLimit(`upload:${user.id}`, 20, 60_000).ok) throw new HttpError(429, "Çok fazla yükleme. Bir dakika sonra tekrar deneyin.")
    const { id } = await params

    const perfume = await prisma.perfume.findFirst({ where: { id, deletedAt: null }, select: { id: true, name: true } })
    if (!perfume) throw new HttpError(404, "Parfüm bulunamadı")

    const formData = await request.formData()
    const file = formData.get("file")
    if (!(file instanceof File)) throw new HttpError(400, "Dosya gerekli")
    if (file.size > MAX_BYTES) throw new HttpError(400, "Dosya en fazla 5 MB olabilir")

    const bytes = new Uint8Array(await file.arrayBuffer())
    const type = sniffImageType(bytes)
    if (!type) throw new HttpError(400, "Sadece JPG, PNG veya WEBP görsel yükleyebilirsiniz")

    // Her yüklemede yeni yol → CDN/tarayıcı önbelleği eski görseli göstermez.
    const path = `perfumes/${id}-${Date.now()}.${type.ext}`
    const supabase = await createClient()
    const { error: uploadError } = await supabase.storage
      .from("perfume-images")
      .upload(path, bytes, { contentType: type.mime, upsert: false, cacheControl: "31536000" })
    if (uploadError) {
      console.error("Upload error:", uploadError)
      throw new HttpError(502, "Görsel yüklenemedi, lütfen tekrar deneyin")
    }

    const { data } = supabase.storage.from("perfume-images").getPublicUrl(path)
    const old = await prisma.perfume.findUnique({ where: { id }, select: { coverImageUrl: true } })
    await prisma.perfume.update({ where: { id }, data: { coverImageUrl: data.publicUrl } })

    // Eski görseli temizle (başarısız olsa da sorun değil)
    const marker = "/perfume-images/"
    if (old?.coverImageUrl?.includes(marker)) {
      const oldPath = old.coverImageUrl.split(marker)[1]?.split("?")[0]
      if (oldPath && oldPath !== path) await supabase.storage.from("perfume-images").remove([oldPath]).catch(() => {})
    }

    await logActivity(prisma, {
      action: "perfume_image_uploaded",
      entityType: "perfume",
      entityId: id,
      message: `${perfume.name} için kapak görseli yüklendi.`,
      actor: actorOf(user),
    })
    revalidateCatalog()
    return NextResponse.json({ url: data.publicUrl })
  } catch (err) {
    return apiError(err)
  }
}
