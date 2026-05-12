import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")

  // Creamos la respuesta de redirect antes de construir el cliente,
  // para que setAll pueda escribir cookies directamente en la respuesta
  // (en Route Handlers las cookies del cookieStore son read-only)
  const redirectTo = `${origin}/`
  const response = NextResponse.redirect(redirectTo)

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=no_code`)
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Escribimos en la response, no en el cookieStore (read-only aquí)
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code)

  if (sessionError) {
    console.error("exchangeCodeForSession error:", sessionError.message)
    return NextResponse.redirect(`${origin}/login?error=session`)
  }

  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .single()

    if (!existingProfile) {
      const { error: insertError } = await supabase.from("profiles").insert({
        id: user.id,
        email: user.email ?? "",
        full_name: user.user_metadata?.full_name ?? null,
        role: null,
        status: "PENDING",
      })

      if (insertError) {
        console.error("Error creando perfil:", insertError.message)
      }
    }
  }

  return response
}
