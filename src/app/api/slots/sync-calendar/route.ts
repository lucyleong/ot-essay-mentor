import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createSlotOnCalendar } from '@/lib/calendar'

export async function POST() {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: mentor } = await supabase
    .from('mentor_profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (!mentor) return NextResponse.json({ error: 'Not a mentor' }, { status: 403 })

  // Find all slots without calendar events
  const { data: slots } = await supabase
    .from('appointment_slots')
    .select('id')
    .eq('mentor_id', mentor.id)
    .eq('is_cancelled', false)
    .is('google_calendar_event_id', null)
    .gte('start_time', new Date().toISOString())

  let synced = 0
  for (const slot of slots ?? []) {
    try {
      await createSlotOnCalendar(slot.id)
      synced++
    } catch (err: any) {
      console.error('Calendar sync failed for slot:', slot.id, err.message)
    }
  }

  return NextResponse.json({ synced })
}