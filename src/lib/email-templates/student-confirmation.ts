import { emailLayout, detailRow, divider } from './layout'
import { format, parseISO } from 'date-fns'

type ConfirmationData = {
  studentName:      string
  mentorName:       string
  mentorDepartment: string
  startTime:        string
  endTime:          string
  meetingType:      string
  meetLink:         string | null
  confirmationCode: string
}

export function studentConfirmationEmail(d: ConfirmationData) {
  const date    = format(parseISO(d.startTime), 'EEEE, MMMM d, yyyy')
  const start   = format(parseISO(d.startTime), 'h:mm a')
  const end     = format(parseISO(d.endTime),   'h:mm a')
  const typeLabel =
    d.meetingType === 'in_person' ? 'In person' :
    d.meetingType === 'phone'     ? 'Phone call' :
    'Virtual (Google Meet)'

  const content = `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:500;color:#2C2C2A;">
      You're booked!
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:#5F5E5A;line-height:1.6;">
      Hi ${d.studentName}, your appointment with ${d.mentorName} is confirmed.
    </p>

    <div style="background:#f5f4f0;border-radius:8px;padding:20px 24px;margin-bottom:24px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        ${detailRow('Mentor',       d.mentorName)}
        ${detailRow('Date',         date)}
        ${detailRow('Time',         `${start} – ${end}`)}
        ${detailRow('Format',       typeLabel)}
        ${d.meetLink ? detailRow('Meeting link', `<a href="${d.meetLink}" style="color:#534AB7;">${d.meetLink}</a>`) : ''}
        ${detailRow('Confirmation', `<code style="font-size:13px;background:#EEEDFE;color:#3C3489;padding:2px 8px;border-radius:4px;">${d.confirmationCode}</code>`)}
      </table>
    </div>

    ${divider()}

    <p style="font-size:13px;color:#888780;line-height:1.6;margin:0;">
      You will receive a reminder text message 2 days before your appointment.
      To cancel or reschedule, contact your program coordinator with your confirmation code.
    </p>`

  return {
    subject: `Appointment confirmed with ${d.mentorName} — ${date}`,
    html:    emailLayout(content, `Your appointment with ${d.mentorName} on ${date} is confirmed.`),
  }
}