"use client"

import { useEffect, useState } from "react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"
import { TrendingUp, Droplets, Clock } from "lucide-react"
import Link from "next/link"

interface MonthlyData { month: string; count: number }
interface EssenceData { name: string; totalMl: number }
interface AgingItem { id: string; name: string; slug: string; agingDays: number; readyDate: string; daysLeft: number }

interface StatsData {
  monthlyProduction: MonthlyData[]
  topEssences: EssenceData[]
  agingItems: AgingItem[]
}

export function DashboardCharts() {
  const [data, setData] = useState<StatsData | null>(null)

  useEffect(() => {
    fetch("/api/admin/dashboard/stats").then(r => r.ok ? r.json() : null).then(setData)
  }, [])

  if (!data) return null

  const maxCount = Math.max(...data.monthlyProduction.map(d => d.count), 1)

  return (
    <div className="space-y-6">
      {/* Monthly Production Chart */}
      <div className="rounded-xl border p-5" style={{ borderColor: "var(--border)", background: "#fff" }}>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={16} style={{ color: "var(--gold)" }} />
          <h2 className="text-base font-serif" style={{ color: "var(--charcoal)", fontFamily: "var(--font-gloock)" }}>
            Aylık Üretim
          </h2>
          <span className="text-xs ml-auto" style={{ color: "var(--text-muted-warm)" }}>Son 12 ay</span>
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={data.monthlyProduction} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: "var(--text-muted-warm)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "var(--text-muted-warm)" }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{ background: "var(--obsidian)", border: "none", borderRadius: 8, color: "var(--ivory)", fontSize: 12 }}
              cursor={{ fill: "rgba(201,168,92,0.08)" }}
              formatter={(v) => [`${v} üretim`, ""]}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {data.monthlyProduction.map((entry, i) => (
                <Cell key={i} fill={entry.count === maxCount ? "var(--gold)" : "rgba(201,168,92,0.35)"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Essences */}
        {data.topEssences.length > 0 && (
          <div className="rounded-xl border p-5" style={{ borderColor: "var(--border)", background: "#fff" }}>
            <div className="flex items-center gap-2 mb-4">
              <Droplets size={16} style={{ color: "#60a5fa" }} />
              <h2 className="text-base font-serif" style={{ color: "var(--charcoal)", fontFamily: "var(--font-gloock)" }}>
                En Çok Kullanılan
              </h2>
            </div>
            <div className="space-y-3">
              {data.topEssences.map((e, i) => {
                const pct = (e.totalMl / data.topEssences[0].totalMl) * 100
                return (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{ color: "var(--charcoal)" }}>{e.name}</span>
                      <span className="font-mono" style={{ color: "var(--text-muted-warm)" }}>{e.totalMl} ml</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: i === 0 ? "#60a5fa" : "rgba(96,165,250,0.4)" }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Aging / Dinlendirme */}
        {data.agingItems.length > 0 && (
          <div className="rounded-xl border p-5" style={{ borderColor: "var(--border)", background: "#fff" }}>
            <div className="flex items-center gap-2 mb-4">
              <Clock size={16} style={{ color: "#a78bfa" }} />
              <h2 className="text-base font-serif" style={{ color: "var(--charcoal)", fontFamily: "var(--font-gloock)" }}>
                Dinlendirme Takvimi
              </h2>
            </div>
            <div className="space-y-2.5">
              {data.agingItems.map(item => {
                const isReady = item.daysLeft <= 0
                return (
                  <Link key={item.id} href={`/admin/perfumes/${item.id}`}>
                    <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:opacity-80 transition-opacity" style={{ background: "var(--ivory)" }}>
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: isReady ? "#34d399" : item.daysLeft <= 7 ? "#facc15" : "#a78bfa" }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate" style={{ color: "var(--charcoal)" }}>{item.name}</p>
                        <p className="text-[10px]" style={{ color: "var(--text-muted-warm)" }}>
                          {new Date(item.readyDate).toLocaleDateString("tr-TR")} · {item.agingDays} gün
                        </p>
                      </div>
                      <span className="text-[11px] px-2 py-0.5 rounded-full shrink-0" style={{
                        background: isReady ? "rgba(52,211,153,0.12)" : item.daysLeft <= 7 ? "rgba(250,204,21,0.12)" : "rgba(167,139,250,0.12)",
                        color: isReady ? "#059669" : item.daysLeft <= 7 ? "#b45309" : "#7c3aed",
                      }}>
                        {isReady ? "Hazır" : `${item.daysLeft}g kaldı`}
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
