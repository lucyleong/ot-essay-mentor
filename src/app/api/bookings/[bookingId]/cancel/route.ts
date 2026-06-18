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

  // Remove student from Google Calendar event
  try {
    const { data: slot } = await supabase
      .from('appointment_slots')
      .select('google_calendar_event_id, mentor_profiles(email)')
      .eq('id', booking.slot_id)
      .single()

    if (slot?.google_calendar_event_id) {
      const accessToken = await getFreshAccessToken()

      // Get current attendees
      const getRes = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${slot.google_calendar_event_id}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )
      const currentEvent = await getRes.json()

      // Filter out the cancelled student
      const { data: cancelledBooking } = await supabase
        .from('student_bookings')
        .select('student_email')
        .eq('id', bookingId)
        .single()

      const updatedAttendees = (currentEvent.attendees ?? []).filter(
        (a: any) => a.email !== cancelledBooking?.student_email
      )

      // Patch the event
      await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${slot.google_calendar_event_id}?sendUpdates=all`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ attendees: updatedAttendees }),
        }
      )
    }
  } catch (calErr) {
    console.error('Calendar update failed on cancel:', calErr)
    // Don't fail the cancellation if calendar update fails
  }

  return NextResponse.json({ ok: true })
}