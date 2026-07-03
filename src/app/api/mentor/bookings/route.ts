import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET() {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

  const { data: mentor } = await supabase
    .from('mentor_profiles')
    .select('id, full_name')
    .eq('auth_user_id', user.id)
    .single()

  if (!mentor) return NextResponse.json({ error: 'No mentor profile' }, { status: 404 })

  // Get all slots for this mentor
  const { data: slots } = await supabase
    .from('appointment_slots')
    .select('id')
    .eq('mentor_id', mentor.id)

  const slotIds = (slots ?? []).map(s => s.id)

  if (slotIds.length === 0) {
    return NextResponse.json({ mentor, bookings: [] })
  }

  const { data: bookings } = await supabase
    .from('student_bookings')
    .select(`
      id, student_name, student_email, student_phone,
      sms_confirmed_at, sms_confirm_sent, sms_consent, cancelled_at, booked_at,
      appointment_slots (
        id, start_time, end_time, meeting_type, google_meet_link, mentor_id
      ),
      student_essays ( id )
    `)
    .is('cancelled_at', null)
    .in('slot_id', slotIds)
    .order('booked_at', { ascending: false })

  return NextResponse.json({ mentor, bookings: bookings ?? [] })
}