import { createClient } from '@supabase/supabase-js'
import { getFreshAccessToken } from './google-auth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function createSlotOnCalendar(slotId: string) {
  const { data: slot } = await supabase
    .from('appointment_slots')
    .select('*, mentor_profiles(*)')
    .eq('id', slotId)
    .single()

  if (!slot) throw new Error('Slot not found')

  const accessToken = await getFreshAccessToken()

  const event = {
    summary: `OT Essay Mentor Appointment — ${slot.mentor_profiles.full_name}`,
    description: 'A student will be added when they book this appointment.',
    start: {
      dateTime: slot.start_time,
      timeZone: 'America/Los_Angeles',
    },
    end: {
      dateTime: slot.end_time,
      timeZone: 'America/Los_Angeles',
    },
    guestsCanModify: true,
    guestsCanInviteOthers: false,
    conferenceData: {
      createRequest: {
        requestId: slotId,
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 24 * 60 },
        { method: 'popup', minutes: 60 },
      ],
    },
  }

  const res = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1',
    {
      method: 'POST',
      headers: {
        Authorization:  `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    }
  )

  if (!res.ok) {
    const err = await res.json()
    throw new Error(`Calendar API error: ${JSON.stringify(err)}`)
  }

  const createdEvent = await res.json()
  const meetLink = createdEvent.conferenceData?.entryPoints?.find(
    (e: any) => e.entryPointType === 'video'
  )?.uri ?? null

  // Save event ID and Meet link back to the slot
  await supabase
    .from('appointment_slots')
    .update({
      google_calendar_event_id: createdEvent.id,
      google_meet_link:         meetLink,
    })
    .eq('id', slotId)

  return { eventId: createdEvent.id, meetLink }
}

export async function addStudentToCalendarEvent(bookingId: string) {
  const { data: booking } = await supabase
    .from('student_bookings')
    .select('*, appointment_slots(*, mentor_profiles(*))')
    .eq('id', bookingId)
    .single()

  if (!booking) throw new Error('Booking not found')

  const slot   = booking.appointment_slots as any
  const mentor = (slot as any).mentor_profiles

if (!slot.google_calendar_event_id) {
    // No calendar event exists for this slot — create one now
   const { eventId, meetLink: newMeetLink } = await createSlotOnCalendar(slot.id)
    
    // Brief delay to avoid Google Calendar API rate limit
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // Now add the student as an attendee to the newly created event
    const accessToken = await getFreshAccessToken()
    
const patchRes = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}?conferenceDataVersion=1&sendUpdates=all`,
      {
        method: 'PATCH',
        headers: {
          Authorization:  `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          attendees: [
            { email: booking.student_email, displayName: booking.student_name },
            { email: mentor.email, displayName: mentor.full_name },
          ],
        }),
      }
    )
    
    return { meetLink: newMeetLink }
    return { meetLink: newMeetLink }

  }
  const accessToken = await getFreshAccessToken()

  // Get current event to preserve existing attendees
  const getRes = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${slot.google_calendar_event_id}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  const currentEvent = await getRes.json()
  const existingAttendees = currentEvent.attendees ?? []

  // Patch event to add student as attendee
  const patchRes = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${slot.google_calendar_event_id}?conferenceDataVersion=1&sendUpdates=all`,
    {
      method: 'PATCH',
      headers: {
        Authorization:  `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        attendees: [
          ...existingAttendees,
          {
            email:       booking.student_email,
            displayName: booking.student_name,
          },
          {
            email:       mentor.email,
            displayName: mentor.full_name,
          },
        ],
        description: `Student: ${booking.student_name}\nEmail: ${booking.student_email}\n\nJoin with Google Meet: ${slot.google_meet_link}`,
      }),
    }
  )

  if (!patchRes.ok) {
    const err = await patchRes.json()
    throw new Error(`Calendar patch error: ${JSON.stringify(err)}`)
  }

  return { meetLink: slot.google_meet_link }
}