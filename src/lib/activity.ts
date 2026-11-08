import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"

type Db = Prisma.TransactionClient | typeof prisma

export type ActivityAction =
  | "perfume_created"
  | "perfume_updated"
  | "perfume_deleted"
  | "perfume_public_visibility_changed"
  | "perfume_image_uploaded"
  | "essence_created"
  | "essence_updated"
  | "essence_deleted"
  | "manual_stock_adjustment_created"
  | "essence_recalculated"
  | "batch_created"
  | "batch_updated"
  | "batch_deleted"
  | "excel_import_completed"
  | "data_migration_run"
  | "settings_updated"

/** PRD §7 activity log. Hata olursa ana işlemi bozmaz (transaction dışında çağrıldığında). */
export async function logActivity(
  db: Db,
  entry: {
    action: ActivityAction
    entityType: "perfume" | "essence" | "batch" | "import" | "system" | "settings"
    entityId?: string | null
    message: string
    metadata?: Prisma.InputJsonValue
    actor: string
  }
) {
  try {
    await db.activityLog.create({
      data: {
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId ?? null,
        message: entry.message,
        metadata: entry.metadata,
        createdBy: entry.actor,
      },
    })
  } catch (e) {
    // Transaction içindeyken hatayı yukarı taşı (rollback gerekir); dışında yut.
    if (db !== prisma) throw e
    console.error("logActivity failed", e)
  }
}
