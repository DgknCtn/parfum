import { ImageResponse } from "next/og"

export const alt = "Atelier Parfum — El yapımı parfüm kataloğu"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "radial-gradient(ellipse at 50% 0%, #2a2214 0%, #0A0A0A 65%)",
          color: "#F5F0E8",
        }}
      >
        <div style={{ fontSize: 26, letterSpacing: 18, color: "#C9A85C", marginBottom: 24 }}>ATELIER</div>
        <div style={{ fontSize: 120, fontFamily: "serif", lineHeight: 1 }}>Parfum</div>
        <div style={{ fontSize: 30, color: "#B5AA97", marginTop: 32 }}>El yapımı parfümler · detaylı reçete oranları</div>
      </div>
    ),
    size
  )
}
