import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const response = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Protect mentor routes
  if (pathname.startsWith('/mentor')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
   const { data: mentor } = await supabase
      .from('mentor_profiles')
      .select('id, is_active')
      .eq('auth_user_id', user.id)
      .single()

if (!mentor || !mentor.is_active) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  // Protect admin routes
  if (pathname.startsWith('/admin')) {
    if (!user || user.app_metadata?.role !== 'admin') {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/mentor/:path*', '/admin/:path*'],
}