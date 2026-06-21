import type { Metadata } from "next"
import { Gloock, Instrument_Sans } from "next/font/google"
import { Toaster } from "sonner"
import "./globals.css"

const gloock = Gloock({
  weight: "400",
  variable: "--font-gloock",
  subsets: ["latin"],
})

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
})

export const metadata: Metadata = {
  title: {
    default: "Atelier Parfum — Koleksiyon Kataloğu",
    template: "%s | Atelier Parfum",
  },
  description:
    "Özenle hazırlanmış el yapımı parfüm koleksiyonu. Kadın, erkek ve unisex kategorilerinde detaylı reçete bilgileriyle.",
  openGraph: {
    type: "website",
    locale: "tr_TR",
    siteName: "Atelier Parfum",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={`${gloock.variable} ${instrumentSans.variable} h-full`}>
      <body className="min-h-full flex flex-col font-sans antialiased">
        {children}
        <Toaster
          position="bottom-right"
          richColors
          toastOptions={{
            style: {
              background: "var(--charcoal)",
              border: "1px solid rgba(201,168,92,0.2)",
              color: "var(--ivory)",
            },
          }}
        />
      </body>
    </html>
  )
}
