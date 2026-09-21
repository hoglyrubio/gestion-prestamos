import { createClient } from "@/lib/supabase/server"
import { ClientesClient } from "./clientes-client"

const PAGE_SIZE = 25

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page: pageParam } = await searchParams
  const page = Math.max(1, Number(pageParam ?? 1))
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const supabase = await createClient()

  const [{ data: clientes, count }, { data: entidades }] = await Promise.all([
    supabase
      .from("clientes")
      .select(
        "id, documento, nombre, direccion, telefono, entidad_id, entidad:entidades(nombre)",
        { count: "exact" }
      )
      .order("nombre", { ascending: true })
      .range(from, to),
    supabase
      .from("entidades")
      .select("id, nombre")
      .order("nombre", { ascending: true }),
  ])

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  return (
    <ClientesClient
      clientes={(clientes ?? []) as any}
      entidades={entidades ?? []}
      page={page}
      totalPages={totalPages}
    />
  )
}
