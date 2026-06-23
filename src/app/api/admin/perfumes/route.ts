import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase/server"
import { generateSlug } from "@/lib/slug"
import { z } from "zod"

const PerfumeSchema = z.object({
  name: z.string().min(1),
  brandName: z.string().optional(),
  genderCategory: z.enum(["KADIN", "ERKEK", "UNISEX", "BELIRTILMEMIS"]).default("BELIRTILMEMIS"),
  description: z.string().optional(),
  publicVisible: z.boolean().default(false),
  notes: z.string().optional(),
})

async function requireAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  return user
}

export async function GET(request: Request) {
  try {
    await requireAuth()
    const { searchParams } = new URL(request.url)
    const gender = searchParams.get("gender")
    const search = searchParams.get("search")

    const perfumes = await prisma.perfume.findMany({
      where: {
        ...(gender ? { genderCategory: gender as never } : {}),
        ...(search ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { brandName: { contains: search, mode: "insensitive" } }] } : {}),
      },
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { batches: { where: { deletedAt: null } } } } },
    })
    return NextResponse.json(perfumes)
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}

export async function POST(request: Request) {
  try {
    await requireAuth()
    const body = await request.json()
    const data = PerfumeSchema.parse(body)

    let slug = generateSlug(data.name)
    const existing = await prisma.perfume.findUnique({ where: { slug } })
    if (existing) slug = `${slug}-${Date.now()}`

    const perfume = await prisma.perfume.create({ data: { ...data, slug } })
    return NextResponse.json(perfume, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 })
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}
