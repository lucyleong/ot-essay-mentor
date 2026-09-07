import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email'
import { getFreshAccessToken } from '@/lib/google-auth'
import { formatDateTimePST } from '@/lib/utils'
import { requireAdmin } from '@/lib/admin-auth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const { bookingId, newStartTime, newEndTime } = await request.json()

  if (!bookingId || !newStartTime || !newEndTime) {
    return NextResponse.json({ error: 'Missing bookingId, newStartTime, or newEndTime' }, { status: 400 })
  }

  // Get the current booking with slot info
  const { data: booking, error: bookingError } = await supabase
    .from('student_bookings')
    .select(`
      id, student_name, student_email,
      slot_id,
      appointment_slots (
        id, mentor_id, start_time, end_time, duration_minutes,
        meeting_type, google_meet_link, google_calendar_event_id,
        mentor_profiles ( id, full_name, email )
      )
    `)
    .eq('id', bookingId)
    .single()

  if (bookingError || !booking) {
    return NextResponse.json({ error: bookingError?.message ?? 'Booking not found' }, { status: 404 })
  }

  const oldSlot = (booking as any).appointment_slots
  const mentor  = oldSlot.mentor_profiles

  // Free up the old slot
  const { error: cancelError } = await supabase
    .from('appointment_slots')
    .update({ is_cancelled: true, is_booked: false })
    .eq('id', booking.slot_id)

  if (cancelError) {
    return NextResponse.json(
      { error: `Failed to free up the old slot: ${cancelError.message}` },
      { status: 500 }
    )
  }

  // Reuse an existing open slot for this mentor at the new time if one
  // exists, otherwise create one — same pattern as the mentor-transfer route.
  const { data: existingSlot } = await supabase
    .from('appointment_slots')
    .select('id')
    .eq('mentor_id', oldSlot.mentor_id)
    .eq('start_time', newStartTime)
    .eq('is_cancelled', false)
    .maybeSingle()

  let newSlotId: string

  if (existingSlot) {
    newSlotId = existingSlot.id
    const { error: reuseError } = await supabase
      .from('appointment_slots')
      .update({
        is_booked:                true,
        google_meet_link:         oldSlot.google_meet_link,
        google_calendar_event_id: oldSlot.google_calendar_event_id,
      })
      .eq('id', newSlotId)

    if (reuseError) {
      return NextResponse.json(
        { error: `Failed to update the new slot: ${reuseError.message}` },
        { status: 500 }
      )
    }
  } else {
    const { data: newSlot, error: createError } = await supabase
      .from('appointment_slots')
      .insert({
        mentor_id:                oldSlot.mentor_id,
        start_time:               newStartTime,
        end_time:                 newEndTime,
        duration_minutes:         oldSlot.duration_minutes,
        meeting_type:             oldSlot.meeting_type,
        google_meet_link:         oldSlot.google_meet_link,
        google_calendar_event_id: oldSlot.google_calendar_event_id,
        is_booked:                true,
        is_cancelled:             false,
      })
      .select()
      .single()

    if (createError || !newSlot) {
      return NextResponse.json(
        { error: `Failed to create new slot: ${createError?.message ?? 'unknown error'}` },
        { status: 500 }
      )
    }
    newSlotId = newSlot.id
  }

  // Update the booking to point to the new slot
  const { error: linkError } = await supabase
    .from('student_bookings')
    .update({ slot_id: newSlotId })
    .eq('id', bookingId)

  if (linkError) {
    return NextResponse.json(
      { error: `Slot was created but the booking failed to link to it: ${linkError.message}` },
      { status: 500 }
    )
  }

  // Move the existing Google Calendar event to the new time (keeps the same
  // event and Meet link, rather than deleting/recreating) — best-effort,
  // doesn't block the reschedule if it fails.
  if (oldSlot.google_calendar_event_id) {
    try {
      const accessToken = await getFreshAccessToken()
      const patchRes = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${oldSlot.google_calendar_event_id}?sendUpdates=all`,
        {
          method: 'PATCH',
          headers: {
            Authorization:  `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            start: { dateTime: newStartTime, timeZone: 'America/Los_Angeles' },
            end:   { dateTime: newEndTime,   timeZone: 'America/Los_Angeles' },
          }),
        }
      )
      if (!patchRes.ok) {
        console.error('Reschedule: failed to update calendar event time', await patchRes.text().catch(() => ''))
      }
    } catch (calErr) {
      console.error('Reschedule: calendar update failed', calErr)
    }
  }

  // Email the student and mentor about the new time
  const newApptDate = formatDateTimePST(newStartTime)
  const oldApptDate  = formatDateTimePST(oldSlot.start_time)

  try {
    await sendEmail({
      to:      booking.student_email,
      subject: 'Your mentor appointment has been rescheduled',
      html: `
        <p>Hi ${booking.student_name.split(' ')[0]},</p>
        <p>Your appointment with ${mentor?.full_name ?? 'your mentor'} has been moved from ${oldApptDate} to <strong>${newApptDate}</strong>.</p>
        ${oldSlot.google_meet_link ? `<p><a href="${oldSlot.google_meet_link}" style="color:#534AB7;">Join Google Meet</a></p>` : ''}
        <p>If you have any questions, contact us at <a href="mailto:admin@otessaymentors.org">admin@otessaymentors.org</a>.</p>
      `,
      notificationType: 'booking_reschedule',
      recipientType:    'student',
    })
  } catch (emailErr) {
    console.error('Reschedule notification email to student failed:', emailErr)
  }

  if (mentor?.email) {
    try {
      await sendEmail({
        to:      mentor.email,
        subject: `Appointment rescheduled — ${booking.student_name}`,
        html: `
          <p>Hi ${mentor.full_name.split(' ')[0]},</p>
          <p>Your appointment with <strong>${booking.student_name}</strong> has been moved from ${oldApptDate} to <strong>${newApptDate}</strong>.</p>
          ${oldSlot.google_meet_link ? `<p><a href="${oldSlot.google_meet_link}" style="color:#534AB7;">Join Google Meet</a></p>` : ''}
        `,
        notificationType: 'booking_reschedule',
        recipientType:    'mentor',
      })
    } catch (emailErr) {
      console.error('Reschedule notification email to mentor failed:', emailErr)
    }
  }

  return NextResponse.json({ ok: true })
}
