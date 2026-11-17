import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/admin-auth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Corrects which mentor an in-person (walk-in) student saw, for a booking
// that's already marked helped. Unlike /transfer (which moves a future
// virtual appointment to a new mentor and emails everyone), this just fixes
// the record of something that already happened — no slot creation, no
// calendar changes, no emails.
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const { bookingId, newMentorId } = await request.json()

  if (!bookingId || !newMentorId) {
    return NextResponse.json({ error: 'Missing bookingId or newMentorId' }, { status: 400 })
  }

  const { data: booking } = await supabase
    .from('student_bookings')
    .select('id, meeting_type, cancelled_at, slot_id, queue_id')
    .eq('id', bookingId)
    .single()

  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

  if (booking.meeting_type !== 'in_person') {
    return NextResponse.json({ error: 'This booking is not an in-person appointment' }, { status: 400 })
  }

  if (booking.cancelled_at || !booking.slot_id) {
    return NextResponse.json({ error: 'This booking has no mentor on record to change' }, { status: 400 })
  }

  const { error: slotError } = await supabase
    .from('appointment_slots')
    .update({ mentor_id: newMentorId })
    .eq('id', booking.slot_id)

  if (slotError) {
    return NextResponse.json({ error: slotError.message }, { status: 500 })
  }

  if (booking.queue_id) {
    await supabase
      .from('walkin_queue')
      .update({ helped_by_mentor_id: newMentorId })
      .eq('id', booking.queue_id)
  }

  return NextResponse.json({ ok: true })
}
