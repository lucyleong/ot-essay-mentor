import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  const { bookingId, newMentorId } = await request.json()

  if (!bookingId || !newMentorId) {
    return NextResponse.json({ error: 'Missing bookingId or newMentorId' }, { status: 400 })
  }

  // Get the current booking with slot info
  const { data: booking } = await supabase
    .from('student_bookings')
    .select(`
      id, student_name, student_email,
      slot_id,
      appointment_slots (
        id, start_time, end_time, duration_minutes,
        meeting_type, google_meet_link, google_calendar_event_id,
        mentor_profiles ( full_name )
      )
    `)
    .eq('id', bookingId)
    .single()

  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

  const oldSlot = (booking as any).appointment_slots

  // Cancel the old mentor's slot
  await supabase
    .from('appointment_slots')
    .update({ is_cancelled: true, is_booked: false })
    .eq('id', booking.slot_id)

  // Get new mentor's name
  const { data: newMentor } = await supabase
    .from('mentor_profiles')
    .select('full_name, email')
    .eq('id', newMentorId)
    .single()

  if (!newMentor) return NextResponse.json({ error: 'Mentor not found' }, { status: 404 })

  // Check if new mentor already has a slot at the same time
  const { data: existingSlot } = await supabase
    .from('appointment_slots')
    .select('id')
    .eq('mentor_id', newMentorId)
    .eq('start_time', oldSlot.start_time)
    .eq('is_cancelled', false)
    .maybeSingle()

  let newSlotId: string

  if (existingSlot) {
    // Use existing slot
    newSlotId = existingSlot.id
    await supabase
      .from('appointment_slots')
      .update({
        is_booked: true,
        google_meet_link: oldSlot.google_meet_link,
        google_calendar_event_id: oldSlot.google_calendar_event_id,
      })
      .eq('id', newSlotId)
  } else {
    // Create a new slot for the new mentor inheriting the Meet link
    const { data: newSlot } = await supabase
      .from('appointment_slots')
      .insert({
        mentor_id:                newMentorId,
        start_time:               oldSlot.start_time,
        end_time:                 oldSlot.end_time,
        duration_minutes:         oldSlot.duration_minutes,
        meeting_type:             oldSlot.meeting_type,
        google_meet_link:         oldSlot.google_meet_link,
        google_calendar_event_id: oldSlot.google_calendar_event_id,
        is_booked:                true,
        is_cancelled:             false,
      })
      .select()
      .single()

    if (!newSlot) return NextResponse.json({ error: 'Failed to create new slot' }, { status: 500 })
    newSlotId = newSlot.id
  }

  // Update the booking to point to the new slot
  await supabase
    .from('student_bookings')
    .update({ slot_id: newSlotId })
    .eq('id', bookingId)

  // Email the student about the mentor change
  try {
    const apptDate = new Date(oldSlot.start_time).toLocaleDateString('en-US', {
      timeZone: 'America/Los_Angeles',
      weekday: 'long', month: 'long', day: 'numeric',
      hour: 'numeric', minute: '2-digit',
    })

    await sendEmail({
      to: booking.student_email,
      subject: 'Your mentor appointment has been updated',
      html: `
        <p>Hi ${booking.student_name.split(' ')[0]},</p>
        <p>Your appointment on ${apptDate} has been reassigned to a new mentor: <strong>${newMentor.full_name}</strong>.</p>
        <p>Your appointment time and Google Meet link remain the same — no action needed on your part.</p>
        ${oldSlot.google_meet_link ? `<p><a href="${oldSlot.google_meet_link}" style="color:#534AB7;">Join Google Meet</a></p>` : ''}
        <p>If you have any questions, contact us at <a href="mailto:admin@otessaymentors.org">admin@otessaymentors.org</a>.</p>
      `,
      notificationType: 'mentor_transfer',
      recipientType: 'student',
    })
 } catch (emailErr) {
    console.error('Transfer notification email failed:', emailErr)
  }

  // Email the new mentor about the transfer
  try {
    const apptDate = new Date(oldSlot.start_time).toLocaleDateString('en-US', {
      timeZone: 'America/Los_Angeles',
      weekday: 'long', month: 'long', day: 'numeric',
      hour: 'numeric', minute: '2-digit',
    })

    await sendEmail({
      to: newMentor.email,
      subject: `New student assigned to your schedule — ${booking.student_name}`,
      html: `
        <p>Hi ${newMentor.full_name.split(' ')[0]},</p>
        <p><strong>${booking.student_name}</strong> has been assigned to you for an appointment on ${apptDate}.</p>
        <p>You can view their profile and any essays they've shared in your <a href="${process.env.NEXT_PUBLIC_APP_URL}/mentor/dashboard">mentor dashboard</a>.</p>
        ${oldSlot.google_meet_link ? `<p><a href="${oldSlot.google_meet_link}" style="color:#534AB7;">Join Google Meet</a></p>` : ''}
        <p>If you have any questions, contact us at <a href="mailto:admin@otessaymentors.org">admin@otessaymentors.org</a>.</p>
      `,
      notificationType: 'mentor_transfer',
      recipientType: 'mentor',
    })
  } catch (mentorEmailErr) {
    console.error('New mentor transfer notification email failed:', mentorEmailErr)
  }

  return NextResponse.json({ ok: true, newMentorName: newMentor.full_name })
}