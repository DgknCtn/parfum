interface StockBadgeProps {
  status: "MEVCUT" | "AZ_STOK" | "BITTI" | "YETERSIZ" | "TUTARSIZ"
}

const config = {
  // Açık zeminde WCAG AA kontrastlı tonlar + ikon (anlam yalnızca renge bağlı değil)
  MEVCUT: { label: "● Mevcut", style: { background: "rgba(34,197,94,0.12)", color: "#15803d", border: "1px solid rgba(34,197,94,0.35)" } },
  AZ_STOK: { label: "◐ Az Stok", style: { background: "rgba(234,179,8,0.14)", color: "#854d0e", border: "1px solid rgba(234,179,8,0.4)" } },
  BITTI: { label: "○ Bitti", style: { background: "rgba(239,68,68,0.12)", color: "#b91c1c", border: "1px solid rgba(239,68,68,0.35)" } },
  YETERSIZ: { label: "! Yetersiz", style: { background: "rgba(249,115,22,0.12)", color: "#c2410c", border: "1px solid rgba(249,115,22,0.35)" } },
  TUTARSIZ: { label: "≠ Tutarsız", style: { background: "rgba(139,92,246,0.12)", color: "#6d28d9", border: "1px solid rgba(139,92,246,0.35)" } },
}

export function StockBadge({ status }: StockBadgeProps) {
  const { label, style } = config[status] ?? config.TUTARSIZ
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium" style={style}>
      {label}
    </span>
  )
}

export function GenderBadge({ gender }: { gender: string }) {
  const map: Record<string, { label: string; color: string }> = {
    KADIN: { label: "Kadın", color: "#a21caf" },
    ERKEK: { label: "Erkek", color: "#1d4ed8" },
    UNISEX: { label: "Unisex", color: "#047857" },
    BELIRTILMEMIS: { label: "Belirtilmemiş", color: "#57534e" },
  }
  const { label, color } = map[gender] ?? map.BELIRTILMEMIS
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium"
      style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}
    >
      {label}
    </span>
  )
}
