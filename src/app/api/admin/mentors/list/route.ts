import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/admin-auth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  
  const { data: mentorData, error } = await supabase
    .from('mentor_profiles')
    .select('id, full_name, email, phone, is_active, is_virtual_available, created_at')
.neq('email', process.env.PROGRAM_ACCOUNT_EMAIL!)
    .order('full_name', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(mentorData ?? [])
}