import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase/server"
import { z } from "zod"

async function requireAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
}

const UpdateSchema = z.object({
  name: z.string().min(1).optional(),
  brandName: z.string().optional(),
  genderCategory: z.enum(["KADIN", "ERKEK", "UNISEX", "BELIRTILMEMIS"]).optional(),
  description: z.string().optional(),
  publicVisible: z.boolean().optional(),
  notes: z.string().optional(),
  topNotes: z.string().optional(),
  middleNotes: z.string().optional(),
  baseNotes: z.string().optional(),
  agingDays: z.number().int().min(0).optional(),
})

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth()
    const { id } = await params
    const perfume = await prisma.perfume.findUniqueOrThrow({
      where: { id },
      include: {
        batches: {
          where: { deletedAt: null },
          orderBy: { productionDate: "desc" },
          include: { essence: { select: { id: true, name: true, currentVolumeMl: true, status: true } } },
        },
      },
    })
    return NextResponse.json(perfume)
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth()
    const { id } = await params
    const body = await request.json()
    const data = UpdateSchema.parse(body)
    const perfume = await prisma.perfume.update({ where: { id }, data })
    return NextResponse.json(perfume)
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 })
    return NextResponse.json({ error: "Error" }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth()
    const { id } = await params
    await prisma.perfume.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Error" }, { status: 500 })
  }
}
