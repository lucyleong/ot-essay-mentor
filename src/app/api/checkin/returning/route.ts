import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email')
  if (!email) return NextResponse.json({ isReturning: false })

  const { data: bookings } = await supabase
    .from('student_bookings')
    .select('student_name')
    .eq('student_email', email.toLowerCase().trim())
    .is('cancelled_at', null)
    .limit(1)

  if (bookings && bookings.length > 0) {
    return NextResponse.json({ isReturning: true, name: bookings[0].student_name })
  }

  return NextResponse.json({ isReturning: false })
}