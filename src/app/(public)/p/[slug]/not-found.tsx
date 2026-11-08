import Link from "next/link"

export default function PerfumeNotFound() {
  return (
    <div className="max-w-md mx-auto px-6 py-24 text-center">
      <p className="text-3xl mb-3" style={{ color: "var(--ivory)", fontFamily: "var(--font-gloock)" }}>
        Parfüm bulunamadı
      </p>
      <p className="text-sm mb-6" style={{ color: "var(--text-muted-warm)" }}>
        Aradığın parfüm kaldırılmış ya da artık katalogda yayınlanmıyor olabilir.
      </p>
      <Link href="/" className="text-sm" style={{ color: "var(--gold)" }}>
        Tüm koleksiyonu gör →
      </Link>
    </div>
  )
}
