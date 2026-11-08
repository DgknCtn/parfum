import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin, actorOf } from "@/lib/auth"
import { apiError, HttpError } from "@/lib/api"
import { recordMovement } from "@/lib/stock-service"
import { round2 } from "@/lib/stock-calculator"
import { logActivity } from "@/lib/activity"

/**
 * Stok defteri ile kalan stok arasındaki farkı, mevcut kalan stoğu doğru kabul ederek
 * bir "correction" hareketiyle kapatır (Veri Tutarsız uyarısını çözer).
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAdmin()
    const actor = actorOf(user)
    const { id } = await params
    const body = (await request.json().catch(() => ({}))) as { reason?: string }
    const reason = (body.reason ?? "").trim().slice(0, 500)
    if (reason.length < 3) throw new HttpError(400, "Düzeltme için sebep notu zorunludur")

    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Essence" WHERE id = ${id} FOR UPDATE`
      const essence = await tx.essence.findFirst({ where: { id, deletedAt: null } })
      if (!essence) throw new HttpError(404, "Esans bulunamadı")
      const sum = await tx.stockMovement.aggregate({ where: { essenceId: id }, _sum: { quantityMl: true } })
      const diff = round2(essence.currentVolumeMl - (sum._sum.quantityMl ?? 0))
      if (Math.abs(diff) <= 0.01) return { diff: 0 }
      await recordMovement(tx, { essenceId: id, movementType: "correction", quantityMl: diff, reason: `Defter eşitleme: ${reason}`, createdBy: actor })
      await logActivity(tx, {
        action: "essence_recalculated",
        entityType: "essence",
        entityId: id,
        message: `${essence.name} stok defteri eşitlendi (${diff > 0 ? "+" : ""}${diff} ml). Sebep: ${reason}`,
        actor,
      })
      return { diff }
    })
    return NextResponse.json(result)
  } catch (err) {
    return apiError(err)
  }
}
