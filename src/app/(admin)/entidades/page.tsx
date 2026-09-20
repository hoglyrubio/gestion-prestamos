import { createClient } from "@/lib/supabase/server"
import { EntidadesClient } from "./entidades-client"

const PAGE_SIZE = 25

export default async function EntidadesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page: pageParam } = await searchParams
  const page = Math.max(1, Number(pageParam ?? 1))
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const supabase = await createClient()

  const { data, count } = await supabase
    .from("entidades")
    .select("id, nombre, direccion, contacto, numero_contacto", { count: "exact" })
    .order("nombre", { ascending: true })
    .range(from, to)

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  return (
    <EntidadesClient
      entidades={data ?? []}
      page={page}
      totalPages={totalPages}
    />
  )
}
