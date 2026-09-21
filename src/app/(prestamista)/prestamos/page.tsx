import { createClient } from "@/lib/supabase/server"
import { PrestamosClient } from "./prestamos-client"

const PAGE_SIZE = 25

export default async function PrestamosPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page: pageParam } = await searchParams
  const page = Math.max(1, Number(pageParam ?? 1))
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const supabase = await createClient()

  const [{ data: prestamos, count }, { data: clientes }, { data: entidades }] = await Promise.all([
    supabase
      .from("prestamos")
      .select(`
        id, tipo, numero, cliente_id, entidad_id, fecha, fecha_inicio,
        capital, tasa_interes, cuotas, valor_cuota, estado,
        cliente:clientes(nombre),
        entidad:entidades(nombre),
        adjuntos:prestamo_adjuntos(id, url, nombre)
      `, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to),
    supabase
      .from("clientes")
      .select("id, nombre, documento")
      .order("nombre", { ascending: true }),
    supabase
      .from("entidades")
      .select("id, nombre")
      .order("nombre", { ascending: true }),
  ])

  // Stats globales sin paginar
  const { data: statsData } = await supabase
    .from("prestamos")
    .select("estado, capital, valor_cuota")

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  return (
    <PrestamosClient
      prestamos={(prestamos ?? []) as any}
      clientes={clientes ?? []}
      entidades={entidades ?? []}
      stats={(statsData ?? []) as any}
      page={page}
      totalPages={totalPages}
    />
  )
}
