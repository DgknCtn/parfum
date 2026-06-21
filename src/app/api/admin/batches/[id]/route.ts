import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase/server"
import { computeStockStatus } from "@/lib/stock-calculator"

async function requireAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  return user
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth()
    const { id } = await params

    const batch = await prisma.batch.findUniqueOrThrow({
      where: { id, deletedAt: null },
      include: { essence: true },
    })

    const newVolume = batch.essence.currentVolumeMl + batch.essenceVolumeMl
    const newStatus = computeStockStatus(newVolume, batch.essence.minimumStockThresholdMl)

    await prisma.$transaction(async (tx) => {
      await tx.batch.update({ where: { id }, data: { deletedAt: new Date() } })

      if (batch.stockDeducted) {
        await tx.essence.update({
          where: { id: batch.essenceId },
          data: {
            currentVolumeMl: newVolume,
            totalUsedMl: { decrement: batch.essenceVolumeMl },
            status: newStatus,
          },
        })

        await tx.stockMovement.create({
          data: {
            essenceId: batch.essenceId,
            batchId: id,
            movementType: "deletion_reversal",
            quantityMl: batch.essenceVolumeMl,
            reason: `${batch.batchLabel} silindi — stok iade edildi`,
            createdBy: user.email ?? user.id,
          },
        })
      }
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Error" }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth()
    const { id } = await params
    const body = await request.json()
    const { publicVisible, notes } = body

    const batch = await prisma.batch.update({
      where: { id },
      data: {
        ...(publicVisible !== undefined ? { publicVisible } : {}),
        ...(notes !== undefined ? { notes } : {}),
      },
    })
    return NextResponse.json(batch)
  } catch {
    return NextResponse.json({ error: "Error" }, { status: 500 })
  }
}
