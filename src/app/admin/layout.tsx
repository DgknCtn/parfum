import { redirect } from "next/navigation"
import type { Metadata } from "next"
import { AdminShell } from "@/components/admin/AdminShell"
import { requireAdmin } from "@/lib/auth"

export const metadata: Metadata = {
  title: "Yönetim",
  robots: { index: false, follow: false },
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Proxy'ye ek olarak sunucu tarafında da yetki kontrolü (defense in depth)
  try {
    await requireAdmin()
  } catch {
    redirect("/login")
  }
  return (
    <div className="admin-theme min-h-screen" style={{ background: "var(--ivory)" }}>
      <AdminShell>{children}</AdminShell>
    </div>
  )
}
