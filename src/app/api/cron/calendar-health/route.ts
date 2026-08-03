import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getFreshAccessToken } from '@/lib/calendar'
import { sendEmail } from '@/lib/email'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await getFreshAccessToken()
    return NextResponse.json({ ok: true, status: 'connected' })
  } catch {
    // Token is expired or invalid — send alert email
    await sendEmail({
      to: process.env.ADMIN_EMAIL ?? 'admin@otessaymentors.org',
      subject: '⚠️ Google Calendar disconnected — action needed',
      html: `
        <p>Hi Lucy,</p>
        <p>The Google Calendar connection for the Oakland Tech College Essay Mentor Program has expired.</p>
        <p><strong>Action needed:</strong> Please reconnect Google Calendar in the admin panel before mentors create new appointment slots.</p>
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/admin?panel=calendar">Click here to reconnect →</a></p>
        <p>This check runs every morning at 7am.</p>
      `,
      notificationType: 'calendar_health_check',
      recipientType: 'mentor',
    })

    return NextResponse.json({ ok: false, status: 'disconnected' })
  }
}