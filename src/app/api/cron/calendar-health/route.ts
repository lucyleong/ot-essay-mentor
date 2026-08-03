import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
 const authHeader = request.headers.get('authorization')
  console.log('Auth header received:', authHeader)
  console.log('Expected:', `Bearer ${process.env.CRON_SECRET}`)
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Check if we have a valid token by fetching it from the database
    const { data: tokenData } = await supabase
      .from('google_calendar_tokens')
      .select('access_token, expires_at, refresh_token')
      .single()

    if (!tokenData?.refresh_token) {
      throw new Error('No refresh token found')
    }

    // Try to refresh the token
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id:     process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: tokenData.refresh_token,
        grant_type:    'refresh_token',
      }),
    })

    const data = await response.json()

    if (!response.ok || data.error) {
      throw new Error(data.error ?? 'Token refresh failed')
    }

    return NextResponse.json({ ok: true, status: 'connected' })
  } catch (err: any) {
    // Token is expired or invalid — send alert email
    await sendEmail({
      to: 'admin@otessaymentors.org',
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

    return NextResponse.json({ ok: false, status: 'disconnected', error: err.message })
  }
}