import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const PROGRAM_ACCOUNT_ID = '6e3532be-187c-423d-9716-6d2cc25698a1'

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

  if (!tokens.refresh_token) {
    console.error('No refresh token received')
    return NextResponse.redirect(
      new URL('/admin?error=no_refresh_token', request.url)
    )
  }

  const supabase = await createServerSupabaseClient()

  const expiry = new Date(
    Date.now() + tokens.expires_in * 1000
  ).toISOString()

  // Save tokens to program_settings table
  console.log('About to save tokens...')
  console.log('Access token exists:', !!tokens.access_token)
  console.log('Refresh token exists:', !!tokens.refresh_token)

 const { error: tokenError } = await supabase
    .from('program_settings')
    .upsert([
      { key: 'google_access_token',  value: tokens.access_token },
      { key: 'google_refresh_token', value: tokens.refresh_token },
      { key: 'google_token_expiry',  value: expiry },
    ], { onConflict: 'key' })

  console.log('Token save error:', JSON.stringify(tokenError))

  if (tokenError) {
    return NextResponse.redirect(
      new URL('/admin?error=save_tokens', request.url)
    )
  }

  return NextResponse.redirect(
    new URL('/admin?connected=google', request.url)
  )
}