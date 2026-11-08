import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth"
import { apiError, parsePositiveInt } from "@/lib/api"

export async function GET(request: Request) {
  try {
    await requireAdmin()
    const { searchParams } = new URL(request.url)
    const page = parsePositiveInt(searchParams.get("page"), 1)
    const entityType = searchParams.get("entityType")
    const entityId = searchParams.get("entityId")
    const limit = 50
    const where = {
      ...(entityType ? { entityType } : {}),
      ...(entityId ? { entityId } : {}),
    }
    const [items, total] = await Promise.all([
      prisma.activityLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit }),
      prisma.activityLog.count({ where }),
    ])
    return NextResponse.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) })
  } catch (err) {
    return apiError(err)
  }
}
