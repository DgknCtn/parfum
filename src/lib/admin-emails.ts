// Edge/Node uyumlu: sunucuya özgü import içermez (proxy.ts de kullanır).
export function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
}

export function isAdminUser(user: { email?: string | null; app_metadata?: Record<string, unknown> } | null | undefined): boolean {
  if (!user) return false
  if (user.app_metadata?.role === "admin") return true
  const email = user.email?.toLowerCase()
  return !!email && getAdminEmails().includes(email)
}
