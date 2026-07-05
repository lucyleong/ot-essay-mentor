import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ bookingId: string }> }
) {
  const { bookingId } = await context.params

  const { data } = await supabase
    .from('student_bookings')
    .select(`
      appointment_slots (
        mentor_profiles ( full_name, email )
      )
    `)
    .eq('id', bookingId)
    .single()

  const mentor = (data as any)?.appointment_slots?.mentor_profiles

  return NextResponse.json({
    mentorName:  mentor?.full_name ?? null,
    mentorEmail: mentor?.email ?? null,
  })
}