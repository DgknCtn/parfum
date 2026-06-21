import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase/server"
import { computeStockStatus } from "@/lib/stock-calculator"
import { z } from "zod"

async function requireAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  return user
}

const UpdateSchema = z.object({
  name: z.string().min(1).optional(),
  genderCategory: z.enum(["KADIN", "ERKEK", "UNISEX", "BELIRTILMEMIS"]).optional(),
  initialVolumeMl: z.number().positive().optional(),
  currentVolumeMl: z.number().min(0).optional(),
  minimumStockThresholdMl: z.number().min(0).optional(),
  notes: z.string().optional(),
  adjustmentReason: z.string().optional(),
})

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const body = await request.json()
    const data = UpdateSchema.parse(body)
    const { adjustmentReason, ...updateData } = data

    const existing = await prisma.essence.findUniqueOrThrow({ where: { id } })

    if (data.currentVolumeMl !== undefined) {
      const diff = data.currentVolumeMl - existing.currentVolumeMl
      updateData.status = computeStockStatus(
        data.currentVolumeMl,
        data.minimumStockThresholdMl ?? existing.minimumStockThresholdMl
      )

      const essence = await prisma.$transaction(async (tx) => {
        const e = await tx.essence.update({ where: { id }, data: updateData })
        if (diff !== 0) {
          await tx.stockMovement.create({
            data: {
              essenceId: id,
              movementType: "manual_adjustment",
              quantityMl: diff,
              reason: adjustmentReason ?? "Manuel düzeltme",
              createdBy: user.email ?? user.id,
            },
          })
        }
        return e
      })
      return NextResponse.json(essence)
    }

    if (updateData.minimumStockThresholdMl !== undefined) {
      updateData.status = computeStockStatus(
        existing.currentVolumeMl,
        updateData.minimumStockThresholdMl
      )
    }

    const essence = await prisma.essence.update({ where: { id }, data: updateData })
    return NextResponse.json(essence)
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors }, { status: 400 })
    return NextResponse.json({ error: "Error" }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth()
    const { id } = await params
    await prisma.essence.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Error" }, { status: 500 })
  }
}
