import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// The program account is stored in mentor_profiles with a special email
const PROGRAM_EMAIL = 'otessaymentors@gmail.com'

export async function getFreshAccessToken(): Promise<string> {
  const { data: programAccount } = await supabase
    .from('mentor_profiles')
    .select('google_access_token, google_refresh_token, google_token_expiry')
    .eq('email', PROGRAM_EMAIL)
    .single()

  if (!programAccount) throw new Error('Program Google account not connected')
  if (!programAccount.google_refresh_token) {
    throw new Error('Program Google account not connected — please connect from admin dashboard')
  }

  // Check if token is still valid (with 60 second buffer)
  const isExpired = new Date(programAccount.google_token_expiry) 
    new Date(Date.now() + 60_000)

  if (!isExpired) return programAccount.google_access_token

  // Refresh the token
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: programAccount.google_refresh_token,
      grant_type:    'refresh_token',
    }),
  })

  const refreshed = await res.json()
  if (!res.ok) throw new Error('Token refresh failed')

  const newExpiry = new Date(
    Date.now() + refreshed.expires_in * 1000
  ).toISOString()

  await supabase
    .from('mentor_profiles')
    .update({
      google_access_token: refreshed.access_token,
      google_token_expiry: newExpiry,
    })
    .eq('email', PROGRAM_EMAIL)

  return refreshed.access_token
}