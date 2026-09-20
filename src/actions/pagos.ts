"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

async function getAuthorizedClient() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("No autenticado")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("id", user.id)
    .single()

  const allowed =
    profile?.status === "ACTIVE" &&
    (profile?.role === "PRESTAMISTA" || profile?.role === "ADMIN")

  if (!allowed) throw new Error("Sin permisos")
  return { supabase, userId: user.id }
}

export type PagoFormState = { error?: string; success?: boolean }

// ── Registrar pago ────────────────────────────────────────────────────────────
export async function registrarPago(
  _prev: PagoFormState,
  formData: FormData
): Promise<PagoFormState> {
  try {
    const { supabase } = await getAuthorizedClient()

    const id          = formData.get("id") as string
    const fecha_pago  = formData.get("fecha_pago") as string
    const valor_pagado = parseFloat(formData.get("valor_pagado") as string)
    const notas       = (formData.get("notas") as string) || null

    if (!fecha_pago) return { error: "La fecha de pago es obligatoria" }
    if (isNaN(valor_pagado) || valor_pagado <= 0) return { error: "El valor pagado debe ser mayor a 0" }

    const { error } = await supabase
      .from("pagos")
      .update({ fecha_pago, valor_pagado, notas, estado: "PAGADO" })
      .eq("id", id)

    if (error) return { error: error.message }

    revalidatePath("/pagos")
    return { success: true }
  } catch (e) {
    return { error: (e as Error).message }
  }
}

// ── Anular pago (volver a PENDIENTE) ─────────────────────────────────────────
export async function anularPago(
  _prev: PagoFormState,
  formData: FormData
): Promise<PagoFormState> {
  try {
    const { supabase } = await getAuthorizedClient()

    const id = formData.get("id") as string

    const { error } = await supabase
      .from("pagos")
      .update({ fecha_pago: null, valor_pagado: null, notas: null, estado: "PENDIENTE" })
      .eq("id", id)

    if (error) return { error: error.message }

    revalidatePath("/pagos")
    return { success: true }
  } catch (e) {
    return { error: (e as Error).message }
  }
}
