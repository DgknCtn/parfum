import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase/server"
import { computeStockStatus } from "@/lib/stock-calculator"
import { z } from "zod"

const BatchSchema = z.object({
  perfumeId: z.string().min(1),
  essenceId: z.string().min(1),
  batchLabel: z.string().min(1),
  productionDate: z.string(),
  totalVolumeMl: z.number().positive(),
  essenceRatio: z.number().min(0).max(1),
  essenceVolumeMl: z.number().positive(),
  alcoholVolumeMl: z.number().min(0),
  waterVolumeMl: z.number().min(0),
  cost: z.number().optional(),
  notes: z.string().optional(),
  publicVisible: z.boolean().default(false),
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
    const perfumeId = searchParams.get("perfumeId")

    const batches = await prisma.batch.findMany({
      where: {
        deletedAt: null,
        ...(perfumeId ? { perfumeId } : {}),
      },
      orderBy: { productionDate: "desc" },
      include: {
        perfume: { select: { id: true, name: true, brandName: true } },
        essence: { select: { id: true, name: true, currentVolumeMl: true, status: true } },
      },
    })
    return NextResponse.json(batches)
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const data = BatchSchema.parse(body)

    const essence = await prisma.essence.findUniqueOrThrow({ where: { id: data.essenceId } })

    if (essence.currentVolumeMl < data.essenceVolumeMl) {
      return NextResponse.json(
        {
          error: "Yetersiz stok",
          available: essence.currentVolumeMl,
          required: data.essenceVolumeMl,
        },
        { status: 422 }
      )
    }

    const newVolume = essence.currentVolumeMl - data.essenceVolumeMl
    const newStatus = computeStockStatus(newVolume, essence.minimumStockThresholdMl)

    const result = await prisma.$transaction(async (tx) => {
      const batch = await tx.batch.create({
        data: {
          ...data,
          productionDate: new Date(data.productionDate),
          stockDeducted: true,
        },
      })

      await tx.essence.update({
        where: { id: data.essenceId },
        data: {
          currentVolumeMl: newVolume,
          totalUsedMl: { increment: data.essenceVolumeMl },
          status: newStatus,
        },
      })

      await tx.stockMovement.create({
        data: {
          essenceId: data.essenceId,
          batchId: batch.id,
          movementType: "production_usage",
          quantityMl: -data.essenceVolumeMl,
          reason: `${data.batchLabel} üretimi için kullanıldı`,
          createdBy: user.email ?? user.id,
        },
      })

      await tx.perfume.update({
        where: { id: data.perfumeId },
        data: {
          latestBatchDate: new Date(data.productionDate),
          totalProducedMl: { increment: data.totalVolumeMl },
        },
      })

      return batch
    })

    return NextResponse.json(
      {
        batch: result,
        stockStatus: {
          essenceId: data.essenceId,
          previousVolumeMl: essence.currentVolumeMl,
          usedVolumeMl: data.essenceVolumeMl,
          currentVolumeMl: newVolume,
          status: newStatus,
        },
      },
      { status: 201 }
    )
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 })
    return NextResponse.json({ error: "Error" }, { status: 500 })
  }
}
