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

 const isAdmin = user.app_metadata?.role === 'admin'
  console.log('Student profile request - mentor:', !!mentor, 'isAdmin:', isAdmin, 'email:', studentEmail)

  if (!mentor && !isAdmin) return NextResponse.json({ error: 'No mentor profile' }, { status: 401 })

  const { data: bookings, error: bookingsError } = await supabase
    .from('student_bookings')
    .select(`
      id, student_name, student_email, student_phone,
      booked_at, confirmation_code,
   appointment_slots (
        start_time, end_time, meeting_type, google_meet_link,
        mentor_profiles ( full_name )
      ),
      booking_question_answers (
        answer_text,
        intake_questions ( question_text, sort_order )
      ),
      student_essays (
        id, essay_type, google_doc_url, file_name, file_path,
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

  // Generate signed URLs for file uploads
  const bookingsWithUrls = await Promise.all((bookings ?? []).map(async (booking: any) => {
    const essaysWithUrls = await Promise.all((booking.student_essays ?? []).map(async (essay: any) => {
      if (essay.essay_type === 'file_upload' && essay.file_path) {
        const { data: signed } = await supabase.storage
          .from('essays')
          .createSignedUrl(essay.file_path, 60 * 60)
        return { ...essay, signed_url: signed?.signedUrl ?? null }
      }
      return essay
    }))
    return { ...booking, student_essays: essaysWithUrls }
  }))


  return NextResponse.json({
    bookings: bookingsWithUrls,
    notes:    notes ?? [],
    mentorId: mentor?.id ?? null,
  })
}