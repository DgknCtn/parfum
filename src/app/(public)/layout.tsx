import Link from "next/link"

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: "var(--obsidian)" }}>
      {/* Navbar */}
      <header
        className="sticky top-0 z-50 border-b"
        style={{
          background: "rgba(10,10,10,0.85)",
          backdropFilter: "blur(12px)",
          borderColor: "rgba(201,168,92,0.1)",
        }}
      >
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-[10px] tracking-[0.35em] uppercase" style={{ color: "var(--gold)" }}>
              Atelier
            </span>
            <span
              className="text-lg"
              style={{ color: "var(--ivory)", fontFamily: "var(--font-gloock)" }}
            >
              Parfum
            </span>
          </Link>
          <nav className="flex items-center gap-4 sm:gap-6 text-xs tracking-wide">
            <Link href="/?gender=KADIN" className="hidden sm:inline transition-colors hover:text-[var(--gold)]" style={{ color: "var(--text-muted-warm)" }}>
              Kadın
            </Link>
            <Link href="/?gender=ERKEK" className="hidden sm:inline transition-colors hover:text-[var(--gold)]" style={{ color: "var(--text-muted-warm)" }}>
              Erkek
            </Link>
            <Link href="/?gender=UNISEX" className="hidden sm:inline transition-colors hover:text-[var(--gold)]" style={{ color: "var(--text-muted-warm)" }}>
              Unisex
            </Link>
            <Link
              href="/admin"
              className="text-[10px] tracking-[0.25em] uppercase transition-opacity opacity-25 hover:opacity-60"
              style={{ color: "var(--text-muted-warm)" }}
            >
              Admin
            </Link>
          </nav>
        </div>
      </header>

      {/* Page content */}
      <main>{children}</main>

      {/* Footer */}
      <footer
        className="mt-24 py-12 border-t"
        style={{ borderColor: "rgba(201,168,92,0.1)" }}
      >
        <div className="max-w-6xl mx-auto px-6 text-center">
          <div
            className="text-xl mb-2"
            style={{ color: "var(--ivory)", fontFamily: "var(--font-gloock)" }}
          >
            Atelier Parfum
          </div>
          <p className="text-xs" style={{ color: "var(--text-muted-warm)" }}>
            El yapımı parfüm koleksiyonu · Tüm reçeteler özgün formülasyondur
          </p>
        </div>
      </footer>
    </div>
  )
}
