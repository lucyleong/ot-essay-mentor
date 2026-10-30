import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/admin-auth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const { bookingId, mentorId } = await request.json()

  if (!bookingId) {
    return NextResponse.json({ error: 'Missing bookingId' }, { status: 400 })
  }

  const { data: booking } = await supabase
    .from('student_bookings')
    .select('id, booked_at, cancelled_at, queue_id, meeting_type, appointment_slots ( id, meeting_type )')
    .eq('id', bookingId)
    .single()

  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

  if (booking.meeting_type !== 'in_person') {
    return NextResponse.json({ error: 'This booking is not an in-person appointment' }, { status: 400 })
  }

  if (!booking.cancelled_at) {
    return NextResponse.json({ error: 'This booking is not cancelled' }, { status: 400 })
  }

  const existingSlot = (booking as any).appointment_slots

  if (existingSlot) {
    // Was helped before being cancelled — the original slot/mentor were
    // never touched, so just clear the cancellation.
    const { error: restoreError } = await supabase
      .from('student_bookings')
      .update({ cancelled_at: null })
      .eq('id', bookingId)

    if (restoreError) {
      return NextResponse.json({ error: restoreError.message }, { status: 500 })
    }
  } else {
    // Never had a mentor assigned (e.g. walked out straight from waiting) —
    // need one picked now, and a slot created, same as a normal "helped".
    if (!mentorId) {
      return NextResponse.json({ error: 'This student was never assigned a mentor — pick one to restore as helped' }, { status: 400 })
    }

    const { data: newSlot, error: slotInsertError } = await supabase
      .from('appointment_slots')
      .insert({
        mentor_id:    mentorId,
        start_time:   booking.booked_at,
        end_time:     new Date(new Date(booking.booked_at).getTime() + 20 * 60000).toISOString(),
        meeting_type: 'in_person',
        is_booked:    true,
        is_cancelled: false,
      })
      .select()
      .single()

    if (slotInsertError || !newSlot) {
      return NextResponse.json(
        { error: `Failed to create a slot: ${slotInsertError?.message ?? 'unknown error'}` },
        { status: 500 }
      )
    }

    const { error: linkError } = await supabase
      .from('student_bookings')
      .update({ slot_id: newSlot.id, cancelled_at: null })
      .eq('id', bookingId)

    if (linkError) {
      return NextResponse.json({ error: linkError.message }, { status: 500 })
    }
  }

  // Keep the walk-in queue entry's status (and mentor attribution, if newly
  // assigned) consistent, if one is linked
  if (booking.queue_id) {
    await supabase
      .from('walkin_queue')
      .update(
        existingSlot
          ? { status: 'helped' }
          : { status: 'helped', helped_by_mentor_id: mentorId, helped_at: booking.booked_at }
      )
      .eq('id', booking.queue_id)
  }

  return NextResponse.json({ ok: true })
}
