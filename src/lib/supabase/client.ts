import { createBrowserClient } from "@supabase/ssr"

// TODO: reemplazar con `createBrowserClient<Database>` una vez ejecutado `supabase gen types`
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
