"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import {
  LayoutDashboard,
  Droplets,
  FlaskConical,
  Package,
  FileSpreadsheet,
  LogOut,
  Globe,
} from "lucide-react"

const navItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/perfumes", label: "Parfümler", icon: FlaskConical },
  { href: "/admin/essences", label: "Esanslar", icon: Droplets },
  { href: "/admin/batches", label: "Üretimler", icon: Package },
  { href: "/admin/import", label: "Excel İçe Aktar", icon: FileSpreadsheet },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success("Çıkış yapıldı")
    router.push("/login")
    router.refresh()
  }

  return (
    <aside
      className="fixed left-0 top-0 h-full w-56 flex flex-col z-40"
      style={{
        background: "var(--obsidian)",
        borderRight: "1px solid rgba(201,168,92,0.1)",
      }}
    >
      {/* Logo */}
      <div className="px-6 py-8 border-b" style={{ borderColor: "rgba(201,168,92,0.1)" }}>
        <div className="text-[10px] tracking-[0.4em] uppercase mb-1" style={{ color: "var(--gold-dim)" }}>
          Atelier
        </div>
        <div
          className="text-2xl"
          style={{ color: "var(--ivory)", fontFamily: "var(--font-gloock)", lineHeight: 1 }}
        >
          Parfum
        </div>
        <div className="text-[10px] mt-1.5 tracking-widest uppercase" style={{ color: "var(--text-muted-warm)" }}>
          Admin Paneli
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all duration-150 group"
              style={{
                background: active ? "rgba(201,168,92,0.12)" : "transparent",
                color: active ? "var(--gold)" : "var(--text-muted-warm)",
              }}
            >
              <Icon
                size={15}
                style={{ color: active ? "var(--gold)" : "var(--text-muted-warm)" }}
              />
              <span className="text-xs tracking-wide">{item.label}</span>
              {active && (
                <div
                  className="ml-auto w-1 h-1 rounded-full"
                  style={{ background: "var(--gold)" }}
                />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 space-y-0.5 border-t" style={{ borderColor: "rgba(201,168,92,0.1)" }}>
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-3 px-3 py-2.5 rounded-md text-xs transition-all duration-150"
          style={{ color: "var(--text-muted-warm)" }}
        >
          <Globe size={15} />
          <span className="tracking-wide">Public Katalog</span>
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-xs transition-all duration-150 hover:text-red-400"
          style={{ color: "var(--text-muted-warm)" }}
        >
          <LogOut size={15} />
          <span className="tracking-wide">Çıkış Yap</span>
        </button>
      </div>
    </aside>
  )
}
