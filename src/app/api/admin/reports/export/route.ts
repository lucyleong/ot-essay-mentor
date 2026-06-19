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
      id, student_name, student_email, student_phone,
      confirmation_code, booked_at, cancelled_at,
      appointment_slots (
        start_time, end_time, meeting_type,
        mentor_profiles ( full_name )
      ),
      booking_question_answers (
        answer_text,
        intake_questions ( question_text, sort_order )
      )
    `)
    .order('booked_at', { ascending: false })

  const { data: surveys } = await supabase
    .from('survey_responses')
    .select('booking_id, respondent_type, rating_overall, additional_answers')

  if (!bookings) {
    return new NextResponse('No data', { status: 404 })
  }

  // Get all unique question texts sorted by sort_order
  const questionMap = new Map<number, string>()
  bookings.forEach((b: any) => {
    ;(b.booking_question_answers ?? []).forEach((a: any) => {
      const q = a.intake_questions
      if (q) questionMap.set(q.sort_order, q.question_text)
    })
  })
  const sortedQuestions = Array.from(questionMap.entries())
    .sort((a, b) => a[0] - b[0])

  // Build survey lookup by booking ID
  const surveyByBooking = new Map<string, any>()
  ;(surveys ?? []).forEach((s: any) => {
    if (!surveyByBooking.has(s.booking_id)) {
      surveyByBooking.set(s.booking_id, {})
    }
    const entry = surveyByBooking.get(s.booking_id)
    if (s.respondent_type === 'student') {
      entry.sessionEase = s.rating_overall
      entry.mentorOnTime = s.additional_answers?.mentor_on_time
      entry.nextSteps    = s.additional_answers?.next_steps
      entry.workAgain     = s.additional_answers?.work_again
      entry.howHeard      = s.additional_answers?.how_heard
    }
    if (s.respondent_type === 'mentor') {
      entry.noShow     = s.additional_answers?.no_show
      entry.meetIssue  = s.additional_answers?.meet_issue
    }
  })

  // Build CSV headers
  const headers = [
    'Student Name',
    'Email',
    'Phone',
    'Confirmation Code',
    'Booked At',
    'Cancelled',
    'Appointment Date',
    'Appointment Time',
    'Meeting Type',
    'Mentor',
    ...sortedQuestions.map(([, text]) => text),
    'Student: Ease of Connecting',
    'Student: Mentor On Time',
    'Student: Next Steps Given',
    'Student: Would Work Again',
    'Student: How Heard / Comments',
    'Mentor: No Show',
    'Mentor: Meet Issue',
  ]

  // Build CSV rows
  const rows = bookings.map((b: any) => {
    const slot   = b.appointment_slots
    const mentor = slot?.mentor_profiles

    // Build answer lookup for this booking
    const answerMap = new Map<number, string>()
    ;(b.booking_question_answers ?? []).forEach((a: any) => {
      if (a.intake_questions?.sort_order) {
        answerMap.set(a.intake_questions.sort_order, a.answer_text)
      }
    })

    const apptDate = slot?.start_time
      ? new Date(slot.start_time).toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles' })
      : ''
    const apptTime = slot?.start_time
      ? new Date(slot.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Los_Angeles' })
      : ''

    const survey = surveyByBooking.get(b.id) ?? {}

    return [
      b.student_name,
      b.student_email,
      b.student_phone ?? '',
      b.confirmation_code,
      new Date(b.booked_at).toLocaleDateString('en-US'),
      b.cancelled_at ? 'Yes' : 'No',
      apptDate,
      apptTime,
      slot?.meeting_type ?? '',
      mentor?.full_name ?? '',
      ...sortedQuestions.map(([order]) => answerMap.get(order) ?? ''),
      survey.sessionEase ?? '',
      survey.mentorOnTime ?? '',
      survey.nextSteps ?? '',
      survey.workAgain ?? '',
      survey.howHeard ?? '',
      survey.noShow ?? '',
      survey.meetIssue ?? '',
    ]
  })

  // Convert to CSV string
  const escape = (val: string) => `"${String(val ?? '').replace(/"/g, '""')}"`

  const csv = [
    headers.map(escape).join(','),
    ...rows.map(row => row.map(escape).join(',')),
  ].join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type':        'text/csv',
      'Content-Disposition': `attachment; filename="ot-essay-mentors-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}