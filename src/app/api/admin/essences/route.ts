import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase/server"
import { computeStockStatus } from "@/lib/stock-calculator"
import { z } from "zod"

const EssenceSchema = z.object({
  name: z.string().min(1),
  genderCategory: z.enum(["KADIN", "ERKEK", "UNISEX", "BELIRTILMEMIS"]).default("BELIRTILMEMIS"),
  initialVolumeMl: z.number().positive(),
  currentVolumeMl: z.number().min(0),
  minimumStockThresholdMl: z.number().min(0).default(5),
  notes: z.string().optional(),
})

async function requireAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  return user
}

export async function GET() {
  try {
    await requireAuth()
    const essences = await prisma.essence.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { batches: true } } },
    })
    return NextResponse.json(essences)
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const data = EssenceSchema.parse(body)

    const status = computeStockStatus(data.currentVolumeMl, data.minimumStockThresholdMl)

    const essence = await prisma.$transaction(async (tx) => {
      const e = await tx.essence.create({ data: { ...data, status } })
      await tx.stockMovement.create({
        data: {
          essenceId: e.id,
          movementType: "initial_import",
          quantityMl: data.currentVolumeMl,
          reason: "İlk stok girişi",
          createdBy: user.email ?? user.id,
        },
      })
      return e
    })

    return NextResponse.json(essence, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors }, { status: 400 })
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}
