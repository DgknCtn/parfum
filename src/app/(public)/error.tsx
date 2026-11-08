"use client"

import Link from "next/link"
import { useEffect } from "react"

export default function PublicError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="max-w-md mx-auto px-6 py-24 text-center" role="alert">
      <p className="text-3xl mb-3" style={{ color: "var(--ivory)", fontFamily: "var(--font-gloock)" }}>
        Bir şeyler ters gitti
      </p>
      <p className="text-sm mb-6" style={{ color: "var(--text-muted-warm)" }}>
        Sayfa şu anda yüklenemedi. Biraz sonra tekrar deneyebilirsin.
      </p>
      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="text-xs px-4 py-2 rounded-lg font-semibold tracking-wider uppercase"
          style={{ background: "var(--gold)", color: "var(--obsidian)" }}
        >
          Tekrar dene
        </button>
        <Link href="/" className="text-xs" style={{ color: "var(--gold)" }}>
          Kataloğa dön →
        </Link>
      </div>
    </div>
  )
}
