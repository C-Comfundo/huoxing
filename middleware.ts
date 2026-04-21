import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const SUPABASE_AUTH_COOKIE_PREFIX = 'sb-'
const SUPABASE_AUTH_COOKIE_MARKER = 'auth-token'

function hasSupabaseAuthCookie(request: NextRequest) {
  return request.cookies
    .getAll()
    .some(
      (cookie) =>
        cookie.name.startsWith(SUPABASE_AUTH_COOKIE_PREFIX) &&
        cookie.name.includes(SUPABASE_AUTH_COOKIE_MARKER)
    )
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return response
  }

  // Anonymous public traffic does not have a Supabase session to refresh.
  if (!hasSupabaseAuthCookie(request)) {
    return response
  }

  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    })

    await supabase.auth.getUser()
  } catch (_error) {
    return response
  }

  return response
}

export const config = {
  matcher: [
    '/articles/:path*',
    '/board',
    '/issues/:slug/debate',
    '/issues/:slug/drawing',
    '/ops-room/:path*',
    '/profile',
    '/settings',
  ],
}
