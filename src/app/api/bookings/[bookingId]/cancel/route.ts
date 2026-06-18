import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ bookingId: string }> }
) {
  const { bookingId } = await context.params

  // Get the booking to find the slot
  const { data: booking } = await supabase
    .from('student_bookings')
    .select('id, slot_id, cancelled_at')
    .eq('id', bookingId)
    .single()

  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  if (booking.cancelled_at) {
    return NextResponse.json({ error: 'Booking already cancelled' }, { status: 400 })
  }

  // Cancel the booking
  await supabase
    .from('student_bookings')
    .update({ cancelled_at: new Date().toISOString() })
    .eq('id', bookingId)

  // Free up the slot
  await supabase
    .from('appointment_slots')
    .update({ is_booked: false })
    .eq('id', booking.slot_id)

  return NextResponse.json({ ok: true })
}