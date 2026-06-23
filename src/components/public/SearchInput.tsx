"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useTransition } from "react"
import { Search } from "lucide-react"

export function SearchInput({ defaultValue }: { defaultValue?: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const handleChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set("q", value)
      } else {
        params.delete("q")
      }
      startTransition(() => {
        router.replace(`/?${params.toString()}`)
      })
    },
    [router, searchParams]
  )

  let debounceTimer: ReturnType<typeof setTimeout>

  return (
    <div className="relative max-w-sm w-full">
      <Search
        size={14}
        className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
        style={{ color: "rgba(255,255,255,0.3)" }}
      />
      <input
        type="search"
        defaultValue={defaultValue}
        placeholder="Parfüm veya marka ara..."
        onChange={(e) => {
          clearTimeout(debounceTimer)
          debounceTimer = setTimeout(() => handleChange(e.target.value), 300)
        }}
        className="w-full pl-9 pr-3 py-2 rounded-full text-sm outline-none transition-all"
        style={{
          background: "rgba(255,255,255,0.07)",
          border: "1px solid rgba(255,255,255,0.12)",
          color: "var(--ivory)",
          caretColor: "var(--gold)",
        }}
        onFocus={(e) => {
          e.target.style.background = "rgba(255,255,255,0.1)"
          e.target.style.borderColor = "rgba(201,168,92,0.4)"
        }}
        onBlur={(e) => {
          e.target.style.background = "rgba(255,255,255,0.07)"
          e.target.style.borderColor = "rgba(255,255,255,0.12)"
        }}
      />
    </div>
  )
}
