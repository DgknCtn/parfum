"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])
  return (
    <div className="max-w-lg rounded-xl p-6 space-y-3" role="alert" style={{ background: "#fff", border: "1px solid var(--border)" }}>
      <h2 className="text-xl" style={{ color: "var(--charcoal)", fontFamily: "var(--font-gloock)" }}>
        Bu sayfa yüklenemedi
      </h2>
      <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
        Veriler alınırken bir hata oluştu. İnternet bağlantını kontrol edip tekrar dene.
        {error.digest && <span className="block text-xs mt-1">Hata kodu: {error.digest}</span>}
      </p>
      <Button onClick={reset} style={{ background: "var(--charcoal)", color: "var(--ivory)" }}>
        Tekrar dene
      </Button>
    </div>
  )
}
