import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin, actorOf } from "@/lib/auth"
import { apiError, HttpError } from "@/lib/api"
import { PerfumeFields } from "@/lib/schemas"
import { logActivity } from "@/lib/activity"
import { revalidateCatalog } from "@/lib/revalidate"

type Params = { params: Promise<{ id: string }> }
const UpdateSchema = PerfumeFields.partial()

export async function GET(_: Request, { params }: Params) {
  try {
    await requireAdmin()
    const { id } = await params
    const perfume = await prisma.perfume.findFirst({
      where: { id, deletedAt: null },
      include: {
        batches: {
          where: { deletedAt: null },
          orderBy: { productionDate: "desc" },
          include: { essence: { select: { id: true, name: true, currentVolumeMl: true, status: true } } },
        },
      },
    })
    if (!perfume) throw new HttpError(404, "Parfüm bulunamadı")
    return NextResponse.json(perfume)
  } catch (err) {
    return apiError(err)
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const user = await requireAdmin()
    const { id } = await params
    const data = UpdateSchema.parse(await request.json())
    const existing = await prisma.perfume.findFirst({ where: { id, deletedAt: null } })
    if (!existing) throw new HttpError(404, "Parfüm bulunamadı")

    const perfume = await prisma.perfume.update({ where: { id }, data })
    const actor = actorOf(user)
    if (data.publicVisible !== undefined && data.publicVisible !== existing.publicVisible) {
      await logActivity(prisma, {
        action: "perfume_public_visibility_changed",
        entityType: "perfume",
        entityId: id,
        message: `${perfume.name} ${perfume.publicVisible ? "public kataloğa eklendi" : "public katalogdan gizlendi"}.`,
        actor,
      })
    }
    const otherKeys = Object.keys(data).filter((k) => k !== "publicVisible")
    if (otherKeys.length) {
      await logActivity(prisma, {
        action: "perfume_updated",
        entityType: "perfume",
        entityId: id,
        message: `${perfume.name} güncellendi (${otherKeys.join(", ")}).`,
        actor,
      })
    }
    revalidateCatalog()
    return NextResponse.json(perfume)
  } catch (err) {
    return apiError(err)
  }
}

/** Soft delete: partileri ve stok geçmişi korunur, parfüm her yerden gizlenir. */
export async function DELETE(_: Request, { params }: Params) {
  try {
    const user = await requireAdmin()
    const { id } = await params
    const perfume = await prisma.perfume.findFirst({
      where: { id, deletedAt: null },
      include: { _count: { select: { batches: { where: { deletedAt: null } } } } },
    })
    if (!perfume) throw new HttpError(404, "Parfüm bulunamadı")
    if (perfume._count.batches > 0)
      throw new HttpError(
        409,
        `Bu parfümün ${perfume._count.batches} aktif partisi var. Stokların doğru iade edilmesi için önce partileri silin.`
      )
    await prisma.perfume.update({ where: { id }, data: { deletedAt: new Date(), publicVisible: false } })
    await logActivity(prisma, {
      action: "perfume_deleted",
      entityType: "perfume",
      entityId: id,
      message: `${perfume.name} parfümü silindi.`,
      actor: actorOf(user),
    })
    revalidateCatalog()
    return NextResponse.json({ success: true })
  } catch (err) {
    return apiError(err)
  }
}
