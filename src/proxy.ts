import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { isAdminUser } from "@/lib/admin-emails"
import { supabaseEnv } from "@/lib/env"

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    supabaseEnv().url,
    supabaseEnv().anonKey,
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

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isAdminRoute = request.nextUrl.pathname.startsWith("/admin")
  const isLoginRoute = request.nextUrl.pathname.startsWith("/login")

  const isAdmin = isAdminUser(user)

  if (isAdminRoute && !isAdmin) {
    const url = new URL("/login", request.url)
    if (user) url.searchParams.set("hata", "yetki")
    return NextResponse.redirect(url)
  }

  // Şifre sıfırlama sayfaları oturumlu kullanıcıya da açık olmalı
  const isResetRoute = request.nextUrl.pathname.startsWith("/login/sifre")
  if (isLoginRoute && isAdmin && !isResetRoute) {
    return NextResponse.redirect(new URL("/admin/dashboard", request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ["/admin/:path*", "/login/:path*"],
}
