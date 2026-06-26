import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const { data: mentorData, error } = await supabase
    .from('mentor_profiles')
    .select('id, full_name, email, is_active, is_virtual_available, created_at')
.neq('email', process.env.PROGRAM_ACCOUNT_EMAIL!)
    .order('full_name', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(mentorData ?? [])
}