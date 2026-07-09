import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ bookingId: string }> }
) {
  const { bookingId } = await context.params
  const body = await request.json()

 // Check for existing survey response to prevent duplicates
  const { data: existing } = await supabase
    .from('survey_responses')
    .select('id')
    .eq('booking_id', bookingId)
    .eq('respondent_type', 'mentor')
    .single()

  if (existing) return NextResponse.json({ ok: true }) // Already submitted, silently succeed

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