import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin, actorOf } from "@/lib/auth"
import { apiError } from "@/lib/api"
import { logActivity } from "@/lib/activity"
import { revalidateCatalog } from "@/lib/revalidate"
import { z } from "zod"

const BulkSchema = z.object({
  ids: z.array(z.string().min(1).max(64)).min(1).max(500),
  publicVisible: z.boolean(),
})

export async function PATCH(request: Request) {
  try {
    const user = await requireAdmin()
    const { ids, publicVisible } = BulkSchema.parse(await request.json())
    const result = await prisma.perfume.updateMany({ where: { id: { in: ids }, deletedAt: null }, data: { publicVisible } })
    await logActivity(prisma, {
      action: "perfume_public_visibility_changed",
      entityType: "perfume",
      message: `${result.count} parfüm toplu olarak ${publicVisible ? "yayınlandı" : "gizlendi"}.`,
      metadata: { ids },
      actor: actorOf(user),
    })
    revalidateCatalog()
    return NextResponse.json({ updated: result.count })
  } catch (err) {
    return apiError(err)
  }
}
