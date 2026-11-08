import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth"
import { apiError, parsePositiveInt } from "@/lib/api"

export async function GET(request: Request) {
  try {
    await requireAdmin()
    const { searchParams } = new URL(request.url)
    const essenceId = searchParams.get("essenceId")
    const page = parsePositiveInt(searchParams.get("page"), 1)
    const limit = 50
    const skip = (page - 1) * limit

    const where = essenceId ? { essenceId } : {}

    const [movements, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          essence: { select: { id: true, name: true } },
          batch: { select: { id: true, batchLabel: true, perfume: { select: { name: true } } } },
        },
      }),
      prisma.stockMovement.count({ where }),
    ])

    return NextResponse.json({ movements, total, page, pages: Math.ceil(total / limit) })
  } catch (err) {
    return apiError(err)
  }
}
