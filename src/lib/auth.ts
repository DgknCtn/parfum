import { createClient } from "@/lib/supabase/server"
import { HttpError } from "@/lib/api"
import { isAdminUser } from "@/lib/admin-emails"

/**
 * Oturum açmış VE admin listesinde (ADMIN_EMAILS veya app_metadata.role=admin) olan kullanıcıyı döner.
 * Aksi halde HttpError fırlatır (401/403).
 */
export async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new HttpError(401, "Oturum açmanız gerekiyor")
  if (!isAdminUser(user)) throw new HttpError(403, "Bu işlem için yetkiniz yok")
  return user
}

export function actorOf(user: { email?: string | null; id: string }) {
  return user.email ?? user.id
}
