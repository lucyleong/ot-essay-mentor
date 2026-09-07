import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendSMS } from '@/lib/sms'
import { sendEmail } from '@/lib/email'
import { format, parseISO } from 'date-fns'
import { formatDatePST, formatTimePST } from '@/lib/utils'
import twilio from 'twilio'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const emptyTwiml = () => new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
  headers: { 'Content-Type': 'text/xml' }
})

// A non-2xx response tells Twilio to automatically retry the webhook a few
// times over the next several minutes — use this for failures that might be
// transient (a database hiccup), so they can self-heal without anyone
// needing to notice. Also emails the admin immediately, in case it doesn't.
async function failAndAlert(context: Record<string, unknown>) {
  console.error('Twilio webhook: failure', context)
  try {
    await sendEmail({
      to:               process.env.PROGRAM_ACCOUNT_EMAIL!,
      subject:          `Twilio SMS reply failed to process`,
      html:             `
        <p>A student's text reply failed to process and may not have been recorded.</p>
        <pre style="white-space: pre-wrap; font-size: 13px;">${JSON.stringify(context, null, 2)}</pre>
        <p>Twilio will automatically retry this a few times — if it's a one-off issue it may resolve itself. Worth checking the student's booking directly if you don't hear back that it worked.</p>
      `,
      notificationType: 'twilio_webhook_failure',
      recipientType:    'mentor',
    })
  } catch (emailErr) {
    console.error('Twilio webhook: failed to send failure alert email', emailErr)
  }
  return new NextResponse('Internal error', { status: 500 })
}

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  // Validate Twilio signature
  const twilioSignature = request.headers.get('X-Twilio-Signature') ?? ''
  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio`
  const params: Record<string, string> = {}
  formData.forEach((value, key) => { params[key] = value.toString() })

  const isValid = twilio.validateRequest(
    process.env.TWILIO_AUTH_TOKEN!,
    twilioSignature,
    webhookUrl,
    params
  )

  if (!isValid) {
    console.error('Twilio webhook: signature validation failed', { webhookUrl, from: params.From, body: params.Body })
    // Already a non-2xx status, so Twilio will retry this on its own.
    return new NextResponse('Forbidden', { status: 403 })
  }

  const from = formData.get('From') as string  // Student's phone number
  const body = (formData.get('Body') as string)?.trim()

  if (!from || !body) {
    return emptyTwiml()
  }

  try {
    // Find their most recent upcoming booking
    const cleanedFrom = from.replace(/\D/g, '').replace(/^1/, '')

    const { data: allBookings, error: bookingsError } = await supabase
      .from('student_bookings')
      .select(`
        id, student_name, student_phone,
        appointment_slots ( start_time, mentor_profiles ( full_name, email ) )
      `)
      .is('cancelled_at', null)

    if (bookingsError) {
      return failAndAlert({ step: 'load bookings', from, body, error: bookingsError.message })
    }

    const bookings = (allBookings ?? []).filter((b: any) => {
      if (!b.student_phone) return false
      const cleanedStored = b.student_phone.replace(/\D/g, '').replace(/^1/, '')
      return cleanedStored === cleanedFrom
    })

    const upcoming = (bookings ?? []).find((b: any) => {
      const start = b.appointment_slots?.start_time
      return start && new Date(start) > new Date()
    })

    if (!upcoming) {
      // No upcoming booking found — most likely a wrong number or an
      // already-past appointment, not an app failure, so no retry/alert.
      console.error('Twilio webhook: no upcoming booking matched for reply', { from, cleanedFrom, body, candidateCount: bookings.length })
      await sendSMS({
        to:   from,
        body: `We couldn't find an upcoming appointment for this number. Visit otessaymentors.org to book one!`,
      })
      return emptyTwiml()
    }

    const slot     = Array.isArray(upcoming.appointment_slots) ? upcoming.appointment_slots[0] : upcoming.appointment_slots
    const apptDate = formatDatePST(slot.start_time)
    const apptTime = formatTimePST(slot.start_time)

    if (body === '1') {
      // Confirm
      const { error: confirmError } = await supabase
        .from('student_bookings')
        .update({ sms_confirmed_at: new Date().toISOString() })
        .eq('id', upcoming.id)

      if (confirmError) {
        return failAndAlert({ step: 'record confirmation', bookingId: upcoming.id, from, error: confirmError.message })
      }

      await sendSMS({
        to:   from,
        body: `Your appointment with the Oakland Tech College Mentor Program has been confirmed. Reply HELP for help or STOP to opt-out.`,
      })

    } else if (body === '9') {
      // Cancel
      const cancelRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/bookings/${upcoming.id}/cancel`, {
        method: 'POST',
      })

      if (!cancelRes.ok) {
        const errBody = await cancelRes.json().catch(() => ({} as any))
        const alreadyCancelled = cancelRes.status === 400 && /already canceled/i.test(errBody?.error ?? '')

        if (!alreadyCancelled) {
          return failAndAlert({ step: 'cancel booking', bookingId: upcoming.id, from, status: cancelRes.status, error: errBody?.error })
        }
        // Already cancelled from an earlier (possibly retried) attempt — treat as success below.
      }

      await sendSMS({
        to:   from,
        body: `Your appointment with the Oakland Tech College Mentor Program has been canceled. Reply HELP for help or STOP to opt-out.`,
      })

    } else {
      // Unrecognized reply — not a failure, just an unexpected message.
      await sendSMS({
        to:   from,
        body: `Reply 1 to confirm or 9 to cancel your Oakland Tech College Mentor Programappointment on ${apptDate} at ${apptTime}.`,
      })
    }

    return emptyTwiml()
  } catch (err) {
    return failAndAlert({ step: 'unhandled', from, body, error: err instanceof Error ? err.message : err })
  }
}
