import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const serviceSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {

  const { mentorId } = await request.json()
  if (!mentorId) return NextResponse.json({ error: 'Missing mentorId' }, { status: 400 })

  const { error } = await serviceSupabase
    .from('mentor_profiles')
    .delete()
    .eq('id', mentorId)
    .eq('is_active', false) // Safety check — only delete inactive mentors

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}