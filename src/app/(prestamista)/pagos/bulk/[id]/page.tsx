import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { DetailClient } from "./detail-client"

export default async function BulkDetalleePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: bulkPago }, { data: lineas }] = await Promise.all([
    supabase
      .from("bulk_pagos")
      .select(`
        id, created_at, archivo_nombre, usuario_nombre,
        total_filas, total_pagado,
        template:bulk_pagos_templates(nombre)
      `)
      .eq("id", id)
      .single(),

    supabase
      .from("bulk_pago_lineas")
      .select("id, fila, nit, cliente_nombre, status, aplicaciones, datos_fila")
      .eq("bulk_pago_id", id)
      .order("fila", { ascending: true }),
  ])

  if (!bulkPago) notFound()

  return (
    <DetailClient
      bulkPago={bulkPago as any}
      lineas={lineas ?? []}
    />
  )
}
