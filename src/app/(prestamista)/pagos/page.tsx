import { createClient } from "@/lib/supabase/server"
import { PagosClient } from "./pagos-client"

const PAGE_SIZE = 25

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

  const [prestamosRes, historialRes, statsRes] = await Promise.all([
    // Tab "Por cobrar": préstamos activos con cuotas pendientes (paginados)
    supabase
      .from("prestamos")
      .select(`
        id, numero, tipo, cuotas, cuotas_pagadas, valor_cuota, fecha_inicio, estado,
        cliente:clientes(nombre)
      `, { count: "exact" })
      .eq("estado", "ACTIVA")
      .order("fecha_inicio", { ascending: true })
      .range(from, to),

    // Tab "Historial": últimos 50 pagos registrados
    supabase
      .from("pagos")
      .select(`
        id, numero_cuota, fecha_pago, valor_pagado, notas, prestamo_id,
        prestamo:prestamos(numero, cliente:clientes(nombre))
      `)
      .order("fecha_pago", { ascending: false })
      .limit(50),

    // Stats agregadas en Postgres (migración 20261012000000)
    supabase.rpc("pagos_stats"),
  ])

  const totalPages = Math.ceil(((prestamosRes.count ?? 0) / PAGE_SIZE))
  const stats = statsRes.data?.[0] ?? { activos: 0, vencidas: 0, recaudo_mes: 0 }

  return (
    <PagosClient
      prestamos={(prestamosRes.data ?? []) as any}
      historial={(historialRes.data ?? []) as any}
      activos={Number(stats.activos)}
      vencidas={Number(stats.vencidas)}
      recaudoMes={Number(stats.recaudo_mes)}
      page={page}
      totalPages={totalPages}
    />
  )
}
