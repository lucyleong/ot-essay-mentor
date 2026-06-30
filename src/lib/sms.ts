import twilio from 'twilio'

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
)

export async function sendSMS({
  to,
  body,
}: {
  to: string
  body: string
}) {
  const phone = to.replace(/\D/g, '')
  const formatted = phone.startsWith('1') ? `+${phone}` : `+1${phone}`

  return client.messages.create({
    to:                    formatted,
    messagingServiceSid:   process.env.TWILIO_MESSAGING_SERVICE_SID!,
    body,
  })
}