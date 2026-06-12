import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

const resend = new Resend(process.env.RESEND_API_KEY)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type SendEmailOptions = {
  to: string
  subject: string
  html: string
  bookingId?: string
  notificationType: string
  recipientType: 'student' | 'mentor'
}

export async function sendEmail(opts: SendEmailOptions) {
  const { data, error } = await resend.emails.send({
    from: `${process.env.RESEND_FROM_NAME} <${process.env.RESEND_FROM_EMAIL}>`,
    to:   opts.to,
    subject: opts.subject,
    html: opts.html,
  })

  await supabase.from('notifications_log').insert({
    booking_id:        opts.bookingId ?? null,
    notification_type: opts.notificationType,
    channel:           'email',
    recipient_email:   opts.to,
    status:            error ? 'failed' : 'sent',
    resend_message_id: data?.id ?? null,
    sent_at:           new Date().toISOString(),
  })

  if (error) throw new Error(`Email error: ${error.message}`)
  return data
}