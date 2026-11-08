import type { GenderCategory } from "@prisma/client"
import { GENDER_LABEL, STOCK_LABEL, type PublicStock } from "@/lib/catalog"

// Koyu (#0A0A0A) zeminde WCAG AA (≥4.5:1) kontrastlı tonlar
export const GENDER_COLOR: Record<GenderCategory, string> = {
  KADIN: "#f0abfc",
  ERKEK: "#93c5fd",
  UNISEX: "#6ee7b7",
  BELIRTILMEMIS: "#a8a29e",
}

const STOCK_STYLE: Record<PublicStock, { color: string; icon: string }> = {
  available: { color: "#86efac", icon: "●" },
  low: { color: "#fde047", icon: "◐" },
  out: { color: "#fca5a5", icon: "○" },
}

export function GenderBadge({ gender, size = "sm" }: { gender: GenderCategory; size?: "sm" | "md" }) {
  if (gender === "BELIRTILMEMIS") return null
  const color = GENDER_COLOR[gender]
  return (
    <span
      className={`shrink-0 rounded-full ${size === "md" ? "text-xs px-3 py-1" : "text-[11px] px-2 py-0.5"}`}
      style={{ background: `${color}14`, color, border: `1px solid ${color}40` }}
    >
      {GENDER_LABEL[gender]}
    </span>
  )
}

export function StockBadge({ stock, size = "sm" }: { stock: PublicStock | null; size?: "sm" | "md" }) {
  if (!stock) return null
  const s = STOCK_STYLE[stock]
  return (
    <span
      className={`shrink-0 inline-flex items-center gap-1 rounded-full ${size === "md" ? "text-xs px-3 py-1" : "text-[11px] px-2 py-0.5"}`}
      style={{ background: `${s.color}12`, color: s.color, border: `1px solid ${s.color}35` }}
    >
      <span aria-hidden="true">{s.icon}</span>
      <span>{STOCK_LABEL[stock]}</span>
    </span>
  )
}
