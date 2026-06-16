import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function countUnique(answers: any[], sortOrder: number) {
  // For each student, find their best answer:
  // - Use most recent non-blank answer
  const byStudent = new Map<string, { answer: string; bookedAt: string }>()

  answers
    .filter((a: any) => a.intake_questions?.sort_order === sortOrder)
    .forEach((a: any) => {
      const email    = a.student_email
      const answer   = a.answer_text?.trim()
      const bookedAt = a.student_bookings?.booked_at

      if (!email || !answer) return

      const existing = byStudent.get(email)

      if (!existing) {
        // First answer we've seen for this student
        byStudent.set(email, { answer, bookedAt })
      } else if (bookedAt > existing.bookedAt) {
        // More recent booking — use this answer (it's not blank since we checked above)
        byStudent.set(email, { answer, bookedAt })
      }
      // If older booking, keep existing
    })

  const map: Record<string, number> = {}
  byStudent.forEach(({ answer }) => {
    map[answer] = (map[answer] ?? 0) + 1
  })

  return Object.entries(map).sort((a, b) => b[1] - a[1])
}

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

  // No shows and meet issues from mentor surveys
  const { data: noShowData } = await supabase
    .from('survey_responses')
    .select('additional_answers')
    .eq('respondent_type', 'mentor')

  const noShows   = (noShowData ?? []).filter(r => r.additional_answers?.no_show === 'Yes').length
  const meetIssues = (noShowData ?? []).filter(r => r.additional_answers?.meet_issue === 'Yes').length

  // Intake answers joined with student email for deduplication
  const { data: intakeAnswers } = await supabase
    .from('booking_question_answers')
    .select(`
      answer_text,
      intake_questions ( question_text, sort_order ),
      student_bookings ( student_email, booked_at )
    `)
    .order('student_bookings.booked_at', { ascending: false })

  // Flatten with student email
  const answersWithEmail = (intakeAnswers ?? []).map((a: any) => ({
    answer_text:     a.answer_text,
    student_email:   a.student_bookings?.student_email,
    intake_questions: a.intake_questions,
  }))

  // First gen (sort_order 15)
  const firstGenEntries = countUnique(answersWithEmail, 15)
  const firstGenYes = firstGenEntries.find(([k]) => k === 'Yes')?.[1] ?? 0
  const firstGenNo  = firstGenEntries.find(([k]) => k === 'No')?.[1] ?? 0

  // Mentor activity
  const { data: mentorActivity } = await supabase
    .from('student_bookings')
    .select(`appointment_slots ( mentor_profiles ( full_name ) )`)
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

  const ratings = (studentSurveys ?? []).map(s => s.rating_overall).filter(Boolean)
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
      firstGen:        { yes: firstGenYes, no: firstGenNo },
      ethnicity:       countUnique(answersWithEmail, 13),
      helpWith:        countUnique(answersWithEmail, 7),
      teachers:        countUnique(answersWithEmail, 6),
      privateCounselor: countUnique(answersWithEmail, 10),
      immigrants:      countUnique(answersWithEmail, 14),
      lgbtq:           countUnique(answersWithEmail, 16),
    },
    mentorActivity: Object.entries(mentorMap).sort((a, b) => b[1] - a[1]),
    surveys: {
      avgRating,
      totalResponses: ratings.length,
      recommend:      Object.entries(recommendMap),
    },
  })
}