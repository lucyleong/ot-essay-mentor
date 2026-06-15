import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  // Total bookings
  const { count: totalBookings } = await supabase
    .from('student_bookings')
    .select('*', { count: 'exact', head: true })

  const { count: activeBookings } = await supabase
    .from('student_bookings')
    .select('*', { count: 'exact', head: true })
    .is('cancelled_at', null)

  const { count: cancelledBookings } = await supabase
    .from('student_bookings')
    .select('*', { count: 'exact', head: true })
    .not('cancelled_at', 'is', null)

  // No shows from survey responses
  const { data: noShowData } = await supabase
    .from('survey_responses')
    .select('additional_answers')
    .eq('respondent_type', 'mentor')

  const noShows = (noShowData ?? []).filter(
    r => r.additional_answers?.no_show === 'Yes'
  ).length

  // Meet issues
  const meetIssues = (noShowData ?? []).filter(
    r => r.additional_answers?.meet_issue === 'Yes'
  ).length

  // Demographics from intake answers
  const { data: intakeAnswers } = await supabase
    .from('booking_question_answers')
    .select('answer_text, intake_questions(question_text, sort_order)')

  // First gen from survey
  const firstGenAnswers = (intakeAnswers ?? []).filter(
    (a: any) => a.intake_questions?.sort_order === 15
  )
  const firstGenYes = firstGenAnswers.filter(a => a.answer_text === 'Yes').length
  const firstGenNo  = firstGenAnswers.filter(a => a.answer_text === 'No').length

  // Ethnicity
  const ethnicityAnswers = (intakeAnswers ?? []).filter(
    (a: any) => a.intake_questions?.sort_order === 13
  )
  const ethnicityMap: Record<string, number> = {}
  ethnicityAnswers.forEach(a => {
    const val = a.answer_text?.trim()
    if (val) ethnicityMap[val] = (ethnicityMap[val] ?? 0) + 1
  })

  // What they want help with
  const helpWithAnswers = (intakeAnswers ?? []).filter(
    (a: any) => a.intake_questions?.sort_order === 7
  )
  const helpWithMap: Record<string, number> = {}
  helpWithAnswers.forEach(a => {
    const val = a.answer_text?.trim()
    if (val) helpWithMap[val] = (helpWithMap[val] ?? 0) + 1
  })

  // Teacher distribution
  const teacherAnswers = (intakeAnswers ?? []).filter(
    (a: any) => a.intake_questions?.sort_order === 6
  )
  const teacherMap: Record<string, number> = {}
  teacherAnswers.forEach(a => {
    const val = a.answer_text?.trim()
    if (val) teacherMap[val] = (teacherMap[val] ?? 0) + 1
  })

  // Mentor activity
  const { data: mentorActivity } = await supabase
    .from('student_bookings')
    .select(`
      appointment_slots (
        mentor_profiles ( full_name )
      )
    `)
    .is('cancelled_at', null)

  const mentorMap: Record<string, number> = {}
  ;(mentorActivity ?? []).forEach((b: any) => {
    const name = b.appointment_slots?.mentor_profiles?.full_name?.split(' ')[0]
    if (name) mentorMap[name] = (mentorMap[name] ?? 0) + 1
  })

  // Student survey ratings
  const { data: studentSurveys } = await supabase
    .from('survey_responses')
    .select('rating_overall, additional_answers')
    .eq('respondent_type', 'student')

  const ratings = (studentSurveys ?? [])
    .map(s => s.rating_overall)
    .filter(Boolean)
  const avgRating = ratings.length
    ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
    : null

  const recommendMap: Record<string, number> = { Yes: 0, Maybe: 0, No: 0 }
  ;(studentSurveys ?? []).forEach(s => {
    const rec = s.additional_answers?.recommend
    if (rec && recommendMap[rec] !== undefined) recommendMap[rec]++
  })

  return NextResponse.json({
    bookings: {
      total:     totalBookings ?? 0,
      active:    activeBookings ?? 0,
      cancelled: cancelledBookings ?? 0,
      noShows,
      meetIssues,
    },
    demographics: {
      firstGen: { yes: firstGenYes, no: firstGenNo },
      ethnicity: Object.entries(ethnicityMap)
        .sort((a, b) => b[1] - a[1]),
      helpWith: Object.entries(helpWithMap)
        .sort((a, b) => b[1] - a[1]),
      teachers: Object.entries(teacherMap)
        .sort((a, b) => b[1] - a[1]),
    },
    mentorActivity: Object.entries(mentorMap)
      .sort((a, b) => b[1] - a[1]),
    surveys: {
      avgRating,
      totalResponses: ratings.length,
      recommend:      Object.entries(recommendMap),
    },
  })
}