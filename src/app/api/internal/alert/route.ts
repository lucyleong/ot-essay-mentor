import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.INTERNAL_API_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()

  try {
    await sendEmail({
      to:               'otessaymentors@gmail.com',
      subject:          body.subject ?? 'System Alert',
      html:             `<p>${body.message}</p>`,
      notificationType: 'system_alert',
      recipientType:    'mentor',
    })
  } catch (err) {
    console.error('Alert email failed:', err)
  }

  return NextResponse.json({ ok: true })
}