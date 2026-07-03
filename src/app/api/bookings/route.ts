import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { assertGmail } from '@/lib/validators'
import { sendEmail } from '@/lib/email'
import { studentConfirmationEmail } from '@/lib/email-templates/student-confirmation'
import { format, parseISO } from 'date-fns'
import { addStudentToCalendarEvent } from '@/lib/calendar'
import { sendSMS } from '@/lib/sms'

export async function POST(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  
  )
  const body = await request.json()
// Verify Turnstile token
  const turnstileRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      secret:   process.env.TURNSTILE_SECRET_KEY!,
      response: body.turnstileToken ?? '',
    }),
  })
  const turnstileData = await turnstileRes.json()
  if (!turnstileData.success) {
    return NextResponse.json({ error: 'Security check failed. Please try again.' }, { status: 400 })
  }
  // Validate Gmail address
  try {
    assertGmail(body.studentEmail)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 422 })
  }

const { data: existingBookings } = await supabase
    .from('student_bookings')
    .select('id, appointment_slots(start_time, mentor_profiles(full_name))')
    .eq('student_email', body.studentEmail.toLowerCase().trim())
    .is('cancelled_at', null)

  const existingBooking = (existingBookings ?? []).find((b: any) => {
    const slot = b.appointment_slots
    return slot && new Date(slot.start_time) > new Date()
  })

  const existingSlot = existingBooking?.appointment_slots as any

  if (existingBooking) {
    const slot        = existingBooking.appointment_slots as any
    const mentorName  = slot?.mentor_profiles?.full_name ?? 'your mentor'
    const apptDate    = slot?.start_time
      ? new Date(slot.start_time).toLocaleDateString('en-US', {
          weekday: 'long', month: 'long', day: 'numeric',
        })
      : 'a future date'

    return NextResponse.json(
      {
        error: `You already have an upcoming appointment with ${mentorName} on ${apptDate}. One appointment per student at a time only. Please complete your current appointment before booking a new one.`,
      },
      { status: 409 }
    )
  }const { data: slot, error: slotError } = await supabase
    .from('appointment_slots')
    .select('id, is_booked, is_cancelled, mentor_id, start_time, end_time, meeting_type, google_meet_link, mentor_profiles(full_name, email)')
    .eq('id', body.slotId)
    .single()

  if (slotError || !slot) {
    return NextResponse.json(
      { error: 'Slot not found.' },
      { status: 404 }
    )
  }

  if (slot.is_booked || slot.is_cancelled) {
    return NextResponse.json(
      { error: 'Sorry, this slot was just booked by someone else. Please choose another time.' },
      { status: 409 }
    )
  }

  // Generate confirmation code
  const confirmationCode = Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase()

  // Create the booking
  const { data: booking, error: bookingError } = await supabase
    .from('student_bookings')
    .insert({
      slot_id:           body.slotId,
      student_name:      `${body.firstName} ${body.lastName}`,
      student_email:     body.studentEmail.toLowerCase().trim(),
      student_phone:     body.studentPhone,
      sms_consent:       !!body.smsConsent,
      confirmation_code: confirmationCode,
    })
    .select()
    .single()
if (bookingError) {
    console.error('Booking insert error:', bookingError)
    return NextResponse.json(
      { error: (bookingError as any).message },
      { status: 500 }
    )
  }
  // Mark the slot as booked
  await supabase
    .from('appointment_slots')
    .update({ is_booked: true })
    .eq('id', body.slotId)

  // Save intake question answers
  if (body.answers && body.answers.length > 0) {
    const answersToInsert = body.answers
      .filter((a: any) => a.answer && a.answer.toString().trim() !== '')
      .map((a: any) => ({
        booking_id:  booking.id,
        question_id: a.questionId,
        answer_text: Array.isArray(a.answer)
          ? a.answer.join(', ')
          : a.answer.toString(),
      }))

    if (answersToInsert.length > 0) {
      await supabase
        .from('booking_question_answers')
        .insert(answersToInsert)
    }
  }
// Add student to Google Calendar event
let meetLink = slot.google_meet_link

try {
  const calResult = await addStudentToCalendarEvent(booking.id)
  if (calResult.meetLink) {
    meetLink = calResult.meetLink
    await supabase
      .from('appointment_slots')
      .update({ google_meet_link: calResult.meetLink })
      .eq('id', body.slotId)
  }
} catch (calErr) {
  console.error('Calendar update failed:', calErr)
}

// Send SMS if student consented
  if (body.studentPhone && body.smsConsent) {
    try {
      const isReturningStudent = (existingBookings ?? []).length > 0
      await sendSMS({
        to:   body.studentPhone,
        body: isReturningStudent
          ? `Your appointment with your mentor from the OT College Mentor Program has been confirmed. Reply HELP for help or STOP to opt-out.`
          : `Welcome to the OT College Mentor Program! You have been added to receive appointment reminders. Message frequency varies. Message and data rates may apply. Reply HELP for help or STOP to opt-out.`,
      })

      // If appointment is within 24-49 hours, send reminder immediately
      const hoursUntil = (new Date(slot.start_time).getTime() - Date.now()) / 3600_000
      if (hoursUntil >= 24 && hoursUntil <= 49) {
        const apptDate = format(
          new Date(new Date(slot.start_time).toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })),
          'EEEE, MMMM d'
        )
        const apptTime = format(
          new Date(new Date(slot.start_time).toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })),
          'h:mm a'
        )
        await sendSMS({
          to:   body.studentPhone,
          body: `Hi, your appointment with your mentor from the OT College Mentor Program is coming up on ${apptDate} at ${apptTime}. Please press 1 to CONFIRM or 9 to CANCEL. Reply HELP for help or STOP to opt-out.`,
        })

        // Mark reminder as sent
        await supabase
          .from('student_bookings')
          .update({ sms_confirm_sent: true })
          .eq('id', booking.id)
      }
    } catch (smsErr) {
      console.error('Booking SMS failed:', smsErr)
    }
  }

  // Send student confirmation email
  try {
    const { subject, html } = studentConfirmationEmail({
      cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL}/book/${booking.id}/cancel`,
  studentName:      `${body.firstName} ${body.lastName}`,
mentorName: (slot.mentor_profiles as any).full_name.split(' ')[0],
  mentorDepartment: (slot.mentor_profiles as any).department ?? '',
  startTime:        slot.start_time,
  endTime:          slot.end_time,
  meetingType:      slot.meeting_type,
  meetLink:         meetLink,
  confirmationCode: booking.confirmation_code,
 essayUploadUrl :   `${process.env.NEXT_PUBLIC_APP_URL}/book/${booking.id}/essays`,
})

    await sendEmail({
      to:               body.studentEmail.toLowerCase().trim(),
      subject,
      html,
      bookingId:        booking.id,
      notificationType: 'booking_confirmation',
      recipientType:    'student',
    })
  } catch (emailErr) {
    console.error('Confirmation email failed:', emailErr)
    // Don't fail the booking if email fails
  }

  return NextResponse.json({
    success:          true,
    bookingId:        booking.id,
    confirmationCode: booking.confirmation_code,
    meetLink:         slot.google_meet_link,
  })
}