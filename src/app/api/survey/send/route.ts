import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { sendEmail } from '@/lib/email'
import { surveyEmail } from '@/lib/email-templates/survey'

export async function POST(request: NextRequest) {
  // Verify internal secret
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.INTERNAL_API_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createServerSupabaseClient()
  const now = new Date()

  // Find appointments that ended in the last 10 minutes
  // and haven't had surveys sent yet
  const tenMinutesAgo = new Date(now.getTime() - 30 * 60_000).toISOString()

  const { data: bookings } = await supabase
    .from('student_bookings')
    .select(`
      id, student_name, student_email,
      appointment_slots (
        start_time, end_time,
        mentor_profiles ( full_name, email )
      )
    `)
    .is('cancelled_at', null)
    .lte('appointment_slots.end_time', now.toISOString())
    .gte('appointment_slots.end_time', tenMinutesAgo)

  let sent = 0

  for (const booking of bookings ?? []) {
    const slot   = booking.appointment_slots as any
    const mentor = slot?.mentor_profiles

    if (!slot || !mentor) continue

    // Check if survey email already sent (regardless of whether they filled it out)
    const { data: existingEmail } = await supabase
      .from('notifications_log')
      .select('id')
      .eq('booking_id', booking.id)
      .eq('notification_type', 'survey_student')
      .limit(1)
      .maybeSingle()

    if (existingEmail) continue

    const appUrl = process.env.NEXT_PUBLIC_APP_URL!

    // Send student survey email
    try {
      const studentSurvey = surveyEmail({
        recipientName:  booking.student_name.split(' ')[0],
        otherPartyName: mentor.full_name.split(' ')[0],
        startTime:      slot.start_time,
        surveyUrl:      `${appUrl}/survey/${booking.id}/student`,
        recipientType:  'student',
      })

      await sendEmail({
        to:               booking.student_email,
        subject:          studentSurvey.subject,
        html:             studentSurvey.html,
        bookingId:        booking.id,
        notificationType: 'survey_student',
        recipientType:    'student',
      })
    } catch (err) {
      console.error('Student survey email failed:', err)
    }

    // Send mentor survey email
    try {
      const mentorSurvey = surveyEmail({
        recipientName:  mentor.full_name.split(' ')[0],
        otherPartyName: booking.student_name.split(' ')[0],
        startTime:      slot.start_time,
        surveyUrl:      `${appUrl}/survey/${booking.id}/mentor`,
        recipientType:  'mentor',
      })

      await sendEmail({
        to:               mentor.email,
        subject:          mentorSurvey.subject,
        html:             mentorSurvey.html,
        bookingId:        booking.id,
        notificationType: 'survey_mentor',
        recipientType:    'mentor',
      })
    } catch (err) {
      console.error('Mentor survey email failed:', err)
    }

    sent++
  }

  return NextResponse.json({ sent })
}