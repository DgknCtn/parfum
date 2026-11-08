"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { authErrorMessage } from "@/lib/auth-messages"

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const noAccess = searchParams.get("hata") === "yetki"
  const notice = noAccess
    ? "Bu hesabın yönetim paneline erişim yetkisi yok."
    : searchParams.get("sifre") === "guncellendi"
      ? "Şifren güncellendi. Yeni şifrenle giriş yapabilirsin."
      : null

  // Yetkisiz hesabın oturumunu kapat (yalnızca dış sistem senkronizasyonu, state güncellemesi yok)
  useEffect(() => {
    if (noAccess) createClient().auth.signOut()
  }, [noAccess])

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      toast.error(authErrorMessage(error))
      setLoading(false)
      return
    }
    router.push("/admin/dashboard")
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--obsidian)" }}>
      <div className="w-full max-w-sm space-y-8 px-6">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="text-xs tracking-[0.35em] uppercase" style={{ color: "var(--gold)" }}>
            Atelier
          </div>
          <h1
            className="text-4xl font-serif"
            style={{ color: "var(--ivory)", fontFamily: "var(--font-gloock)" }}
          >
            Parfum
          </h1>
          <p className="text-xs" style={{ color: "var(--text-muted-warm)" }}>
            Yönetici Girişi
          </p>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px" style={{ background: "rgba(201,168,92,0.2)" }} />
          <div className="w-1 h-1 rounded-full" style={{ background: "var(--gold)" }} />
          <div className="flex-1 h-px" style={{ background: "rgba(201,168,92,0.2)" }} />
        </div>

        {notice && (
          <p role="status" className="text-xs text-center rounded-lg px-3 py-2" style={{ color: "var(--ivory)", background: "rgba(201,168,92,0.12)", border: "1px solid rgba(201,168,92,0.3)" }}>
            {notice}
          </p>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <Label
              htmlFor="email"
              className="text-xs tracking-wide uppercase"
              style={{ color: "var(--text-muted-warm)" }}
            >
              E-posta
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="admin@example.com"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(201,168,92,0.2)",
                color: "var(--ivory)",
                outline: "none",
              }}
              className="focus:border-[var(--gold)] focus:ring-0 placeholder:text-[var(--text-muted-warm)]"
            />
          </div>
          <div className="space-y-1.5">
            <Label
              htmlFor="password"
              className="text-xs tracking-wide uppercase"
              style={{ color: "var(--text-muted-warm)" }}
            >
              Şifre
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(201,168,92,0.2)",
                color: "var(--ivory)",
              }}
              className="focus:border-[var(--gold)] focus:ring-0"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full mt-2 text-xs tracking-widest uppercase"
            style={{
              background: "var(--gold)",
              color: "var(--obsidian)",
              fontWeight: 600,
            }}
          >
            {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
          </Button>
        </form>
        <div className="flex items-center justify-between text-xs">
          <Link href="/" className="hover:underline" style={{ color: "var(--text-muted-warm)" }}>
            ← Kataloğa dön
          </Link>
          <Link href="/login/sifremi-unuttum" className="hover:underline" style={{ color: "var(--gold)" }}>
            Şifremi unuttum
          </Link>
        </div>
      </div>
    </div>
  )
}
