import { Sidebar } from "@/components/admin/Sidebar"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: "var(--ivory)" }}>
      <Sidebar />
      <main className="ml-56 min-h-screen">
        <div className="max-w-6xl mx-auto px-8 py-8">{children}</div>
      </main>
    </div>
  )
}
