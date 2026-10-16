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

  const { bookingId } = await request.json()

  if (!bookingId) {
    return NextResponse.json({ error: 'Missing bookingId' }, { status: 400 })
  }

  const { data: booking } = await supabase
    .from('student_bookings')
    .select('id, cancelled_at, queue_id, appointment_slots ( meeting_type )')
    .eq('id', bookingId)
    .single()

  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

  const slot = (booking as any).appointment_slots
  if (slot?.meeting_type !== 'in_person') {
    return NextResponse.json({ error: 'This booking is not an in-person appointment' }, { status: 400 })
  }

  if (booking.cancelled_at) {
    return NextResponse.json({ error: 'Already cancelled' }, { status: 400 })
  }

  const { error: cancelError } = await supabase
    .from('student_bookings')
    .update({ cancelled_at: new Date().toISOString() })
    .eq('id', bookingId)

  if (cancelError) {
    return NextResponse.json({ error: cancelError.message }, { status: 500 })
  }

  // Keep the walk-in queue entry's status consistent, if one is linked
  // (e.g. correcting a student who was accidentally marked helped)
  if (booking.queue_id) {
    await supabase
      .from('walkin_queue')
      .update({ status: 'walked_out' })
      .eq('id', booking.queue_id)
  }

  return NextResponse.json({ ok: true })
}
