import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth"
import { apiError, HttpError } from "@/lib/api"
import { computePossibleBottles, round2, STANDARD_BOTTLE_SIZES } from "@/lib/stock-calculator"
import { z } from "zod"

const Query = z.object({
  bottleSizeMl: z.coerce.number().positive().max(10_000).default(50),
  essenceRatio: z.coerce.number().gt(0).max(100).default(0.25),
})

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin()
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const q = Query.parse({
      bottleSizeMl: searchParams.get("bottleSizeMl") ?? undefined,
      essenceRatio: searchParams.get("essenceRatio") ?? undefined,
    })
    const essenceRatio = q.essenceRatio > 1 ? q.essenceRatio / 100 : q.essenceRatio

    const essence = await prisma.essence.findFirst({ where: { id, deletedAt: null } })
    if (!essence) throw new HttpError(404, "Esans bulunamadı")

    const calc = (bottleSizeMl: number) => {
      const requiredEssencePerBottleMl = round2(bottleSizeMl * essenceRatio)
      const possibleBottleCount = computePossibleBottles(essence.currentVolumeMl, bottleSizeMl, essenceRatio)
      return {
        bottleSizeMl,
        requiredEssencePerBottleMl,
        possibleBottleCount,
        remainingAfterProductionMl: Math.max(0, round2(essence.currentVolumeMl - possibleBottleCount * requiredEssencePerBottleMl)),
      }
    }
    const main = calc(q.bottleSizeMl)

    return NextResponse.json({
      essenceId: id,
      essenceName: essence.name,
      currentVolumeMl: essence.currentVolumeMl,
      essenceRatio,
      ...main,
      // Geriye uyumluluk
      requiredPerBottle: main.requiredEssencePerBottleMl,
      possibleBottles: main.possibleBottleCount,
      remainingAfterMl: main.remainingAfterProductionMl,
      standardSizes: STANDARD_BOTTLE_SIZES.map(calc),
    })
  } catch (err) {
    return apiError(err)
  }
}
