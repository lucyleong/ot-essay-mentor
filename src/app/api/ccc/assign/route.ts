import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  const { queueId, mentorId } = await request.json()

  if (!queueId || !mentorId) {
    return NextResponse.json({ error: 'Missing queueId or mentorId' }, { status: 400 })
  }

  const { error } = await supabase
    .from('walkin_queue')
    .update({
      status: 'helped',
      helped_by_mentor_id: mentorId,
      helped_at: new Date().toISOString(),
    })
    .eq('id', queueId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Update permanent booking with mentor's slot
  const { data: booking } = await supabase
    .from('student_bookings')
    .select('id')
    .eq('queue_id', queueId)
    .single()

  if (booking) {
    let { data: slot } = await supabase
      .from('appointment_slots')
      .select('id')
      .eq('mentor_id', mentorId)
      .eq('meeting_type', 'in_person')
      .gte('start_time', new Date().toISOString().split('T')[0])
      .maybeSingle()

    if (!slot) {
      const { data: newSlot } = await supabase
        .from('appointment_slots')
        .insert({
          mentor_id:    mentorId,
          start_time:   new Date().toISOString(),
          end_time:     new Date(Date.now() + 20 * 60000).toISOString(),
          meeting_type: 'in_person',
          is_booked:    true,
          is_cancelled: false,
        })
        .select()
        .single()
      slot = newSlot
    }

    if (slot) {
      await supabase
        .from('student_bookings')
        .update({ slot_id: slot.id })
        .eq('id', booking.id)
    }
  }

  return NextResponse.json({ ok: true })
}