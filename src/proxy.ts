import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  // Rutas públicas: no requieren sesión
  if (pathname.startsWith("/login") || pathname.startsWith("/auth/")) {
    if (user && pathname.startsWith("/login")) {
      return NextResponse.redirect(new URL("/", request.url))
    }
    return supabaseResponse
  }

  // Sin sesión → login
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // Verificar estado y rol del perfil
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("id", user.id)
    .single()

  // Sin perfil o pendiente → página de espera
  if (!profile || profile.status === "PENDING") {
    if (!pathname.startsWith("/pending")) {
      return NextResponse.redirect(new URL("/pending", request.url))
    }
    return supabaseResponse
  }

  // Rechazado → login
  if (profile.status === "REJECTED") {
    await supabase.auth.signOut()
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // Rutas de admin solo para ADMIN
  if (pathname.startsWith("/usuarios") || pathname.startsWith("/entidades")) {
    if (profile.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", request.url))
    }
  }

  // Clientes y préstamos: PRESTAMISTA y ADMIN
  if (pathname.startsWith("/clientes") || pathname.startsWith("/prestamos")) {
    if (profile.role !== "PRESTAMISTA" && profile.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
