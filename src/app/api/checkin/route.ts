import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function generateCode(length = 6) {
  return Math.random().toString(36).toUpperCase().slice(2, 2 + length)
}

export async function POST(request: NextRequest) {
  const body = await request.json()

  if (!body.firstName || !body.lastName || !body.studentEmail) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 422 })
  }

  const studentName  = `${body.firstName} ${body.lastName}`
  const studentEmail = body.studentEmail.toLowerCase().trim()

  // Create the queue entry
  const { data: queueEntry, error: queueError } = await supabase
    .from('walkin_queue')
    .insert({
      student_name:  studentName,
      student_email: studentEmail,
      student_phone: body.studentPhone ?? null,
    })
    .select()
    .single()

  if (queueError) {
    console.error('Check-in insert error:', queueError)
    return NextResponse.json({ error: queueError.message }, { status: 500 })
  }

  // Save intake answers to walkin_queue_answers
  if (body.answers && body.answers.length > 0) {
    const answersToInsert = body.answers
      .filter((a: any) => a.answer && a.answer.trim())
      .map((a: any) => ({
        queue_id:    queueEntry.id,
        question_id: a.questionId,
        answer_text: a.answer,
      }))

    if (answersToInsert.length > 0) {
      await supabase.from('walkin_queue_answers').insert(answersToInsert)
    }
  }

  // Create permanent student_bookings record
  const { data: booking, error: bookingError } = await supabase
    .from('student_bookings')
    .insert({
      slot_id:           null,
      student_name:      studentName,
      student_email:     studentEmail,
      student_phone:     body.studentPhone ?? null,
      sms_consent:       false,
      confirmation_code: generateCode(),
      meeting_type:      'in_person',
      queue_id:          queueEntry.id,
    })
    .select()
    .single()

 if (bookingError) {
    console.error('Booking insert error:', bookingError)
    // Don't fail the check-in if booking fails — queue entry is more important
  }

  // Also save intake answers to booking_question_answers so they show in student profile
  if (booking && body.answers && body.answers.length > 0) {
    const bookingAnswers = body.answers
      .filter((a: any) => a.answer && a.answer.trim())
      .map((a: any) => ({
        booking_id:  booking.id,
        question_id: a.questionId,
        answer_text: a.answer,
      }))

    if (bookingAnswers.length > 0) {
      await supabase.from('booking_question_answers').insert(bookingAnswers)
    }
  }

  return NextResponse.json({ ok: true, queueId: queueEntry.id, bookingId: booking?.id })
}