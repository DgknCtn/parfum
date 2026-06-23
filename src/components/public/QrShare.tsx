"use client"

import { useEffect, useState } from "react"
import { QRCodeSVG } from "qrcode.react"
import { Share2 } from "lucide-react"

export function QrShare() {
  const [url, setUrl] = useState("")
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setUrl(window.location.href)
  }, [])

  async function handleCopy() {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!url) return null

  return (
    <div className="mt-12 pt-8 border-t flex flex-col sm:flex-row items-center gap-6" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
      <div className="p-3 rounded-xl" style={{ background: "#fff" }}>
        <QRCodeSVG value={url} size={96} level="M" />
      </div>
      <div>
        <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "var(--gold)" }}>Bağlantıyı Paylaş</p>
        <p className="text-sm mb-3 break-all" style={{ color: "var(--text-muted-warm)" }}>{url}</p>
        <button
          onClick={handleCopy}
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
