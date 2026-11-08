import Link from "next/link"
import { getCatalogSettings } from "@/lib/settings"

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const settings = await getCatalogSettings()
  return (
    <div className="min-h-screen" style={{ background: "var(--obsidian)" }}>
      <a href="#icerik" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:px-3 focus:py-2 focus:rounded focus:bg-[var(--gold)] focus:text-[var(--obsidian)]">
        İçeriğe geç
      </a>
      {/* Navbar */}
      <header
        className="sticky top-0 z-50 border-b"
        style={{
          background: "rgba(10,10,10,0.85)",
          backdropFilter: "blur(12px)",
          borderColor: "rgba(201,168,92,0.1)",
        }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2 shrink-0" aria-label="Atelier Parfum ana sayfa">
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
          <nav aria-label="Kategoriler" className="flex items-center gap-4 sm:gap-6 text-xs tracking-wide">
            {[
              ["KADIN", "Kadın"],
              ["ERKEK", "Erkek"],
              ["UNISEX", "Unisex"],
            ].map(([value, label]) => (
              <Link
                key={value}
                href={`/?gender=${value}`}
                className="py-2 transition-colors hover:text-[var(--gold)] focus-visible:text-[var(--gold)]"
                style={{ color: "var(--text-muted-warm)" }}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* Page content */}
      <main id="icerik">{children}</main>

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
            {settings.footerText}
          </p>
        </div>
      </footer>
    </div>
  )
}
