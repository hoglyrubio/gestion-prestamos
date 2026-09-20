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
  const mes = new Date().toISOString().slice(0, 7)

  const [prestamosRes, historialRes, statsActivosRes, recaudoRes] = await Promise.all([
    // Tab "Por cobrar": préstamos activos con cuotas pendientes (paginados)
    supabase
      .from("prestamos")
      .select(`
        id, numero, tipo, cuotas, cuotas_pagadas, valor_cuota, fecha_inicio, estado,
        cliente:clientes(nombres, apellidos)
      `, { count: "exact" })
      .eq("estado", "ACTIVA")
      .order("fecha_inicio", { ascending: true })
      .range(from, to),

    // Tab "Historial": últimos 50 pagos registrados
    supabase
      .from("pagos")
      .select(`
        id, numero_cuota, fecha_pago, valor_pagado, notas, prestamo_id,
        prestamo:prestamos(numero, cliente:clientes(nombres, apellidos))
      `)
      .order("fecha_pago", { ascending: false })
      .limit(50),

    // Stats: todos los préstamos activos (para calcular vencidas en cliente)
    supabase
      .from("prestamos")
      .select("cuotas, cuotas_pagadas, fecha_inicio")
      .eq("estado", "ACTIVA"),

    // Stats: recaudo del mes actual
    supabase
      .from("pagos")
      .select("valor_pagado")
      .gte("fecha_pago", mes + "-01"),
  ])

  const totalPages = Math.ceil(((prestamosRes.count ?? 0) / PAGE_SIZE))
  const recaudoMes = (recaudoRes.data ?? []).reduce((s, p) => s + (p.valor_pagado ?? 0), 0)

  return (
    <PagosClient
      prestamos={(prestamosRes.data ?? []) as any}
      historial={(historialRes.data ?? []) as any}
      statsActivos={(statsActivosRes.data ?? []) as any}
      recaudoMes={recaudoMes}
      page={page}
      totalPages={totalPages}
    />
  )
}
