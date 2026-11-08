"use client"

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="tr">
      <body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", background: "#0A0A0A", color: "#F5F0E8", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ textAlign: "center", padding: 24 }} role="alert">
          <h1 style={{ fontSize: 28, marginBottom: 8 }}>Beklenmeyen bir hata oluştu</h1>
          <p style={{ color: "#B5AA97", fontSize: 14, marginBottom: 20 }}>Lütfen sayfayı yenileyin veya biraz sonra tekrar deneyin.</p>
          <button type="button" onClick={reset} style={{ background: "#C9A85C", color: "#0A0A0A", border: 0, borderRadius: 8, padding: "10px 18px", fontWeight: 600, cursor: "pointer" }}>
            Tekrar dene
          </button>
        </div>
      </body>
    </html>
  )
}
