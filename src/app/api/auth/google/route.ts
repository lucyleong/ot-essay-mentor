import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  // Validate one-time admin token
  const adminToken = request.nextUrl.searchParams.get('token')

  const { data: storedToken } = await supabase
    .from('program_settings')
    .select('value')
    .eq('key', 'google_auth_token')
    .maybeSingle()

  const { data: storedExpiry } = await supabase
    .from('program_settings')
    .select('value')
    .eq('key', 'google_auth_token_expiry')
    .maybeSingle()

  const isExpired = storedExpiry ? new Date(storedExpiry.value) < new Date() : true

  if (!adminToken || !storedToken || adminToken !== storedToken.value || isExpired) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Delete token immediately after validation (single-use)
  await supabase.from('program_settings').delete().eq('key', 'google_auth_token')
  await supabase.from('program_settings').delete().eq('key', 'google_auth_token_expiry')

  // Generate state and store it
  const state = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
  await supabase.from('program_settings').upsert(
    { key: 'google_oauth_state', value: state },
    { onConflict: 'key' }
  )

  const params = new URLSearchParams({
    client_id:     process.env.GOOGLE_CLIENT_ID!,
    redirect_uri:  process.env.GOOGLE_REDIRECT_URI!,
    response_type: 'code',
    scope: [
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/calendar',
    ].join(' '),
    access_type: 'offline',
    prompt:      'consent',
    state,
  })

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  )
}