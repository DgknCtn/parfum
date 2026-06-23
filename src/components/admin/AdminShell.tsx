"use client"

import { useState } from "react"
import { Sidebar } from "./Sidebar"
import { Menu } from "lucide-react"

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <>
      {/* Mobile top bar */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-4"
        style={{ background: "var(--obsidian)", borderBottom: "1px solid rgba(201,168,92,0.1)" }}
      >
        <div className="flex items-center gap-2">
          <span className="text-[10px] tracking-[0.35em] uppercase" style={{ color: "var(--gold)" }}>
            Atelier
          </span>
          <span className="text-lg" style={{ color: "var(--ivory)", fontFamily: "var(--font-gloock)" }}>
            Parfum
          </span>
          <span className="text-[10px] tracking-widest uppercase ml-1" style={{ color: "var(--text-muted-warm)" }}>
            Admin
          </span>
        </div>
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-md transition-opacity hover:opacity-70"
          aria-label="Menüyü aç"
        >
          <Menu size={20} style={{ color: "var(--ivory)" }} />
        </button>
      </div>

      {/* Backdrop */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/60"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="md:ml-56 min-h-screen pt-14 md:pt-0">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-8">
          {children}
        </div>
      </main>
    </>
  )
}
