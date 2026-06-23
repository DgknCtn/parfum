import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const revalidate = 60

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const gender = searchParams.get("gender")
  const status = searchParams.get("status")
  const search = searchParams.get("q")
  const page = parseInt(searchParams.get("page") ?? "1")
  const pageSize = 24

  const perfumes = await prisma.perfume.findMany({
    where: {
      publicVisible: true,
      ...(gender ? { genderCategory: gender as never } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { brandName: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ latestBatchDate: "desc" }, { name: "asc" }],
    skip: (page - 1) * pageSize,
    take: pageSize,
    select: {
      id: true,
      name: true,
      brandName: true,
      genderCategory: true,
      description: true,
      slug: true,
      latestBatchDate: true,
      totalProducedMl: true,
      batches: {
        where: { deletedAt: null },
        orderBy: { productionDate: "desc" },
        take: 1,
        select: {
          essenceRatio: true,
          totalVolumeMl: true,
          batchLabel: true,
        },
      },
    },
  })

  const total = await prisma.perfume.count({ where: { publicVisible: true } })

  return NextResponse.json({ items: perfumes, total, page, pageSize })
}
