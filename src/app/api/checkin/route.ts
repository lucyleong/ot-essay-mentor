import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  const body = await request.json()

  if (!body.firstName || !body.lastName || !body.studentEmail) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 422 })
  }

  // Create the queue entry
  const { data: queueEntry, error: queueError } = await supabase
    .from('walkin_queue')
    .insert({
      student_name:  `${body.firstName} ${body.lastName}`,
      student_email: body.studentEmail.toLowerCase().trim(),
      student_phone: body.studentPhone ?? null,
    })
    .select()
    .single()

  if (queueError) {
    console.error('Check-in insert error:', queueError)
    return NextResponse.json({ error: queueError.message }, { status: 500 })
  }

  // Save intake answers
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

  return NextResponse.json({ ok: true, queueId: queueEntry.id })
}