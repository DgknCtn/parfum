"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
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

export default function ResetPasswordPage() {
  const router = useRouter()
  const [ready, setReady] = useState<"checking" | "ok" | "invalid">("checking")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    const code = new URLSearchParams(window.location.search).get("code")
    ;(async () => {
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
          setError(authErrorMessage(error))
          setReady("invalid")
          return
        }
      }
      const { data } = await supabase.auth.getSession()
      setReady(data.session ? "ok" : "invalid")
    })()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 8) return setError("Şifre en az 8 karakter olmalı.")
    if (password !== confirm) return setError("Şifreler eşleşmiyor.")
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) return setError(authErrorMessage(error))
    await supabase.auth.signOut()
    router.replace("/login?sifre=guncellendi")
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--obsidian)" }}>
      <div className="w-full max-w-sm space-y-6 px-6">
        <h1 className="text-3xl text-center" style={{ color: "var(--ivory)", fontFamily: "var(--font-gloock)" }}>
          Yeni Şifre
        </h1>

        {ready === "checking" && (
          <p className="text-sm text-center" style={{ color: "var(--text-muted-warm)" }}>
            Bağlantı doğrulanıyor...
          </p>
        )}

        {ready === "invalid" && (
          <div className="space-y-4 text-center">
            <p role="alert" className="text-sm" style={{ color: "#f87171" }}>
              {error ?? "Bağlantının süresi dolmuş veya geçersiz."}
            </p>
            <Link href="/login/sifremi-unuttum" className="text-xs hover:underline" style={{ color: "var(--gold)" }}>
              Yeni bağlantı iste →
            </Link>
          </div>
        )}

        {ready === "ok" && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs tracking-wide uppercase" style={{ color: "var(--text-muted-warm)" }}>
                Yeni şifre
              </Label>
              <Input id="password" type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} style={fieldStyle} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm" className="text-xs tracking-wide uppercase" style={{ color: "var(--text-muted-warm)" }}>
                Yeni şifre (tekrar)
              </Label>
              <Input id="confirm" type="password" required minLength={8} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} style={fieldStyle} />
            </div>
            {error && (
              <p role="alert" className="text-xs" style={{ color: "#f87171" }}>
                {error}
              </p>
            )}
            <Button type="submit" disabled={loading} className="w-full text-xs tracking-widest uppercase" style={{ background: "var(--gold)", color: "var(--obsidian)", fontWeight: 600 }}>
              {loading ? "Kaydediliyor..." : "Şifreyi Güncelle"}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
