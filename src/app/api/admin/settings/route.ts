import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin, actorOf } from "@/lib/auth"
import { apiError } from "@/lib/api"
import { CatalogSettingsSchema, getCatalogSettings, saveCatalogSettings } from "@/lib/settings"
import { logActivity } from "@/lib/activity"
import { revalidateCatalog } from "@/lib/revalidate"
import { revalidatePath } from "next/cache"

export async function GET() {
  try {
    await requireAdmin()
    return NextResponse.json(await getCatalogSettings())
  } catch (err) {
    return apiError(err)
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireAdmin()
    const data = CatalogSettingsSchema.parse(await request.json())
    await saveCatalogSettings(data)
    await logActivity(prisma, { action: "settings_updated", entityType: "settings", message: "Public katalog ayarları güncellendi.", actor: actorOf(user) })
    revalidateCatalog()
    revalidatePath("/", "layout")
    return NextResponse.json(data)
  } catch (err) {
    return apiError(err)
  }
}
