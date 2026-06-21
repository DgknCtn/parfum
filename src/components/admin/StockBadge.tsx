import { Badge } from "@/components/ui/badge"

interface StockBadgeProps {
  status: "MEVCUT" | "AZ_STOK" | "BITTI" | "YETERSIZ" | "TUTARSIZ"
}

const config = {
  MEVCUT: { label: "Mevcut", style: { background: "rgba(34,197,94,0.15)", color: "#16a34a", border: "1px solid rgba(34,197,94,0.3)" } },
  AZ_STOK: { label: "Az Stok", style: { background: "rgba(234,179,8,0.15)", color: "#ca8a04", border: "1px solid rgba(234,179,8,0.3)" } },
  BITTI: { label: "Bitti", style: { background: "rgba(239,68,68,0.15)", color: "#dc2626", border: "1px solid rgba(239,68,68,0.3)" } },
  YETERSIZ: { label: "Yetersiz", style: { background: "rgba(249,115,22,0.15)", color: "#ea580c", border: "1px solid rgba(249,115,22,0.3)" } },
  TUTARSIZ: { label: "Tutarsız", style: { background: "rgba(139,92,246,0.15)", color: "#7c3aed", border: "1px solid rgba(139,92,246,0.3)" } },
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
    KADIN: { label: "Kadın", color: "#c026d3" },
    ERKEK: { label: "Erkek", color: "#2563eb" },
    UNISEX: { label: "Unisex", color: "#059669" },
    BELIRTILMEMIS: { label: "—", color: "#6b7280" },
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
