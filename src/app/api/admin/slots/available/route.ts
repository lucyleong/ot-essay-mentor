import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(_request: NextRequest) {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: slots } = await supabase
    .from('appointment_slots')
    .select(`
      id, start_time, end_time, meeting_type, google_meet_link,
      mentor_profiles ( full_name )
    `)
    .eq('is_booked', false)
    .eq('is_cancelled', false)
    .order('start_time', { ascending: true })

  return NextResponse.json(slots ?? [])
}