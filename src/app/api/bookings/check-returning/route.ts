import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email')
  if (!email) return NextResponse.json({ error: 'Missing email' }, { status: 400 })

  const { data: previousBooking } = await supabase
    .from('student_bookings')
    .select('id, student_name, student_phone')
    .eq('student_email', email.toLowerCase().trim())
    .is('cancelled_at', null)
    .order('booked_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!previousBooking) {
    return NextResponse.json({ isReturning: false })
  }

  const nameParts = previousBooking.student_name.split(' ')
  return NextResponse.json({
    isReturning: true,
    firstName:   nameParts[0] ?? '',
    lastName:    nameParts.slice(1).join(' ') ?? '',
    phone:       previousBooking.student_phone ?? '',
  })
}