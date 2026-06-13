import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  if (!code) {
    return NextResponse.redirect(
      new URL('/admin?error=no_code', request.url)
    )
  }

  // Exchange code for tokens
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id:     process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri:  process.env.GOOGLE_REDIRECT_URI!,
      grant_type:    'authorization_code',
    }),
  })

  const tokens = await tokenRes.json()

  if (!tokenRes.ok) {
    console.error('Token exchange failed:', tokens)
    return NextResponse.redirect(
      new URL('/admin?error=token_exchange', request.url)
    )
  }

  const supabase = await createServerSupabaseClient()

  const expiry = new Date(
    Date.now() + tokens.expires_in * 1000
  ).toISOString()

  // Always save to the program account row using email
  const { error } = await supabase
    .from('mentor_profiles')
    .update({
      google_access_token:  tokens.access_token,
      google_refresh_token: tokens.refresh_token,
      google_token_expiry:  expiry,
    })
    .eq('email', 'otessaymentors@gmail.com')

  if (error) {
    console.error('Failed to save tokens:', error)
    return NextResponse.redirect(
      new URL('/admin?error=save_tokens', request.url)
    )
  }

  return NextResponse.redirect(
    new URL('/admin?connected=google', request.url)
  )
}