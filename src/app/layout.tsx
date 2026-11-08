import type { Metadata } from "next"
import { Gloock, Instrument_Sans, JetBrains_Mono } from "next/font/google"
import { siteUrl, SITE_NAME } from "@/lib/site"
import { Toaster } from "sonner"
import "./globals.css"

const gloock = Gloock({
  weight: "400",
  variable: "--font-gloock",
  subsets: ["latin", "latin-ext"],
  display: "swap",
})

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  display: "swap",
})

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500"],
  display: "swap",
})

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  applicationName: SITE_NAME,
  title: {
    default: "Atelier Parfum — Koleksiyon Kataloğu",
    template: "%s | Atelier Parfum",
  },
  description:
    "Özenle hazırlanmış el yapımı parfüm koleksiyonu. Kadın, erkek ve unisex kategorilerinde detaylı reçete bilgileriyle.",
  openGraph: {
    type: "website",
    locale: "tr_TR",
    siteName: SITE_NAME,
  },
  twitter: { card: "summary_large_image" },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={`${gloock.variable} ${instrumentSans.variable} ${jetbrains.variable} h-full`}>
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
