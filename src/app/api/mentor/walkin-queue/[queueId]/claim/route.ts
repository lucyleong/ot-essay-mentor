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
    .maybeSingle()

  if (!mentor) return NextResponse.json({ error: 'Not a mentor' }, { status: 403 })

  // Update walk-in queue status
  const { data: updatedRows, error } = await serviceSupabase
    .from('walkin_queue')
    .update({
      status: 'helped',
      helped_by_mentor_id: mentor.id,
      helped_at: new Date().toISOString(),
    })
    .eq('id', queueId)
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!updatedRows || updatedRows.length === 0) {
    return NextResponse.json(
      { error: `No walk-in queue entry found with id ${queueId}` },
      { status: 404 }
    )
  }

  // Find the permanent booking linked to this queue entry and link mentor
  const { data: booking, error: bookingLookupError } = await serviceSupabase
    .from('student_bookings')
    .select('id')
    .eq('queue_id', queueId)
    .maybeSingle()

  if (bookingLookupError) {
    return NextResponse.json(
      { error: `Marked helped, but failed to look up booking: ${bookingLookupError.message}` },
      { status: 500 }
    )
  }

  if (!booking) {
    return NextResponse.json(
      { error: `Marked helped, but no student_bookings row found for queue entry ${queueId}` },
      { status: 404 }
    )
  }

  // Create a walk-in slot for this mentor so the booking appears in their student list
  const { data: newSlot, error: slotInsertError } = await serviceSupabase
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

  if (slotInsertError || !newSlot) {
    return NextResponse.json(
      { error: `Marked helped, but failed to create a slot: ${slotInsertError?.message ?? 'unknown error'}` },
      { status: 500 }
    )
  }

  const { error: linkError } = await serviceSupabase
    .from('student_bookings')
    .update({ slot_id: newSlot.id })
    .eq('id', booking.id)

  if (linkError) {
    return NextResponse.json(
      { error: `Marked helped, but failed to link the slot to the booking: ${linkError.message}` },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true })
}