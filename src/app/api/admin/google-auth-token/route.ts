import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/admin-auth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
  const expiry = new Date(Date.now() + 5 * 60 * 1000).toISOString()

  await supabase.from('program_settings').upsert([
    { key: 'google_auth_token', value: token },
    { key: 'google_auth_token_expiry', value: expiry },
  ], { onConflict: 'key' })

  return NextResponse.json({ token })
}
