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

export interface AplicacionResuelta {
  prestamo_id: string
  numero: string
  cuotas_count: number
  valor: number
}

export interface LineaResuelta {
  fila: number
  nit: string
  cliente_id: string
  cliente_nombre: string
  fecha_pago: string
  aplicaciones: AplicacionResuelta[]
  datos_fila: Record<string, string>
}

export type BulkPagoResult =
  | { success: true; bulk_pago_id: string; aplicados: number; errores: number }
  | { error: string }

export async function procesarBulkPago(
  templateId: string,
  archivoNombre: string,
  lineas: LineaResuelta[]
): Promise<BulkPagoResult> {
  try {
    const { supabase, userId, ingresadoNombre } = await getAuthorizedClient()

    // Crear cabecera bulk_pago (sin totales aún)
    const { data: bulkPago, error: bulkError } = await supabase
      .from("bulk_pagos")
      .insert({
        template_id: templateId,
        archivo_nombre: archivoNombre,
        usuario_id: userId,
        usuario_nombre: ingresadoNombre,
        total_filas: lineas.length,
        total_pagado: 0,
      })
      .select("id")
      .single()

    if (bulkError || !bulkPago) return { error: bulkError?.message ?? "Error creando registro bulk" }

    const bulkPagoId = bulkPago.id
    let totalPagado = 0
    let aplicados = 0
    let errores = 0

    for (const linea of lineas) {
      const aplicacionesGuardadas: (AplicacionResuelta & { cuotas_aplicadas: number[] })[] = []
      let lineaError: string | null = null

      for (const aplic of linea.aplicaciones) {
        const result = await aplicarCuotasAPrestamo(
          supabase,
          aplic.prestamo_id,
          aplic.cuotas_count,
          linea.fecha_pago,
          bulkPagoId,
          ingresadoNombre
        )

        if (result.error) {
          lineaError = result.error
          break
        }

        totalPagado += result.valor_aplicado
        aplicacionesGuardadas.push({
          ...aplic,
          cuotas_aplicadas: result.cuotas_aplicadas,
          valor: result.valor_aplicado,
        })
      }

      await supabase.from("bulk_pago_lineas").insert({
        bulk_pago_id: bulkPagoId,
        fila: linea.fila,
        nit: linea.nit,
        cliente_id: linea.cliente_id,
        cliente_nombre: linea.cliente_nombre,
        status: lineaError ? "ERROR" : "APLICADO",
        aplicaciones: lineaError ? null : aplicacionesGuardadas,
        datos_fila: linea.datos_fila,
      })

      if (lineaError) errores++
      else aplicados++
    }

    // Actualizar totales en cabecera
    await supabase.from("bulk_pagos")
      .update({ total_pagado: totalPagado })
      .eq("id", bulkPagoId)

    revalidatePath("/pagos/bulk")
    revalidatePath("/pagos/prestamo")
    revalidatePath("/prestamos")

    return { success: true, bulk_pago_id: bulkPagoId, aplicados, errores }
  } catch (e) {
    return { error: (e as Error).message }
  }
}

async function aplicarCuotasAPrestamo(
  supabase: Awaited<ReturnType<typeof createClient>>,
  prestamoId: string,
  nCuotas: number,
  fechaPago: string,
  bulkPagoId: string,
  ingresadoNombre: string
): Promise<{ cuotas_aplicadas: number[]; valor_aplicado: number; error?: string }> {
  const { data: prestamo } = await supabase
    .from("prestamos")
    .select("id, estado, cuotas, cuotas_pagadas, valor_cuota, fecha_inicio, total_pagado")
    .eq("id", prestamoId)
    .single()

  if (!prestamo) return { cuotas_aplicadas: [], valor_aplicado: 0, error: "Préstamo no encontrado" }
  if (prestamo.estado !== "ACTIVA") return { cuotas_aplicadas: [], valor_aplicado: 0, error: `Préstamo en estado ${prestamo.estado}` }

  const cuotasAplicadas: number[] = []
  let cuotasPagadas = prestamo.cuotas_pagadas
  let totalPagado = prestamo.total_pagado ?? 0

  for (let i = 0; i < nCuotas; i++) {
    if (cuotasPagadas >= prestamo.cuotas) break

    const numeroCuota = cuotasPagadas + 1
    const d = new Date(prestamo.fecha_inicio + "T00:00:00")
    d.setMonth(d.getMonth() + cuotasPagadas)
    const fechaEsperada = d.toISOString().split("T")[0]

    const { error: insertError } = await supabase.from("pagos").insert({
      prestamo_id: prestamoId,
      numero_cuota: numeroCuota,
      fecha_esperada: fechaEsperada,
      valor_esperado: prestamo.valor_cuota,
      fecha_pago: fechaPago,
      valor_pagado: prestamo.valor_cuota,
      estado: "PAGADO",
      ingresado_nombre: ingresadoNombre,
      bulk_pago_id: bulkPagoId,
    })

    if (insertError) {
      if (insertError.code === "23505") {
        // cuota ya registrada por race condition, la saltamos
        cuotasPagadas++
        continue
      }
      return { cuotas_aplicadas: cuotasAplicadas, valor_aplicado: cuotasAplicadas.length * prestamo.valor_cuota, error: insertError.message }
    }

    cuotasAplicadas.push(numeroCuota)
    cuotasPagadas++
    totalPagado += prestamo.valor_cuota
  }

  const nuevoEstado = cuotasPagadas >= prestamo.cuotas ? "PAGADA" : "ACTIVA"
  await supabase.from("prestamos")
    .update({ cuotas_pagadas: cuotasPagadas, estado: nuevoEstado, total_pagado: totalPagado })
    .eq("id", prestamoId)

  return {
    cuotas_aplicadas: cuotasAplicadas,
    valor_aplicado: cuotasAplicadas.length * prestamo.valor_cuota,
  }
}
