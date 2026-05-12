import { createClient } from "@/lib/supabase/server"
import { PrestamosClient } from "./prestamos-client"

export default async function PrestamosPage() {
  const supabase = await createClient()

  const [{ data: prestamos }, { data: clientes }] = await Promise.all([
    supabase
      .from("prestamos")
      .select(`
        id, tipo, numero, cliente_id, fecha, fecha_inicio,
        capital, tasa_interes, cuotas, valor_cuota,
        estado, foto_url,
        cliente:clientes(nombres, apellidos)
      `)
      .order("created_at", { ascending: false }),
    supabase
      .from("clientes")
      .select("id, nombres, apellidos, documento")
      .order("apellidos", { ascending: true }),
  ])

  return (
    <PrestamosClient
      prestamos={(prestamos ?? []) as any}
      clientes={clientes ?? []}
    />
  )
}
