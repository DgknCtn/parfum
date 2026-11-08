"use client"

import { useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authErrorMessage } from "@/lib/auth-messages"

const fieldStyle = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(201,168,92,0.2)",
  color: "var(--ivory)",
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login/sifre-yenile`,
    })
    setLoading(false)
    // Güvenlik: hesap var/yok bilgisini sızdırmamak için rate limit dışındaki hatalarda da başarı mesajı gösterilir.
    if (error && error.status === 429) {
      setError(authErrorMessage(error))
      return
    }
    setSent(true)
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--obsidian)" }}>
      <div className="w-full max-w-sm space-y-6 px-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl" style={{ color: "var(--ivory)", fontFamily: "var(--font-gloock)" }}>
            Şifremi Unuttum
          </h1>
          <p className="text-xs" style={{ color: "var(--text-muted-warm)" }}>
            E-posta adresini gir, sana şifre sıfırlama bağlantısı gönderelim.
          </p>
        </div>

        {sent ? (
          <p role="status" className="text-sm text-center rounded-lg px-4 py-3" style={{ color: "var(--ivory)", background: "rgba(201,168,92,0.12)", border: "1px solid rgba(201,168,92,0.3)" }}>
            Bu adres kayıtlıysa birkaç dakika içinde sıfırlama bağlantısı gelecek. Gelen kutunu (ve spam klasörünü) kontrol et.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs tracking-wide uppercase" style={{ color: "var(--text-muted-warm)" }}>
                E-posta
              </Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={fieldStyle} autoComplete="email" />
            </div>
            {error && (
              <p role="alert" className="text-xs" style={{ color: "#f87171" }}>
                {error}
              </p>
            )}
            <Button type="submit" disabled={loading} className="w-full text-xs tracking-widest uppercase" style={{ background: "var(--gold)", color: "var(--obsidian)", fontWeight: 600 }}>
              {loading ? "Gönderiliyor..." : "Bağlantı Gönder"}
            </Button>
          </form>
        )}

        <Link href="/login" className="block text-center text-xs hover:underline" style={{ color: "var(--gold)" }}>
          ← Girişe dön
        </Link>
      </div>
    </div>
  )
}
