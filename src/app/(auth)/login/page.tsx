"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      toast.error("Giriş başarısız: " + error.message)
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
      </div>
    </div>
  )
}
