import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"

// Usuarios RECHAZADOS: cierra la sesión y vuelve a /login. Antes lo hacía el
// proxy; los Server Components no pueden escribir cookies, un Route Handler sí.
export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/login", request.url))

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  await supabase.auth.signOut()
  return response
}
