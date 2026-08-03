import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSlotOnCalendar } from '@/lib/calendar'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Find future slots with no Meet link
  const { data: slots } = await supabase
    .from('appointment_slots')
    .select('id, start_time')
    .is('google_meet_link', null)
    .is('google_calendar_event_id', null)
    .eq('is_cancelled', false)
    .gt('start_time', new Date().toISOString())

  if (!slots || slots.length === 0) {
    return NextResponse.json({ ok: true, fixed: 0 })
  }

  let fixed = 0
  let failed = 0

  for (const slot of slots) {
    try {
      await createSlotOnCalendar(slot.id)
      fixed++
    } catch {
      failed++
    }
  }

  return NextResponse.json({ ok: true, fixed, failed })
}
