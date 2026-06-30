import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendSMS } from '@/lib/sms'
import { format, parseISO } from 'date-fns'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const from     = formData.get('From') as string  // Student's phone number
  const body     = (formData.get('Body') as string)?.trim()

  if (!from || !body) {
    return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      headers: { 'Content-Type': 'text/xml' }
    })
  }

  // Find their most recent upcoming booking
  const { data: bookings } = await supabase
    .from('student_bookings')
    .select(`
      id, student_name, student_phone,
      appointment_slots ( start_time )
    `)
    .is('cancelled_at', null)
    .ilike('student_phone', `%${from.replace('+1', '').replace(/\D/g, '')}%`)
    .order('appointment_slots(start_time)', { ascending: true })

  const upcoming = (bookings ?? []).find((b: any) => {
    const start = b.appointment_slots?.start_time
    return start && new Date(start) > new Date()
  })

  if (!upcoming) {
    // No upcoming booking found — send helpful reply
    await sendSMS({
      to:   from,
      body: `We couldn't find an upcoming appointment for this number. Visit otessaymentors.org to book one!`,
    })
    return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      headers: { 'Content-Type': 'text/xml' }
    })
  }

  const apptDate = format(parseISO(slot.start_time), 'EEEE, MMMM d')
  const apptTime = format(parseISO(slot.start_time), 'h:mm a')

  if (body === '1') {
    // Confirm
    await supabase
      .from('student_bookings')
      .update({ sms_confirmed_at: new Date().toISOString() })
      .eq('id', upcoming.id)

    await sendSMS({
      to:   from,
      body: `Your appointment with your mentor from the OT College Mentor Program has been confirmed. Reply HELP for help or STOP to opt-out.`,
    })

  } else if (body === '9') {
    // Cancel
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/bookings/${upcoming.id}/cancel`, {
      method: 'POST',
    })

    await sendSMS({
      to:   from,
      body: `Your appointment with your mentor from the OT College Mentor Program has been canceled. Reply HELP for help or STOP to opt-out.`,
    })

  } else {
    // Unrecognized reply
    await sendSMS({
      to:   from,
      body: `Reply 1 to confirm or 9 to cancel your appointment on ${apptDate} at ${apptTime}.`,
    })
  }

  return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
    headers: { 'Content-Type': 'text/xml' }
  })
}