import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getFreshAccessToken } from '@/lib/google-auth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ bookingId: string }> }
) {
  const { bookingId } = await context.params

  // Get the booking to find the slot
  const { data: booking } = await supabase
    .from('student_bookings')
    .select('id, slot_id, cancelled_at')
    .eq('id', bookingId)
    .single()

  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  if (booking.cancelled_at) {
    return NextResponse.json({ error: 'Booking already cancelled' }, { status: 400 })
  }

  // Cancel the booking
  await supabase
    .from('student_bookings')
    .update({ cancelled_at: new Date().toISOString() })
    .eq('id', bookingId)

  // Free up the slot
  await supabase
    .from('appointment_slots')
    .update({ is_booked: false })
    .eq('id', booking.slot_id)

  // Delete Google Calendar event and clear slot fields
  try {
    const { data: slot } = await supabase
      .from('appointment_slots')
      .select('google_calendar_event_id')
      .eq('id', booking.slot_id)
      .single()

    if (slot?.google_calendar_event_id) {
      const accessToken = await getFreshAccessToken()

      // Delete the calendar event entirely
      await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${slot.google_calendar_event_id}?sendUpdates=all`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      )

      // Clear calendar fields from slot
      await supabase
        .from('appointment_slots')
        .update({
          google_calendar_event_id: null,
          google_meet_link: null,
        })
        .eq('id', booking.slot_id)
    }
  } catch (calErr) {
    console.error('Calendar deletion failed on cancel:', calErr)
  }
// Notify program account of cancellation
  try {
    const { data: cancelledBooking } = await supabase
      .from('student_bookings')
      .select(`
        student_name, student_email,
        appointment_slots (
          start_time,
          mentor_profiles ( full_name )
        )
      `)
      .eq('id', bookingId)
      .single()

    if (cancelledBooking) {
      const slot       = cancelledBooking.appointment_slots as any
      const mentor     = slot?.mentor_profiles
      const apptDate   = slot?.start_time
        ? new Date(slot.start_time).toLocaleDateString('en-US', {
            weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit',
            timeZone: 'America/Los_Angeles',
          })
        : 'unknown date'

      await sendEmail({
        to:               'otessaymentors@gmail.com',
        subject:          `Cancellation: ${cancelledBooking.student_name} cancelled their appointment`,
        html:             `
          <p>A student has cancelled their appointment.</p>
          <p><strong>Student:</strong> ${cancelledBooking.student_name} (${cancelledBooking.student_email})</p>
          <p><strong>Mentor:</strong> ${mentor?.full_name ?? 'Unknown'}</p>
          <p><strong>Appointment:</strong> ${apptDate}</p>
          <p>The slot has been freed up and is available for new bookings.</p>
        `,
        notificationType: 'cancellation_admin',
        recipientType:    'admin',
      })
    }
  } catch (emailErr) {
    console.error('Cancellation notification email failed:', emailErr)
  }
  return NextResponse.json({ ok: true })
}