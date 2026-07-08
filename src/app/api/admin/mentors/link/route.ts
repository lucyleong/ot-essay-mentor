import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const serviceSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  // Get the auth token from the request header
  const authHeader = request.headers.get('Authorization')
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const token = authHeader.replace('Bearer ', '')
  const { data: { user } } = await serviceSupabase.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  // Find mentor profile by email with no auth_user_id
  const { data: profile } = await serviceSupabase
    .from('mentor_profiles')
    .select('id')
    .eq('email', user.email)
    .is('auth_user_id', null)
    .single()

  if (!profile) return NextResponse.json({ linked: false })

  // Link the auth user to the mentor profile
  await serviceSupabase
    .from('mentor_profiles')
    .update({ auth_user_id: user.id })
    .eq('id', profile.id)

  return NextResponse.json({ linked: true, profileId: profile.id })
}