import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase/server"
import { z } from "zod"

const BulkSchema = z.object({
  ids: z.array(z.string()).min(1),
  publicVisible: z.boolean(),
})

async function requireAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  return user
}

export async function PATCH(request: Request) {
  try {
    await requireAuth()
    const body = await request.json()
    const { ids, publicVisible } = BulkSchema.parse(body)

    const result = await prisma.perfume.updateMany({
      where: { id: { in: ids } },
      data: { publicVisible },
    })

    return NextResponse.json({ updated: result.count })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 })
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}
