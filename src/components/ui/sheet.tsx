"use client"

import { ReactNode } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function Sheet({
  title, onClose, children,
}: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div
      className="fixed inset-0 bg-foreground/40 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-background border border-border w-full sm:max-w-md rounded-2xl sm:rounded-xl shadow-xl max-h-[85dvh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <h3 className="text-base font-semibold text-foreground truncate pr-4">{title}</h3>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <X />
          </Button>
        </div>
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {children}
        </div>
      </div>
    </div>
  )
}

export function Modal({
  title, onClose, children, wide,
}: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div
      className="fixed inset-0 bg-foreground/40 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={cn(
        "bg-background border border-border w-full rounded-2xl sm:rounded-xl shadow-xl max-h-[92dvh] overflow-y-auto",
        wide ? "sm:max-w-2xl" : "sm:max-w-lg",
      )}>
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border">
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <X />
          </Button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

export function Field({
  label, value, mono, badge, badgeCls,
}: {
  label: string; value: string | null | undefined
  mono?: boolean; badge?: boolean; badgeCls?: string
}) {
  const display = value ?? "—"
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-muted-foreground flex-shrink-0">{label}</span>
      {badge ? (
        <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", badgeCls ?? "bg-secondary text-secondary-foreground")}>
          {display}
        </span>
      ) : (
        <span className={cn("text-foreground text-right", mono ? "font-mono" : "font-medium")}>
          {display}
        </span>
      )}
    </div>
  )
}
