import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin, actorOf } from "@/lib/auth"
import { apiError } from "@/lib/api"
import { EssenceFields } from "@/lib/schemas"
import { computeStockStatus, round2 } from "@/lib/stock-calculator"
import { findInconsistentEssences } from "@/lib/stock-service"
import { logActivity } from "@/lib/activity"
import { z } from "zod"

const CreateSchema = EssenceFields.extend({
  currentVolumeMl: z.number().finite().min(0).max(100_000).optional(),
  minimumStockThresholdMl: z.number().finite().min(0).max(100_000).default(5),
  genderCategory: EssenceFields.shape.genderCategory.default("BELIRTILMEMIS"),
})

export async function GET() {
  try {
    await requireAdmin()
    const [essences, inconsistent] = await Promise.all([
      prisma.essence.findMany({
        where: { deletedAt: null },
        orderBy: { name: "asc" },
        include: { _count: { select: { batches: { where: { deletedAt: null } } } } },
      }),
      findInconsistentEssences(),
    ])
    const diffs = new Map(inconsistent.map((e) => [e.id, e.diffMl]))
    return NextResponse.json(essences.map((e) => ({ ...e, ledgerDiffMl: diffs.get(e.id) ?? 0 })))
  } catch (err) {
    return apiError(err)
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAdmin()
    const actor = actorOf(user)
    const data = CreateSchema.parse(await request.json())
    const current = round2(data.currentVolumeMl ?? data.initialVolumeMl)
    const status = computeStockStatus(current, data.minimumStockThresholdMl)

    const essence = await prisma.$transaction(async (tx) => {
      const e = await tx.essence.create({
        data: {
          name: data.name,
          genderCategory: data.genderCategory,
          initialVolumeMl: round2(data.initialVolumeMl),
          currentVolumeMl: current,
          minimumStockThresholdMl: data.minimumStockThresholdMl,
          notes: data.notes || null,
          supplier: data.supplier || null,
          pricePerMl: data.pricePerMl ?? null,
          status,
        },
      })
      await tx.stockMovement.create({
        data: { essenceId: e.id, movementType: "initial_import", quantityMl: current, reason: "İlk stok girişi", createdBy: actor },
      })
      await logActivity(tx, {
        action: "essence_created",
        entityType: "essence",
        entityId: e.id,
        message: `${e.name} esansı ${current} ml stokla eklendi.`,
        actor,
      })
      return e
    })
    return NextResponse.json(essence, { status: 201 })
  } catch (err) {
    return apiError(err)
  }
}
