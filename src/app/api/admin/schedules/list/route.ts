import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const { data: slots } = await supabase
    .from('appointment_slots')
    .select(`
      id, start_time, end_time, is_booked, meeting_type,
      mentor_profiles ( full_name )
    `)
    .eq('is_cancelled', false)
    .gte('start_time', new Date().toISOString())
    .order('start_time', { ascending: true })

  return NextResponse.json(slots ?? [])
}
