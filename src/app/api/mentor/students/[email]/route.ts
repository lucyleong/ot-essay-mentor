import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ email: string }> }
) {
  const supabase = await createServerSupabaseClient()
  const { email } = await context.params
  const studentEmail = decodeURIComponent(email)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: mentor } = await supabase
    .from('mentor_profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (!mentor) return NextResponse.json({ error: 'No mentor profile' }, { status: 401 })

  const { data: bookings, error: bookingsError } = await supabase
    .from('student_bookings')
    .select(`
      id, student_name, student_email, student_phone,
      booked_at, confirmation_code,
      appointment_slots (
        start_time, end_time, meeting_type, google_meet_link
      ),
      booking_question_answers (
        answer_text,
        intake_questions ( question_text, sort_order )
      ),
      student_essays (
        id, essay_type, google_doc_url, file_name,
        note_to_mentor, uploaded_at
      )
    `)
    .eq('student_email', studentEmail)
    .is('cancelled_at', null)
    .order('booked_at', { ascending: false })

  const { data: notes } = await supabase
    .from('mentor_student_notes')
    .select('id, body, is_private, created_at, mentor_id, mentor_profiles(full_name)')
    .eq('student_email', studentEmail)
    .order('created_at', { ascending: false })

  return NextResponse.json({
    bookings: bookings ?? [],
    notes: notes ?? [],
    mentorId: mentor.id,
  })
}