import { createClient } from "@/lib/supabase/server"
import { PagosClient } from "./pagos-client"

const PAGE_SIZE = 50

export default async function PagosPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page: pageParam } = await searchParams
  const page = Math.max(1, Number(pageParam ?? 1))
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const supabase = await createClient()

  const { data: pagos, count } = await supabase
    .from("pagos")
    .select(`
      id, numero_cuota, fecha_esperada, valor_esperado,
      fecha_pago, valor_pagado, notas, estado, prestamo_id,
      prestamo:prestamos(
        numero,
        cliente:clientes(nombres, apellidos)
      )
    `, { count: "exact" })
    .order("fecha_esperada", { ascending: true })
    .range(from, to)

  // Stats globales (sin paginar — solo conteos, no filas)
  const { data: stats } = await supabase
    .from("pagos")
    .select("estado, fecha_pago, valor_pagado, fecha_esperada")

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  return (
    <PagosClient
      pagos={(pagos ?? []) as any}
      stats={(stats ?? []) as any}
      page={page}
      totalPages={totalPages}
    />
  )
}
