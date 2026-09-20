"use client"

import { useActionState, useEffect } from "react"
import { registrarPago, type PagoFormState } from "@/actions/pagos"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

interface Pago {
  id: string; numero_cuota: number; fecha_esperada: string
  valor_esperado: number; valor_pagado: number | null; notas: string | null
  prestamo: { numero: string }
  cliente: { nombres: string; apellidos: string }
}

const COP = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n)

const initial: PagoFormState = {}

export function PagoForm({ pago, onClose }: { pago: Pago; onClose: () => void }) {
  const [state, formAction, pending] = useActionState(registrarPago, initial)
  useEffect(() => { if (state.success) onClose() }, [state.success, onClose])

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="id" value={pago.id} />

      <div className="bg-muted/50 border border-border rounded-lg px-4 py-3 text-sm space-y-1.5">
        {[
          ["Préstamo", pago.prestamo.numero],
          ["Cliente", `${pago.cliente.nombres} ${pago.cliente.apellidos}`],
          ["Cuota", `#${pago.numero_cuota}`],
          ["Fecha esperada", pago.fecha_esperada],
          ["Valor esperado", COP(pago.valor_esperado)],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between">
            <span className="text-muted-foreground">{k}</span>
            <span className="font-medium text-foreground">{v}</span>
          </div>
        ))}
      </div>

      <div className="space-y-1.5">
        <Label>Fecha de pago <span className="text-destructive">*</span></Label>
        <Input type="date" name="fecha_pago" defaultValue={new Date().toISOString().split("T")[0]} />
      </div>

      <div className="space-y-1.5">
        <Label>Valor pagado <span className="text-destructive">*</span></Label>
        <Input type="number" name="valor_pagado"
          defaultValue={pago.valor_pagado ?? pago.valor_esperado}
          min="0" step="1000" inputMode="numeric" />
      </div>

      <div className="space-y-1.5">
        <Label>Notas <span className="text-muted-foreground font-normal">(opcional)</span></Label>
        <textarea name="notas" rows={2} placeholder="Observaciones del pago…"
          className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/50 resize-none placeholder:text-muted-foreground" />
      </div>

      {state.error && (
        <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{state.error}</p>
      )}

      <div className="flex justify-end gap-2 pt-2 border-t border-border">
        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Registrar pago"}
        </Button>
      </div>
    </form>
  )
}
