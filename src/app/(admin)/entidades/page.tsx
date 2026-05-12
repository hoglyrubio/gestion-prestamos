import { createClient } from "@/lib/supabase/server"
import { EntidadesClient } from "./entidades-client"

export default async function EntidadesPage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from("entidades")
    .select("id, nombre, direccion, contacto, numero_contacto")
    .order("nombre", { ascending: true })

  return <EntidadesClient entidades={data ?? []} />
}
