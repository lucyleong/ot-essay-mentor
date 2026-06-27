import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const date     = request.nextUrl.searchParams.get('date') // YYYY-MM-DD in PST, optional
  const days     = request.nextUrl.searchParams.get('days') // lookback window in days, optional

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: mentor } = await supabase
    .from('mentor_profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (!mentor) return NextResponse.json({ error: 'Not a mentor' }, { status: 403 })

  const { data: slots } = await supabase
    .from('appointment_slots')
    .select('id')
    .eq('mentor_id', mentor.id)

  const slotIds = (slots ?? []).map(s => s.id)

  const { data: bookings } = await supabase
    .from('student_bookings')
    .select(`
      id, student_name, student_email,
      appointment_slots ( start_time, end_time )
    `)
    .in('slot_id', slotIds)
    .is('cancelled_at', null)

  // Filter to either a specific date, or a lookback window of days (both in PST)
  const filtered = (bookings ?? []).filter((b: any) => {
    const slot = b.appointment_slots
    if (!slot?.start_time) return false
    const slotDate = new Date(slot.start_time).toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' })

    if (date) return slotDate === date

    if (days) {
      const now = new Date()
      const cutoff = new Date(now.getTime() - parseInt(days) * 24 * 60 * 60 * 1000)
      return new Date(slot.start_time) >= cutoff && new Date(slot.start_time) <= now
    }

    return false
  })

  // Get existing survey responses for these bookings
  const bookingIds = filtered.map((b: any) => b.id)
  const { data: existingSurveys } = await supabase
    .from('survey_responses')
    .select('booking_id, additional_answers')
    .eq('respondent_type', 'mentor')
    .in('booking_id', bookingIds)

  const surveyMap = new Map(
    (existingSurveys ?? []).map((s: any) => [s.booking_id, s.additional_answers])
  )

  const result = filtered.map((b: any) => ({
    bookingId: b.id,
    studentName: b.student_name,
    startTime: b.appointment_slots.start_time,
    noShow: surveyMap.get(b.id)?.no_show === 'Yes',
    meetIssue: surveyMap.get(b.id)?.meet_issue === 'Yes',
  }))

  return NextResponse.json(result)
}
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const body = await request.json()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { bookingId, noShow, meetIssue } = body

  if (!bookingId) {
    return NextResponse.json({ error: 'Missing bookingId' }, { status: 400 })
  }

  // Check if a survey response already exists for this booking
  const { data: existing } = await supabase
    .from('survey_responses')
    .select('id')
    .eq('booking_id', bookingId)
    .eq('respondent_type', 'mentor')
    .maybeSingle()

  const additionalAnswers = {
    no_show:    noShow ? 'Yes' : 'No',
    meet_issue: meetIssue ? 'Yes' : 'No',
  }

 if (existing) {
    await supabase
      .from('survey_responses')
      .update({ additional_answers: additionalAnswers })
      .eq('id', existing.id)
  } else {
    await supabase
      .from('survey_responses')
      .insert({
        booking_id:         bookingId,
        respondent_type:    'mentor',
        additional_answers: additionalAnswers,
        submitted_at:       new Date().toISOString(),
      })
  }

  return NextResponse.json({ ok: true })
}