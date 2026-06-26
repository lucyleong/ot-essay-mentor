import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { addDays, addWeeks, addMonths } from 'date-fns'
import { sendEmail } from '@/lib/email'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  const body = await request.json()

  if (!body.mentorId) {
    return NextResponse.json({ error: 'Missing mentorId' }, { status: 400 })
  }

  // Build base slots from time window
  let baseDaySlots: { start_time: string; end_time: string }[] = []

  if (body.slotTimes && Array.isArray(body.slotTimes)) {
    baseDaySlots = body.slotTimes.map((t: any) => ({
      start_time: t.startTime,
      end_time:   t.endTime,
    }))
  } else {
    baseDaySlots = [{ start_time: body.startTime, end_time: body.endTime }]
  }

  // Expand for recurrence
  const slotsToInsert: any[] = []
  const untilDate = body.recurrenceUntil ? new Date(body.recurrenceUntil) : null

  for (const baseSlot of baseDaySlots) {
    let current = {
      start: new Date(baseSlot.start_time),
      end:   new Date(baseSlot.end_time),
    }

    let count = 0
    while (count < 52) {
      if (untilDate && current.start > untilDate) break

      slotsToInsert.push({
        mentor_id:        body.mentorId,
        start_time:       current.start.toISOString(),
        end_time:         current.end.toISOString(),
        duration_minutes: body.durationMinutes ?? 20,
        meeting_type:     body.meetingType ?? 'virtual',
        recurrence_rule:  body.recurrenceRule ?? null,
      })

      if (!body.recurrenceRule) break

      if (body.recurrenceRule === 'daily') {
        current = { start: addDays(current.start, 1), end: addDays(current.end, 1) }
      } else if (body.recurrenceRule === 'weekly') {
        current = { start: addWeeks(current.start, 1), end: addWeeks(current.end, 1) }
      } else if (body.recurrenceRule === 'biweekly') {
        current = { start: addWeeks(current.start, 2), end: addWeeks(current.end, 2) }
      } else {
        break
      }

      count++
    }
  }

  const { data: inserted, error } = await supabase
    .from('appointment_slots')
    .insert(slotsToInsert)
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify the mentor that availability was added on their behalf
  try {
    const { data: mentor } = await supabase
      .from('mentor_profiles')
      .select('full_name, email')
      .eq('id', body.mentorId)
      .single()

    if (mentor?.email) {
      const firstDate = inserted?.[0]?.start_time
        ? new Date(inserted[0].start_time).toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles', weekday: 'long', month: 'long', day: 'numeric' })
        : 'an upcoming date'

      await sendEmail({
        to:               mentor.email,
        subject:          `New availability added to your mentor dashboard`,
        html:             `
          <p>Hi ${mentor.full_name.split(' ')[0]},</p>
          <p>We've added ${inserted?.length ?? 0} appointment slot${(inserted?.length ?? 0) !== 1 ? 's' : ''} to your mentor schedule, starting ${firstDate}.</p>
          <p>You can view your full schedule by logging into your mentor dashboard at <a href="${process.env.NEXT_PUBLIC_APP_URL}/mentor/dashboard">otessaymentors.org/mentor/dashboard</a>.</p>
          <p>If you haven't logged in before, use the "Forgot password" link on the login page to set up your account.</p>
        `,
        notificationType: 'admin_created_schedule',
        recipientType:    'mentor',
      })
    }
  } catch (emailErr) {
    console.error('Mentor schedule notification email failed:', emailErr)
  }

  return NextResponse.json({ slotsCreated: inserted?.length ?? 0 })
}