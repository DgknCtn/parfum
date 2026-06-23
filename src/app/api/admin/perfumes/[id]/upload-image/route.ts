import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase/server"

async function requireAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  return user
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth()
    const { id } = await params

    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) return NextResponse.json({ error: "Dosya gerekli" }, { status: 400 })
    if (!file.type.startsWith("image/")) return NextResponse.json({ error: "Sadece resim dosyası" }, { status: 400 })
    if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "Max 5 MB" }, { status: 400 })

    const supabase = await createClient()
    const ext = file.name.split(".").pop() ?? "jpg"
    const path = `perfumes/${id}.${ext}`

    const bytes = await file.arrayBuffer()
    const { error: uploadError } = await supabase.storage
      .from("perfume-images")
      .upload(path, bytes, { contentType: file.type, upsert: true })

    if (uploadError) {
      console.error("Upload error:", uploadError)
      return NextResponse.json({ error: "Yükleme başarısız: " + uploadError.message }, { status: 500 })
    }

    const { data } = supabase.storage.from("perfume-images").getPublicUrl(path)
    const publicUrl = data.publicUrl

    await prisma.perfume.update({
      where: { id },
      data: { coverImageUrl: publicUrl },
    })

    return NextResponse.json({ url: publicUrl })
  } catch (err) {
    if ((err as Error).message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    return NextResponse.json({ error: "Hata oluştu" }, { status: 500 })
  }
}
