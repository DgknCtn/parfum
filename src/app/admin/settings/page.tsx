"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { ExternalLink, ShieldCheck } from "lucide-react"
import { api } from "@/lib/client-api"

interface Settings {
  heroEyebrow: string
  heroTitle: string
  heroSubtitle: string
  footerText: string
  defaultSort: "newest" | "name" | "gender" | "stock"
}

const SORTS = [
  ["newest", "En yeni üretim"],
  ["name", "Ada göre"],
  ["gender", "Cinsiyete göre"],
  ["stock", "Stok durumuna göre"],
] as const

export default function SettingsPage() {
  const [s, setS] = useState<Settings | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api<Settings>("/api/admin/settings").then((r) => (r.ok ? setS(r.data) : toast.error(r.error)))
  }, [])

  async function save() {
    if (!s) return
    if (!s.heroTitle.trim()) return toast.error("Başlık boş olamaz")
    setSaving(true)
    const res = await api<Settings>("/api/admin/settings", { method: "PUT", json: s })
    setSaving(false)
    if (res.ok) toast.success("Katalog ayarları kaydedildi")
    else toast.error(res.error)
  }

  const lbl = "text-xs uppercase tracking-wide"
  const muted = { color: "var(--text-muted-warm)" }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-serif" style={{ color: "var(--charcoal)", fontFamily: "var(--font-gloock)" }}>
            Katalog Ayarları
          </h1>
          <p className="text-sm mt-1" style={muted}>
            Public kataloğun metinleri ve varsayılan davranışı
          </p>
        </div>
        <a href="/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs px-3 py-2 rounded-md border" style={{ borderColor: "var(--border)", color: "var(--text-muted-warm)", background: "#fff" }}>
          <ExternalLink size={12} /> Kataloğu aç
        </a>
      </div>

      {!s ? (
        <p className="text-sm" style={muted}>
          Yükleniyor...
        </p>
      ) : (
        <form
          className="rounded-xl border p-5 space-y-4"
          style={{ background: "#fff", borderColor: "var(--border)" }}
          onSubmit={(e) => {
            e.preventDefault()
            save()
          }}
        >
          <div>
            <Label htmlFor="st-eyebrow" className={lbl} style={muted}>
              Üst başlık
            </Label>
            <Input id="st-eyebrow" value={s.heroEyebrow} maxLength={60} onChange={(e) => setS({ ...s, heroEyebrow: e.target.value })} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="st-title" className={lbl} style={muted}>
              Ana başlık *
            </Label>
            <Input id="st-title" value={s.heroTitle} maxLength={80} onChange={(e) => setS({ ...s, heroTitle: e.target.value })} className="mt-1" required />
            <p className="text-[11px] mt-1" style={muted}>
              Son kelime altın renkte vurgulanır.
            </p>
          </div>
          <div>
            <Label htmlFor="st-sub" className={lbl} style={muted}>
              Alt metin
            </Label>
            <Textarea id="st-sub" value={s.heroSubtitle} maxLength={240} rows={2} onChange={(e) => setS({ ...s, heroSubtitle: e.target.value })} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="st-footer" className={lbl} style={muted}>
              Alt bilgi (footer)
            </Label>
            <Input id="st-footer" value={s.footerText} maxLength={240} onChange={(e) => setS({ ...s, footerText: e.target.value })} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="st-sort" className={lbl} style={muted}>
              Varsayılan sıralama
            </Label>
            <Select value={s.defaultSort} onValueChange={(v) => setS({ ...s, defaultSort: v as Settings["defaultSort"] })}>
              <SelectTrigger id="st-sort" className="mt-1 w-full">
                <SelectValue>{(v: string) => SORTS.find(([k]) => k === v)?.[1] ?? v}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {SORTS.map(([k, l]) => (
                  <SelectItem key={k} value={k}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={saving} style={{ background: "var(--charcoal)", color: "var(--ivory)" }}>
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </Button>
        </form>
      )}

      <div className="rounded-xl border p-4 text-xs space-y-1.5" style={{ background: "#fff", borderColor: "var(--border)", color: "var(--charcoal)" }}>
        <p className="flex items-center gap-1.5 font-medium">
          <ShieldCheck size={14} style={{ color: "#15803d" }} /> Gizlilik kuralları (her zaman geçerli)
        </p>
        <ul className="list-disc pl-5 space-y-0.5" style={muted}>
          <li>Gizli parfümler ve gizli partiler hiçbir public sayfada veya API&apos;de görünmez.</li>
          <li>Maliyet / ücret bilgisi public tarafta asla gösterilmez.</li>
          <li>Parfüm &quot;iç notları&quot; yalnızca adminde görünür; public sayfada yalnızca açıklama ve parti notları yer alır.</li>
          <li>Biten parfümler gizlenmez, &quot;Bitti&quot; etiketiyle gösterilir.</li>
        </ul>
      </div>
    </div>
  )
}
