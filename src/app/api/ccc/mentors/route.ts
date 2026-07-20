import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const { data: mentors } = await supabase
    .from('mentor_profiles')
    .select('id, full_name')
    .eq('is_active', true)
    .eq('is_in_person_available', true)
    .neq('email', process.env.PROGRAM_ACCOUNT_EMAIL!)
    .order('full_name', { ascending: true })

  return NextResponse.json({ mentors: mentors ?? [] })
}