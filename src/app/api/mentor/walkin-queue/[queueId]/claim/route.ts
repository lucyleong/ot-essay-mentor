import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const serviceSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ queueId: string }> }
) {
  const supabase = await createServerSupabaseClient()
  const { queueId } = await context.params

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: mentor } = await supabase
    .from('mentor_profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (!mentor) return NextResponse.json({ error: 'Not a mentor' }, { status: 403 })

  // Update walk-in queue status
  const { error } = await serviceSupabase
    .from('walkin_queue')
    .update({
      status: 'helped',
      helped_by_mentor_id: mentor.id,
      helped_at: new Date().toISOString(),
    })
    .eq('id', queueId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Find the permanent booking linked to this queue entry and link mentor
  const { data: booking } = await serviceSupabase
    .from('student_bookings')
    .select('id')
    .eq('queue_id', queueId)
    .single()

  if (booking) {
    // Create a walk-in slot for this mentor so the booking appears in their student list
    const { data: queueEntry } = await serviceSupabase
      .from('walkin_queue')
      .select('student_name, student_email, checked_in_at')
      .eq('id', queueId)
      .single()

    if (queueEntry) {
      // Find or create a walk-in slot for this mentor
      let { data: slot } = await serviceSupabase
        .from('appointment_slots')
        .select('id')
        .eq('mentor_id', mentor.id)
        .eq('meeting_type', 'in_person')
        .gte('start_time', new Date().toISOString().split('T')[0])
        .maybeSingle()

      if (!slot) {
        const { data: newSlot } = await serviceSupabase
          .from('appointment_slots')
          .insert({
            mentor_id:    mentor.id,
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
        await serviceSupabase
          .from('student_bookings')
          .update({ slot_id: slot.id })
          .eq('id', booking.id)
      }
    }
  }

  return NextResponse.json({ ok: true })
}