import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function countUnique(answers: any[], questionKey: string) {
  // For each student, find their best answer:
  // - Use most recent non-blank answer
  const byStudent = new Map<string, { answer: string; bookedAt: string }>()

  answers
    .filter((a: any) => a.intake_questions?.question_key === questionKey)
    .forEach((a: any) => {
      const email    = a.student_email
      const answer   = a.answer_text?.trim()
const bookedAt = a.booked_at

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

function countMultiselect(answers: any[], questionKey: string) {
  // For multiselect, count each selected option per student (most recent booking)
  const byStudent = new Map<string, { answers: string[]; bookedAt: string }>()

  answers
    .filter((a: any) => a.intake_questions?.question_key === questionKey)
    .forEach((a: any) => {
      const email    = a.student_email
      const answer   = a.answer_text?.trim()
const bookedAt = a.booked_at
      if (!email || !answer) return

      const existing = byStudent.get(email)

      if (!existing || bookedAt > existing.bookedAt) {
        // Start fresh for this student's most recent booking
        if (!existing || bookedAt > existing.bookedAt) {
          byStudent.set(email, { answers: [answer], bookedAt })
        }
      } else if (bookedAt === existing.bookedAt) {
        // Same booking, add to the list
        existing.answers.push(answer)
      }
    })

  const map: Record<string, number> = {}
  byStudent.forEach(({ answers }) => {
    answers.forEach(answer => {
      // Group "Other: xxx" entries under "Other" for chart display
      const key = answer.startsWith('Other:') ? 'Other' : answer
      map[key] = (map[key] ?? 0) + 1
    })
  })

  return Object.entries(map).sort((a, b) => b[1] - a[1])

function getOtherResponses(answers: any[], questionKey: string): string[] {
  const otherResponses: string[] = []
  answers
    .filter((a: any) => a.intake_questions?.question_key === questionKey)
    .forEach((a: any) => {
      const answer = a.answer_text?.trim()
      if (answer?.startsWith('Other:')) {
        const text = answer.replace('Other:', '').trim()
        if (text && !otherResponses.includes(text)) {
          otherResponses.push(text)
        }
      }
    })
  return otherResponses
}

function countAllAnswers(answers: any[], questionKey: string) {
  // Count every distinct answer a student has ever given (not just most recent)
  const byStudent = new Map<string, Set<string>>()

  answers
    .filter((a: any) => a.intake_questions?.question_key === questionKey)
    .forEach((a: any) => {
      const email  = a.student_email
      const answer = a.answer_text?.trim()
      if (!email || !answer) return

      if (!byStudent.has(email)) byStudent.set(email, new Set())
      byStudent.get(email)!.add(answer)
    })

  const map: Record<string, number> = {}
  byStudent.forEach(answerSet => {
    answerSet.forEach(answer => {
      map[answer] = (map[answer] ?? 0) + 1
    })
  })

  return Object.entries(map).sort((a, b) => b[1] - a[1])
}

function getOtherResponses(answers: any[], questionKey: string): string[] {
  const otherResponses: string[] = []
  answers
    .filter((a: any) => a.intake_questions?.question_key === questionKey)
    .forEach((a: any) => {
      const answer = a.answer_text?.trim()
      if (answer?.startsWith('Other:')) {
        const text = answer.replace('Other:', '').trim()
        if (text && !otherResponses.includes(text)) {
          otherResponses.push(text)
        }
      }
    })
  return otherResponses
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

  // Unused capacity - slots that were never booked or got cancelled and not rebooked
  const { count: totalSlots } = await supabase
    .from('appointment_slots')
    .select('*', { count: 'exact', head: true })
    .eq('is_cancelled', false)

  const { count: unbookedSlots } = await supabase
    .from('appointment_slots')
    .select('*', { count: 'exact', head: true })
    .eq('is_cancelled', false)
    .eq('is_booked', false)
    .lt('start_time', new Date().toISOString())

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
      intake_questions ( question_text, sort_order, question_key ),
      booking_id,
      student_bookings!booking_question_answers_booking_id_fkey ( student_email, booked_at, cancelled_at )
    `)

  // Flatten with student email
  const answersWithEmail = (intakeAnswers ?? [])
    .filter((a: any) => !a.student_bookings?.cancelled_at)
    .map((a: any) => ({
      answer_text:      a.answer_text,
      student_email:    a.student_bookings?.student_email,
      booked_at:        a.student_bookings?.booked_at,
      intake_questions: a.intake_questions,
    }))

// First gen (sort_order 15)
const firstGenEntries = countUnique(answersWithEmail, 'first_gen')

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
    .select(`
      rating_overall, additional_answers,
      student_bookings (
        appointment_slots (
          mentor_profiles ( full_name )
        )
      )
    `)
    .eq('respondent_type', 'student')

  const ratings = (studentSurveys ?? []).map(s => s.rating_overall).filter(Boolean)
  const avgRating = ratings.length
    ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
    : null

  const mentorOnTimeMap: Record<string, number> = { Yes: 0, No: 0 }
  const nextStepsMap: Record<string, number> = { Yes: 0, No: 0, 'Not sure': 0 }
  const workAgainMap: Record<string, number> = { Yes: 0, No: 0, 'Not sure': 0 }

  const mentorIssuesMap: Record<string, { lateCount: number; wouldNotWorkAgainCount: number; noNextStepsCount: number; details: any[] }> = {}

  ;(studentSurveys ?? []).forEach((s: any) => {
    const onTime    = s.additional_answers?.mentor_on_time
    const nextSteps = s.additional_answers?.next_steps
    const workAgain = s.additional_answers?.work_again
    const mentorName = s.student_bookings?.appointment_slots?.mentor_profiles?.full_name ?? 'Unknown'

    if (onTime    && mentorOnTimeMap[onTime]    !== undefined) mentorOnTimeMap[onTime]++
    if (nextSteps && nextStepsMap[nextSteps]     !== undefined) nextStepsMap[nextSteps]++
    if (workAgain && workAgainMap[workAgain]     !== undefined) workAgainMap[workAgain]++

    // Track issues per mentor
    if (onTime === 'No' || workAgain === 'No' || nextSteps === 'No') {
      if (!mentorIssuesMap[mentorName]) {
        mentorIssuesMap[mentorName] = { lateCount: 0, wouldNotWorkAgainCount: 0, noNextStepsCount: 0, details: [] }
      }
      if (onTime === 'No') mentorIssuesMap[mentorName].lateCount++
      if (workAgain === 'No') mentorIssuesMap[mentorName].wouldNotWorkAgainCount++
      if (nextSteps === 'No') mentorIssuesMap[mentorName].noNextStepsCount++
      mentorIssuesMap[mentorName].details.push({
        onTime: onTime === 'No',
        wouldNotWorkAgain: workAgain === 'No',
        noNextSteps: nextSteps === 'No',
      })
    }
  })

  const mentorIssues = Object.entries(mentorIssuesMap).map(([name, data]) => ({
    mentorName: name,
    lateCount: data.lateCount,
    wouldNotWorkAgainCount: data.wouldNotWorkAgainCount,
    noNextStepsCount: data.noNextStepsCount,
    totalIssues: data.lateCount + data.wouldNotWorkAgainCount + data.noNextStepsCount,
  })).sort((a, b) => b.totalIssues - a.totalIssues)

  return NextResponse.json({
    bookings: {
      total:     totalBookings ?? 0,
      active:    activeBookings ?? 0,
      cancelled: cancelledBookings ?? 0,
      noShows,
      meetIssues,
      totalSlots:    totalSlots ?? 0,
      unbookedSlots: unbookedSlots ?? 0,
    },
    demographics: {
     firstGen:        firstGenEntries,
ethnicity:       countMultiselect(answersWithEmail, 'ethnicity'),
     ethnicityOther:  getOtherResponses(answersWithEmail, 'ethnicity'),
      helpWith:        countAllAnswers(answersWithEmail, 'help_with'),
      teachers:        countUnique(answersWithEmail, 'teacher'),
      privateCounselor: countUnique(answersWithEmail, 'private_counselor'),
      immigrants:      countUnique(answersWithEmail, 'immigrant_status'),
      lgbtq:           countUnique(answersWithEmail, 'lgbtq'),
    },
    mentorActivity: Object.entries(mentorMap).sort((a, b) => b[1] - a[1]),
    surveys: {
      avgRating,
      totalResponses: ratings.length,
      mentorOnTime:   Object.entries(mentorOnTimeMap),
      nextSteps:      Object.entries(nextStepsMap),
      workAgain:      Object.entries(workAgainMap),
      howHeard:       (studentSurveys ?? [])
        .map((s: any) => s.additional_answers?.how_heard)
        .filter((a: any) => a && a.trim().length > 0),
      mentorIssues,
    },
  })
}