import { emailLayout, divider } from './layout'
import { format } from 'date-fns'

type SurveyEmailData = {
  recipientName: string
  otherPartyName: string
  startTime: string
  surveyUrl: string
  recipientType: 'student' | 'mentor'
}

export function surveyEmail(d: SurveyEmailData) {
  const date = format(
    new Date(new Date(d.startTime).toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })),
    'EEEE, MMMM d'
  )
  const time = format(
    new Date(new Date(d.startTime).toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })),
    'h:mm a'
  )

  const isStudent = d.recipientType === 'student'

  const content = `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:500;color:#2C2C2A;">
      ${isStudent ? 'How did your session go?' : 'Session report'}
    </h1>

    <p style="margin:0 0 20px;font-size:15px;color:#5F5E5A;line-height:1.6;">
      Hi ${d.recipientName},
      ${isStudent
        ? ` thanks for meeting with ${d.otherPartyName} on ${date} at ${time}.`
        : ` please fill out this report if ${d.otherPartyName} was a no-show or had issues connecting on Google Meet on ${date} at ${time}.`
      }
    </p>

    ${divider()}

    <p style="margin:0 0 20px;font-size:15px;color:#2C2C2A;line-height:1.6;">
      ${isStudent
        ? 'Your feedback helps us improve the program. It only takes 30 seconds!'
        : 'This report helps us track technical issues and attendance.'
      }
    </p>

   <a href="${d.surveyUrl}" style="display:inline-block;background:#534AB7;color:#EEEDFE;text-decoration:none;font-size:14px;font-weight:500;padding:12px 28px;border-radius:8px;">
      ${isStudent ? 'Give feedback →' : 'Fill out report →'}
    </a>

    ${isStudent ? `
    <p style="margin:20px 0 0;font-size:12px;color:#888780;">
      This survey will close in 7 days.
    </p>

    ${divider()}

    <p style="margin:0 0 12px;font-size:14px;color:#2C2C2A;line-height:1.6;">
      Need more help with your essay? You can book another appointment anytime.
    </p>

   <a href="${process.env.NEXT_PUBLIC_APP_URL}/verify" style="display:inline-block;background:#534AB7;color:#EEEDFE;text-decoration:none;font-size:14px;font-weight:500;padding:10px 24px;border-radius:8px;">
      Book another appointment →
    </a>
    ` : `
    <p style="margin:20px 0 0;font-size:12px;color:#888780;">
      This survey will close in 7 days.
    </p>
    `}`

  const subject = isStudent
    ? `How did your session with ${d.otherPartyName} go? (30 seconds)`
    : `Session report: ${d.otherPartyName} on ${date}`

  return { subject, html: emailLayout(content, subject) }
}