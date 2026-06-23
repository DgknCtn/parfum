import { AdminShell } from "@/components/admin/AdminShell"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: "var(--ivory)" }}>
      <AdminShell>{children}</AdminShell>
    </div>
  )
}
