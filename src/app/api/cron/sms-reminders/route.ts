import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendSMS } from '@/lib/sms'
import { format, parseISO } from 'date-fns'
import { formatDatePST, formatTimePST } from '@/lib/utils'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.INTERNAL_API_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Find appointments 47-49 hours from now (gives us a 2-hour window to catch them)
  const now = new Date()
  const windowStart = new Date(now.getTime() + 47 * 3600_000)
  const windowEnd   = new Date(now.getTime() + 49 * 3600_000)

  const { data: bookings } = await supabase
    .from('student_bookings')
    .select(`
      id, student_name, student_phone, sms_consent,
      sms_confirm_sent, sms_confirmed_at,
      appointment_slots ( start_time, end_time )
    `)
    .is('cancelled_at', null)
    .eq('sms_consent', true)
    .eq('sms_confirm_sent', false)

  // Filter to the 47-49 hour window in code, since filtering on a joined table's
  // column directly in the query does not reliably work
  const inWindow = (bookings ?? []).filter((b: any) => {
    const slot = b.appointment_slots
    if (!slot?.start_time || !b.student_phone) return false
    const start = new Date(slot.start_time)
    return start >= windowStart && start <= windowEnd
  })

  let sent = 0

  for (const booking of inWindow) {
    const slot = (booking as any).appointment_slots
  const apptDate = formatDatePST(slot.start_time)
    const apptTime = formatTimePST(slot.start_time)

    try {
      await sendSMS({
        to:   booking.student_phone,
        body: `Hi, your appointment with your mentor from the OT College Mentor Program is in 2 days on ${apptDate} at ${apptTime}. Please press 1 to CONFIRM or 9 to CANCEL. Reply HELP for help or STOP to opt-out.`,
      })

      // Mark reminder as sent
      await supabase
        .from('student_bookings')
        .update({ sms_confirm_sent: true })
        .eq('id', booking.id)

      sent++
    } catch (err) {
      console.error('SMS reminder failed for booking:', booking.id, err)
    }
  }

  return NextResponse.json({ sent, checked: bookings?.length ?? 0 })
}