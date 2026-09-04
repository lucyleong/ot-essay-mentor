import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const serviceSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

  const { data: mentor } = await supabase
    .from('mentor_profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!mentor) return NextResponse.json({ error: 'Not a mentor' }, { status: 403 })

  const { data: mentors, error } = await serviceSupabase
    .from('mentor_profiles')
    .select('full_name, email, phone')
    .eq('is_active', true)
    .neq('email', process.env.PROGRAM_ACCOUNT_EMAIL!)
    .order('full_name', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(mentors ?? [])
}
