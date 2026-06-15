import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ bookingId: string }> }
) {
  const supabase = await createServerSupabaseClient()
  const { bookingId } = await context.params
  const body = await request.json()

  const { error } = await supabase
    .from('survey_responses')
    .insert({
      booking_id:         bookingId,
      respondent_type:    'mentor',
      additional_answers: body.additional_answers,
      submitted_at:       new Date().toISOString(),
    })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}