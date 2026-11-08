import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin, actorOf } from "@/lib/auth"
import { apiError } from "@/lib/api"
import { logActivity } from "@/lib/activity"
import { revalidateCatalog } from "@/lib/revalidate"
import { z } from "zod"

const BulkSchema = z.union([
  z.object({ ids: z.array(z.string().min(1).max(64)).min(1).max(1000), publicVisible: z.boolean() }),
  // Public parfümlerin tüm (silinmemiş) partilerini tek seferde yayınla/gizle
  z.object({ scope: z.literal("publicPerfumes"), publicVisible: z.boolean() }),
])

export async function PATCH(request: Request) {
  try {
    const user = await requireAdmin()
    const body = BulkSchema.parse(await request.json())
    const where =
      "ids" in body
        ? { id: { in: body.ids }, deletedAt: null }
        : { deletedAt: null, perfume: { publicVisible: true, deletedAt: null } }
    const result = await prisma.batch.updateMany({ where, data: { publicVisible: body.publicVisible } })
    await logActivity(prisma, {
      action: "batch_updated",
      entityType: "batch",
      message: `${result.count} parti toplu olarak ${body.publicVisible ? "public yapıldı" : "gizlendi"}${"scope" in body ? " (public parfümlerin tüm partileri)" : ""}.`,
      actor: actorOf(user),
    })
    revalidateCatalog()
    return NextResponse.json({ updated: result.count })
  } catch (err) {
    return apiError(err)
  }
}
