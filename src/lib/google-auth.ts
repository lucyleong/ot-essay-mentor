import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function getFreshAccessToken(): Promise<string> {
  const { data: settings } = await supabase
    .from('program_settings')
    .select('key, value')
    .in('key', ['google_access_token', 'google_refresh_token', 'google_token_expiry'])

  if (!settings || settings.length === 0) {
    throw new Error('Program Google account not connected — please connect from admin dashboard')
  }

  const get = (key: string) => settings.find(s => s.key === key)?.value ?? null

  const accessToken   = get('google_access_token')
  const refreshToken  = get('google_refresh_token')
  const tokenExpiry   = get('google_token_expiry')

  if (!refreshToken) {
    throw new Error('Program Google account not connected — please connect from admin dashboard')
  }

  // Check if token is still valid (with 60 second buffer)
  const isExpired = tokenExpiry
    ? new Date(tokenExpiry) < new Date(Date.now() + 60_000)
    : true

  if (!isExpired && accessToken) return accessToken

  // Refresh the token
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type:    'refresh_token',
    }),
  })

  const refreshed = await res.json()
  if (!res.ok) throw new Error('Token refresh failed')

  const newExpiry = new Date(
    Date.now() + refreshed.expires_in * 1000
  ).toISOString()

  await supabase
    .from('program_settings')
    .upsert([
      { key: 'google_access_token', value: refreshed.access_token },
      { key: 'google_token_expiry', value: newExpiry },
    ])

  return refreshed.access_token
}