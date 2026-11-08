"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useEffect, useRef, useState, useTransition } from "react"
import { Search, Loader2, X } from "lucide-react"

export function SearchInput({ defaultValue }: { defaultValue?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [value, setValue] = useState(defaultValue ?? "")
  const [pending, startTransition] = useTransition()
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])

  function push(next: string) {
    const params = new URLSearchParams(searchParams.toString())
    const trimmed = next.trim()
    if (trimmed) params.set("q", trimmed)
    else params.delete("q")
    const qs = params.toString()
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }))
  }

  function onChange(next: string) {
    setValue(next)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => push(next), 300)
  }

  return (
    <form
      role="search"
      className="relative max-w-sm w-full"
      onSubmit={(e) => {
        e.preventDefault()
        if (timer.current) clearTimeout(timer.current)
        push(value)
      }}
    >
      <label htmlFor="catalog-search" className="sr-only">
        Parfüm, marka veya nota ara
      </label>
      {pending ? (
        <Loader2 size={14} aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 animate-spin" style={{ color: "var(--gold)" }} />
      ) : (
        <Search size={14} aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "rgba(255,255,255,0.45)" }} />
      )}
      <input
        id="catalog-search"
        type="search"
        value={value}
        maxLength={100}
        placeholder="Parfüm, marka veya nota ara..."
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-9 pr-9 py-2 rounded-full text-sm outline-none transition-colors bg-white/[0.07] border border-white/[0.15] focus:bg-white/10 focus:border-[rgba(201,168,92,0.6)] placeholder:text-[#a39a8a] [&::-webkit-search-cancel-button]:hidden"
        style={{ color: "var(--ivory)", caretColor: "var(--gold)" }}
      />
      {value && (
        <button
          type="button"
          aria-label="Aramayı temizle"
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/10"
          style={{ color: "var(--text-muted-warm)" }}
        >
          <X size={14} />
        </button>
      )}
    </form>
  )
}
