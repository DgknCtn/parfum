import Link from "next/link"

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "var(--obsidian)" }}>
      <div className="text-center max-w-md">
        <p className="text-[10px] tracking-[0.5em] uppercase mb-3" style={{ color: "var(--gold)" }}>
          404
        </p>
        <h1 className="text-4xl mb-3" style={{ color: "var(--ivory)", fontFamily: "var(--font-gloock)" }}>
          Sayfa bulunamadı
        </h1>
        <p className="text-sm mb-6" style={{ color: "var(--text-muted-warm)" }}>
          Aradığın sayfa taşınmış veya hiç var olmamış olabilir.
        </p>
        <Link href="/" className="text-sm" style={{ color: "var(--gold)" }}>
          Kataloğa dön →
        </Link>
      </div>
    </div>
  )
}
