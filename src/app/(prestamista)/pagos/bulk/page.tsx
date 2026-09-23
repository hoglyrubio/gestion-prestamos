import { createClient } from "@/lib/supabase/server"
import { BulkClient } from "./bulk-client"

const PAGE_SIZE = 20

export default async function PagosBulkPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page: pageParam } = await searchParams
  const page = Math.max(1, Number(pageParam ?? 1))
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const supabase = await createClient()

  const [{ data: bulkPagos, count }, { data: templates }] = await Promise.all([
    supabase
      .from("bulk_pagos")
      .select(`
        id, created_at, archivo_nombre, usuario_nombre,
        total_filas, total_pagado,
        template:bulk_pagos_templates(nombre)
      `, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to),

    supabase
      .from("bulk_pagos_templates")
      .select("id, nombre, template")
      .order("nombre"),
  ])

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  return (
    <BulkClient
      bulkPagos={(bulkPagos ?? []) as any}
      templates={templates ?? []}
      page={page}
      totalPages={totalPages}
    />
  )
}
