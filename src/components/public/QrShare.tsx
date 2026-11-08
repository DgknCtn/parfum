"use client"

import { useState, useSyncExternalStore } from "react"
import { QRCodeSVG } from "qrcode.react"
import { Share2 } from "lucide-react"
import { toast } from "sonner"

export function QrShare() {
  // Sunucuda "", tarayıcıda mevcut adres (hydration uyumlu)
  const url = useSyncExternalStore(
    () => () => {},
    () => window.location.href,
    () => ""
  )
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
        await navigator.share({ title: document.title, url })
        return
      }
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return // kullanıcı paylaşımı iptal etti
      toast.error("Bağlantı kopyalanamadı; adres çubuğundan kopyalayabilirsin.")
    }
  }

  if (!url) return null

  return (
    <div className="mt-12 pt-8 border-t flex flex-col sm:flex-row items-center gap-6" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
      <div className="p-3 rounded-xl" style={{ background: "#fff" }}>
        <QRCodeSVG value={url} size={96} level="M" title="Bu sayfanın QR kodu" />
      </div>
      <div>
        <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "var(--gold)" }}>Bağlantıyı Paylaş</p>
        <p className="text-sm mb-3 break-all" style={{ color: "var(--text-muted-warm)" }}>{url}</p>
        <button
          type="button"
          onClick={handleCopy}
          aria-live="polite"
          className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border transition-colors"
          style={{
            borderColor: "rgba(201,168,92,0.3)",
            color: copied ? "var(--gold)" : "var(--text-muted-warm)",
            background: copied ? "rgba(201,168,92,0.08)" : "transparent",
          }}
        >
          <Share2 size={12} />
          {copied ? "Kopyalandı!" : "Bağlantıyı Kopyala"}
        </button>
      </div>
    </div>
  )
}
