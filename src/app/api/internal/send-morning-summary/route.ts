import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email'
import { mentorMorningSummaryEmail } from '@/lib/email-templates/mentor-summary'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.INTERNAL_API_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' })

  const { data: bookings } = await supabase
    .from('student_bookings')
    .select(`
      id, student_name, student_phone,
      sms_confirmed_at, sms_confirm_sent,
      appointment_slots (
        start_time, end_time, google_meet_link, mentor_id,
        mentor_profiles ( id, full_name, email )
      )
    `)
    .is('cancelled_at', null)

  // Filter to today's appointments in PST
  const todayBookings = (bookings ?? []).filter((b: any) => {
    const slot = b.appointment_slots
    if (!slot?.start_time) return false
    const slotDate = new Date(slot.start_time).toLocaleDateString('en-CA', {
      timeZone: 'America/Los_Angeles'
    })
    return slotDate === today
  })

  if (todayBookings.length === 0) {
    return NextResponse.json({ sent: 0, reason: 'No appointments today' })
  }

  // Group by mentor
  const byMentor = new Map<string, { mentor: any; bookings: any[] }>()

  for (const booking of todayBookings) {
    const slot   = booking.appointment_slots as any
    const mentor = slot?.mentor_profiles
    if (!mentor) continue

    if (!byMentor.has(mentor.id)) {
      byMentor.set(mentor.id, { mentor, bookings: [] })
    }
    byMentor.get(mentor.id)!.bookings.push(booking)
  }

  let sent = 0

  for (const [mentorId, { mentor, bookings: mentorBookings }] of byMentor) {
    // Check if summary already sent today
    const { data: alreadySent } = await supabase
      .from('mentor_daily_summaries')
      .select('id')
      .eq('mentor_id', mentorId)
      .eq('summary_date', today)
      .maybeSingle()

    if (alreadySent) continue

    const appointments = mentorBookings
      .sort((a: any, b: any) => {
        const aSlot = a.appointment_slots as any
        const bSlot = b.appointment_slots as any
        return new Date(aSlot.start_time).getTime() - new Date(bSlot.start_time).getTime()
      })
      .map((b: any) => {
        const slot = b.appointment_slots as any
        return {
          studentName:  b.student_name,
          studentPhone: b.student_phone ?? null,
          startTime:    slot.start_time,
          endTime:      slot.end_time,
          meetLink:     slot.google_meet_link ?? null,
          smsStatus:    (b.sms_confirmed_at ? 'confirmed' :
                        b.sms_confirm_sent  ? 'no_reply'  : 'no_sms') as 'confirmed' | 'no_reply' | 'no_sms',
        }
      })
console.log('Dashboard URL:', `${process.env.NEXT_PUBLIC_APP_URL}/mentor/dashboard`)
    const { subject, html } = mentorMorningSummaryEmail({
      mentorName:   mentor.full_name,
      appointments,
      dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/mentor/dashboard`,
    })

    try {
      await sendEmail({
        to:               mentor.email,
        subject,
        html,
        notificationType: 'mentor_morning_summary',
        recipientType:    'mentor',
      })

      await supabase
        .from('mentor_daily_summaries')
        .insert({ mentor_id: mentorId, summary_date: today })

      sent++
    } catch (err) {
      console.error('Morning summary failed for mentor:', mentor.email, err)
    }
  }

  return NextResponse.json({ sent })
}