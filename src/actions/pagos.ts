"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

async function getAuthorizedClient() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("No autenticado")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, status, full_name")
    .eq("id", user.id)
    .single()

  const allowed =
    profile?.status === "ACTIVE" &&
    (profile?.role === "PRESTAMISTA" || profile?.role === "ADMIN")

  if (!allowed) throw new Error("Sin permisos")
  return {
    supabase,
    userId: user.id,
    ingresadoNombre: profile?.full_name ?? user.email ?? "Sistema",
  }
}

export type PagoFormState = { error?: string; success?: boolean }

// ── Registrar pago (crea nueva fila, incrementa cuotas_pagadas) ───────────────
export async function registrarPago(
  _prev: PagoFormState,
  formData: FormData
): Promise<PagoFormState> {
  try {
    const { supabase, ingresadoNombre } = await getAuthorizedClient()

    const prestamo_id  = formData.get("prestamo_id") as string
    const fecha_pago   = formData.get("fecha_pago") as string
    const valor_pagado = parseFloat(formData.get("valor_pagado") as string)
    const notas        = (formData.get("notas") as string) || null

    if (!fecha_pago) return { error: "La fecha de pago es obligatoria" }
    if (isNaN(valor_pagado) || valor_pagado <= 0) return { error: "El valor pagado debe ser mayor a 0" }

    const { data: prestamo } = await supabase
      .from("prestamos")
      .select("id, estado, cuotas, cuotas_pagadas, valor_cuota, fecha_inicio, total_pagado")
      .eq("id", prestamo_id)
      .single()

    if (!prestamo) return { error: "Préstamo no encontrado" }
    if (prestamo.estado !== "ACTIVA")
      return { error: `No se pueden registrar pagos en un préstamo con estado ${prestamo.estado}` }
    if (prestamo.cuotas_pagadas >= prestamo.cuotas)
      return { error: "Este préstamo ya tiene todas las cuotas pagadas" }

    const numero_cuota = prestamo.cuotas_pagadas + 1
    const d = new Date(prestamo.fecha_inicio + "T00:00:00")
    d.setMonth(d.getMonth() + prestamo.cuotas_pagadas)
    const fecha_esperada = d.toISOString().split("T")[0]

    const { error: insertError } = await supabase.from("pagos").insert({
      prestamo_id,
      numero_cuota,
      fecha_esperada,
      valor_esperado: prestamo.valor_cuota,
      fecha_pago,
      valor_pagado,
      notas,
      estado: "PAGADO",
      ingresado_nombre: ingresadoNombre,
    })

    if (insertError) {
      // Unique constraint: otro proceso ya registró esta cuota (doble envío)
      if (insertError.code === "23505")
        return { error: "Esta cuota ya fue registrada. Recarga la página e intenta de nuevo." }
      return { error: insertError.message }
    }

    const nuevas_pagadas = prestamo.cuotas_pagadas + 1
    const nuevoEstado = nuevas_pagadas >= prestamo.cuotas ? "PAGADA" : "ACTIVA"
    await supabase.from("prestamos")
      .update({
        cuotas_pagadas: nuevas_pagadas,
        estado: nuevoEstado,
        total_pagado: (prestamo.total_pagado ?? 0) + valor_pagado,
      })
      .eq("id", prestamo_id)

    revalidatePath("/pagos")
    revalidatePath("/pagos/prestamo")
    revalidatePath("/prestamos")
    return { success: true }
  } catch (e) {
    return { error: (e as Error).message }
  }
}

// ── Anular pago (elimina la fila, decrementa cuotas_pagadas) ──────────────────
export async function anularPago(
  _prev: PagoFormState,
  formData: FormData
): Promise<PagoFormState> {
  try {
    const { supabase } = await getAuthorizedClient()

    const id = formData.get("id") as string

    const { data: pago } = await supabase
      .from("pagos")
      .select("prestamo_id, numero_cuota, valor_pagado")
      .eq("id", id)
      .single()

    if (!pago) return { error: "Pago no encontrado" }

    // Solo se puede anular el último pago registrado
    const { data: ultimo } = await supabase
      .from("pagos")
      .select("id")
      .eq("prestamo_id", pago.prestamo_id)
      .order("numero_cuota", { ascending: false })
      .limit(1)
      .single()

    if (ultimo?.id !== id)
      return { error: "Solo se puede anular el último pago registrado (cuota más reciente)" }

    const { data: prestamo } = await supabase
      .from("prestamos")
      .select("cuotas_pagadas, total_pagado")
      .eq("id", pago.prestamo_id)
      .single()

    const { error: deleteError, count: deleteCount } = await supabase
      .from("pagos")
      .delete({ count: "exact" })
      .eq("id", id)

    if (deleteError) return { error: deleteError.message }
    if (!deleteCount || deleteCount === 0)
      return { error: "No se pudo eliminar el pago. Verifica tus permisos." }

    await supabase.from("prestamos")
      .update({
        cuotas_pagadas: Math.max(0, (prestamo?.cuotas_pagadas ?? 1) - 1),
        estado: "ACTIVA",
        total_pagado: Math.max(0, (prestamo?.total_pagado ?? 0) - (pago.valor_pagado ?? 0)),
      })
      .eq("id", pago.prestamo_id)

    revalidatePath("/pagos")
    revalidatePath("/pagos/prestamo")
    revalidatePath("/prestamos")
    return { success: true }
  } catch (e) {
    return { error: (e as Error).message }
  }
}
