import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase/server"
import { computePossibleBottles } from "@/lib/stock-calculator"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const bottleSizeMl = parseFloat(searchParams.get("bottleSizeMl") ?? "50")
    const essenceRatio = parseFloat(searchParams.get("essenceRatio") ?? "0.25")

    const essence = await prisma.essence.findUniqueOrThrow({ where: { id } })
    const requiredPerBottle = bottleSizeMl * essenceRatio
    const possibleBottles = computePossibleBottles(essence.currentVolumeMl, bottleSizeMl, essenceRatio)
    const remainingAfter = essence.currentVolumeMl - possibleBottles * requiredPerBottle

    return NextResponse.json({
      essenceId: id,
      essenceName: essence.name,
      currentVolumeMl: essence.currentVolumeMl,
      bottleSizeMl,
      essenceRatio,
      requiredPerBottle,
      possibleBottles,
      remainingAfterMl: Math.max(0, remainingAfter),
    })
  } catch {
    return NextResponse.json({ error: "Error" }, { status: 500 })
  }
}
