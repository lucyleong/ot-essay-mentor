import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ bookingId: string }> }
) {
  const supabase = await createServerSupabaseClient()
  const { bookingId } = await context.params

  const { data: booking } = await supabase
    .from('student_bookings')
    .select(`
      id, student_name, student_email,
      appointment_slots (
        start_time, end_time, meeting_type,
        mentor_profiles ( full_name )
      )
    `)
    .eq('id', bookingId)
    .single()

  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  const slot   = booking.appointment_slots as any
  const mentor = slot?.mentor_profiles

  return NextResponse.json({
    student_name: booking.student_name,
    student_email: booking.student_email,
    mentor_name:  mentor?.full_name ?? 'Mentor',
    start_time:   slot?.start_time,
    end_time:     slot?.end_time,
    meeting_type: slot?.meeting_type,
  })
}