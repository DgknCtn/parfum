import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin, actorOf } from "@/lib/auth"
import { apiError } from "@/lib/api"
import { createWithUniqueSlug } from "@/lib/slug"
import { GenderEnum, PerfumeFields } from "@/lib/schemas"
import { logActivity } from "@/lib/activity"
import { revalidateCatalog } from "@/lib/revalidate"

const CreateSchema = PerfumeFields.extend({
  genderCategory: GenderEnum.default("BELIRTILMEMIS"),
  publicVisible: PerfumeFields.shape.publicVisible.default(false),
})

export async function GET(request: Request) {
  try {
    await requireAdmin()
    const { searchParams } = new URL(request.url)
    const gender = GenderEnum.safeParse(searchParams.get("gender"))
    const search = searchParams.get("search")?.trim().slice(0, 100)

    const perfumes = await prisma.perfume.findMany({
      where: {
        deletedAt: null,
        ...(gender.success ? { genderCategory: gender.data } : {}),
        ...(search
          ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { brandName: { contains: search, mode: "insensitive" } }] }
          : {}),
      },
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { batches: { where: { deletedAt: null } } } } },
    })
    return NextResponse.json(perfumes)
  } catch (err) {
    return apiError(err)
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAdmin()
    const data = CreateSchema.parse(await request.json())
    const perfume = await createWithUniqueSlug(data.name, (slug) => prisma.perfume.create({ data: { ...data, slug } }))
    await logActivity(prisma, {
      action: "perfume_created",
      entityType: "perfume",
      entityId: perfume.id,
      message: `${perfume.name} parfümü oluşturuldu${perfume.publicVisible ? " ve yayınlandı" : ""}.`,
      actor: actorOf(user),
    })
    revalidateCatalog()
    return NextResponse.json(perfume, { status: 201 })
  } catch (err) {
    return apiError(err)
  }
}
