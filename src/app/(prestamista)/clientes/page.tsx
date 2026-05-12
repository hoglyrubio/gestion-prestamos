import { createClient } from "@/lib/supabase/server"
import { ClientesClient } from "./clientes-client"

export default async function ClientesPage() {
  const supabase = await createClient()

  const [{ data: clientes }, { data: entidades }] = await Promise.all([
    supabase
      .from("clientes")
      .select("id, documento, nombres, apellidos, direccion, telefono, entidad_id, entidad:entidades(nombre)")
      .order("apellidos", { ascending: true }),
    supabase
      .from("entidades")
      .select("id, nombre")
      .order("nombre", { ascending: true }),
  ])

  return (
    <ClientesClient
      clientes={(clientes ?? []) as any}
      entidades={entidades ?? []}
    />
  )
}
