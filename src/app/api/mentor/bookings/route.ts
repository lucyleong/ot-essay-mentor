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

  const { data: bookings, error } = await supabase
    .from('student_bookings')
    .select(`
      id, student_name, student_email, student_phone,
      sms_confirmed_at, sms_confirm_sent, cancelled_at,
      appointment_slots (
        id, start_time, end_time, meeting_type, google_meet_link, mentor_id
      ),
      student_essays ( id )
    `)
    .is('cancelled_at', null)

  return NextResponse.json({ mentor, bookings: bookings ?? [], error })
}