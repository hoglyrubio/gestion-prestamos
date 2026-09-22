import { createClient } from "@/lib/supabase/server"
import { PagoPrestamo } from "./pago-prestamo-client"

export default async function PagoPrestamoPage({
  searchParams,
}: {
  searchParams: Promise<{ prestamo_id?: string }>
}) {
  const { prestamo_id } = await searchParams
  const supabase = await createClient()

  const [{ data: prestamos }, detailResult] = await Promise.all([
    supabase
      .from("prestamos")
      .select(`
        id, numero, tipo, cuotas, cuotas_pagadas, valor_cuota,
        total_pagado, fecha_inicio,
        cliente:clientes(nombre)
      `)
      .eq("estado", "ACTIVA")
      .order("created_at", { ascending: false }),

    prestamo_id
      ? supabase
          .from("prestamos")
          .select(`
            id, numero, tipo, capital, tasa_interes,
            cuotas, cuotas_pagadas, valor_cuota, total_pagado,
            fecha, fecha_inicio,
            cliente:clientes(nombre),
            entidad:entidades(nombre),
            pagos(
              id, numero_cuota, fecha_pago, valor_pagado,
              notas, ingresado_nombre, created_at
            )
          `)
          .eq("id", prestamo_id)
          .order("numero_cuota", { referencedTable: "pagos", ascending: true })
          .single()
      : Promise.resolve({ data: null }),
  ])

  return (
    <PagoPrestamo
      prestamos={(prestamos ?? []) as any}
      selected={(detailResult.data ?? null) as any}
      prestamoId={prestamo_id ?? null}
    />
  )
}
