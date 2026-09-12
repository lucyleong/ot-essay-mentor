import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/admin-auth'

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

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const meetingType = request.nextUrl.searchParams.get('type')
   // 'virtual', 'in_person', or null for all

  // Which booking outcomes to include in demographics — checkboxes on the
  // admin UI, defaulting to upcoming + completed (students who actually
  // showed up, or still will).
  const demographicsCategoriesParam = request.nextUrl.searchParams.get('demographicsCategories')
  const demographicsCategories = demographicsCategoriesParam
    ? demographicsCategoriesParam.split(',')
    : ['upcoming', 'completed']

  const now = new Date()
  function categorizeBooking(booking: {
    cancelled_at: string | null
    meeting_type: string
    start_time: string | null
    survey_responses: any[] | null
  }) {
    if (booking.cancelled_at) return 'cancelled'
    const isNoShow = booking.survey_responses?.some((s: any) => s.additional_answers?.no_show === 'Yes')
    if (isNoShow) return 'no_show'
    const isConnectionIssueDidNotMeet = booking.survey_responses?.some((s: any) => s.additional_answers?.meet_issue === 'Yes - did not meet')
    if (isConnectionIssueDidNotMeet) return 'connection_issue'
    const isUpcoming = booking.meeting_type === 'virtual' && !!booking.start_time && new Date(booking.start_time) >= now
    if (isUpcoming) return 'upcoming'
    return 'completed'
  }

  // Total bookings
  let bookingsQuery = supabase
    .from('student_bookings')
    .select('*', { count: 'exact', head: true })
  
  if (meetingType) bookingsQuery = bookingsQuery.eq('meeting_type', meetingType)
  
  const { count: totalBookings } = await bookingsQuery

 // Virtual bookings (non-cancelled, non-no-show, non-connection-issue-did-not-meet)
  const { data: virtualData } = await supabase
    .from('student_bookings')
    .select(`
      id,
      survey_responses ( additional_answers )
    `)
    .eq('meeting_type', 'virtual')
    .is('cancelled_at', null)

  const virtualBookings = (virtualData ?? []).filter(b =>
    !(b as any).survey_responses?.some((s: any) =>
      s.additional_answers?.no_show === 'Yes' ||
      s.additional_answers?.meet_issue === 'Yes - did not meet'
    )
  ).length

  const { count: inPersonBookings } = await supabase
    .from('student_bookings')
    .select('*', { count: 'exact', head: true })
    .eq('meeting_type', 'in_person')
    .is('cancelled_at', null)

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

  // Unique students helped - matches the Appointments tab's "isCompleted" definition:
  // not cancelled, not a no-show, not a connection-issue-did-not-meet, and (for virtual) not still upcoming
  const { data: helpedData } = await supabase
    .from('student_bookings')
    .select(`
      student_email,
      meeting_type,
      appointment_slots ( start_time ),
      survey_responses ( additional_answers )
    `)
    .is('cancelled_at', null)

  const uniqueStudentsHelped = new Set(
    (helpedData ?? [])
      .filter((b: any) => categorizeBooking({
        cancelled_at: null,
        meeting_type: b.meeting_type,
        start_time: b.appointment_slots?.start_time ?? null,
        survey_responses: b.survey_responses,
      }) === 'completed')
      .map((b: any) => b.student_email)
  ).size

  // No shows and meet issues from mentor surveys
  const { data: noShowData } = await supabase
    .from('survey_responses')
    .select('additional_answers')
    .eq('respondent_type', 'mentor')

  const noShows   = (noShowData ?? []).filter(r => r.additional_answers?.no_show === 'Yes').length
  const meetIssues = (noShowData ?? []).filter(r => (r.additional_answers?.meet_issue ?? '').startsWith('Yes')).length
  const meetIssuesDidNotMeet = (noShowData ?? []).filter(r => r.additional_answers?.meet_issue === 'Yes - did not meet').length
  const meetIssuesStillMet   = (noShowData ?? []).filter(r => r.additional_answers?.meet_issue === 'Yes - still met').length

  // Intake answers joined with student email for deduplication
 let intakeQuery = supabase
    .from('booking_question_answers')
    .select(`
      answer_text,
      intake_questions ( question_text, sort_order, question_key ),
      booking_id,
      student_bookings!booking_question_answers_booking_id_fkey (
        student_email, booked_at, cancelled_at, meeting_type,
        appointment_slots ( start_time ),
        survey_responses ( additional_answers )
      )
    `)

  if (meetingType) {
    intakeQuery = intakeQuery.eq('student_bookings.meeting_type', meetingType)
  }

  const { data: intakeAnswers } = await intakeQuery

  // Flatten with student email
  const answersWithEmail = (intakeAnswers ?? [])
    .filter((a: any) => !meetingType || a.student_bookings?.meeting_type === meetingType)
    .filter((a: any) => demographicsCategories.includes(categorizeBooking({
      cancelled_at:      a.student_bookings?.cancelled_at ?? null,
      meeting_type:      a.student_bookings?.meeting_type,
      start_time:        a.student_bookings?.appointment_slots?.start_time ?? null,
      survey_responses:  a.student_bookings?.survey_responses ?? null,
    })))
    .map((a: any) => ({
      answer_text:      a.answer_text,
      student_email:    a.student_bookings?.student_email,
      booked_at:        a.student_bookings?.booked_at,
      intake_questions: a.intake_questions,
    }))

// First gen (sort_order 15)
const firstGenEntries = countUnique(answersWithEmail, 'first_gen')

  // Mentor activity
let mentorActivityQuery = supabase
    .from('student_bookings')
    .select(`
      cancelled_at, meeting_type,
      appointment_slots ( start_time, mentor_profiles ( full_name ) ),
      survey_responses ( additional_answers )
    `)

  if (meetingType) mentorActivityQuery = mentorActivityQuery.eq('meeting_type', meetingType)

  const { data: mentorActivity } = await mentorActivityQuery

  const mentorMap: Record<string, number> = {}
  ;(mentorActivity ?? [])
    .filter((b: any) => demographicsCategories.includes(categorizeBooking({
      cancelled_at:      b.cancelled_at,
      meeting_type:      b.meeting_type,
      start_time:        b.appointment_slots?.start_time ?? null,
      survey_responses:  b.survey_responses,
    })))
    .forEach((b: any) => {
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
      virtual:   virtualBookings,
      cancelled: cancelledBookings ?? 0,
      inPerson:  inPersonBookings ?? 0,
      noShows,
      meetIssues,
      meetIssuesDidNotMeet,
      meetIssuesStillMet,
      totalSlots:    totalSlots ?? 0,
      unbookedSlots: unbookedSlots ?? 0,
      uniqueStudentsHelped,
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