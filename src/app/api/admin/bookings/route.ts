import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
 const { data: bookings } = await supabase
    .from('student_bookings')
    .select(`
      id, student_name, student_email, booked_at, cancelled_at, confirmation_code, sms_consent, sms_confirm_sent, sms_confirmed_at,
      appointment_slots (
        start_time, meeting_type,
        mentor_profiles ( full_name )
      ),
      survey_responses (
        additional_answers
      )
    `)
    .order('booked_at', { ascending: false })
    .limit(100)

  return NextResponse.json(bookings ?? [])
}