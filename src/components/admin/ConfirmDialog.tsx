"use client"

import { createContext, useCallback, useContext, useRef, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

type ConfirmOptions = {
  title: string
  description?: React.ReactNode
  confirmLabel?: string
  destructive?: boolean
  /** Doluysa kullanıcıdan zorunlu açıklama ister; sonuç olarak metin döner. */
  reasonLabel?: string
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<false | { reason: string }>

const Ctx = createContext<ConfirmFn | null>(null)

/** Tarayıcının confirm() penceresi yerine erişilebilir, stilli onay diyaloğu. */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null)
  const [reason, setReason] = useState("")
  const resolver = useRef<((v: false | { reason: string }) => void) | null>(null)

  const confirm = useCallback<ConfirmFn>((o) => {
    setReason("")
    setOpts(o)
    return new Promise((resolve) => {
      resolver.current = resolve
    })
  }, [])

  function close(result: false | { reason: string }) {
    resolver.current?.(result)
    resolver.current = null
    setOpts(null)
  }

  const reasonMissing = !!opts?.reasonLabel && reason.trim().length < 3

  return (
    <Ctx.Provider value={confirm}>
      {children}
      <Dialog open={!!opts} onOpenChange={(o) => !o && close(false)}>
        <DialogContent className="max-w-sm" style={{ background: "var(--ivory)", borderColor: "var(--border)" }}>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "var(--font-gloock)", color: "var(--charcoal)" }}>{opts?.title}</DialogTitle>
            {opts?.description && <DialogDescription style={{ color: "var(--text-muted-warm)" }}>{opts.description}</DialogDescription>}
          </DialogHeader>
          {opts?.reasonLabel && (
            <div className="space-y-1.5">
              <Label htmlFor="confirm-reason" className="text-xs" style={{ color: "var(--text-muted-warm)" }}>
                {opts.reasonLabel}
              </Label>
              <Textarea id="confirm-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
            </div>
          )}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => close(false)}>
              Vazgeç
            </Button>
            <Button
              disabled={reasonMissing}
              onClick={() => close({ reason: reason.trim() })}
              style={{ background: opts?.destructive ? "#b91c1c" : "var(--charcoal)", color: "#fff" }}
            >
              {opts?.confirmLabel ?? "Onayla"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Ctx.Provider>
  )
}

export function useConfirm() {
  const fn = useContext(Ctx)
  if (!fn) throw new Error("useConfirm must be used within ConfirmProvider")
  return fn
}
