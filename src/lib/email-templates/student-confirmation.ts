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
  essayUploadUrl:   string
}

export function studentConfirmationEmail(d: ConfirmationData) {
  const toLA = (iso: string) => new Date(iso).toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })
const date  = format(new Date(toLA(d.startTime)), 'EEEE, MMMM d, yyyy')
const start = format(new Date(toLA(d.startTime)), 'h:mm a')
const end   = format(new Date(toLA(d.endTime)),   'h:mm a')

  const content = `
    <h1 style="margin:0 0 20px;font-size:22px;font-weight:500;color:#2C2C2A;">
      Your appointment is confirmed!
    </h1>

    <p style="margin:0 0 16px;font-size:15px;color:#2C2C2A;line-height:1.6;">
      Dear ${d.studentName.split(' ')[0]},
    </p>

    <p style="margin:0 0 16px;font-size:15px;color:#2C2C2A;line-height:1.6;">
      Thank you for signing up for an appointment with an OT College Essay Mentor.
      Here are your appointment details:
    </p>

    <div style="background:#f5f4f0;border-radius:8px;padding:20px 24px;margin-bottom:24px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        ${detailRow('Date',    date)}
        ${detailRow('Time',    `${start} – ${end}`)}
        ${detailRow('Mentor',  d.mentorName)}
        ${d.meetLink
          ? detailRow('Meeting link', `<a href="${d.meetLink}" style="color:#534AB7;">${d.meetLink}</a>`)
          : detailRow('Meeting link', 'A Google Meet link will be added to your calendar invitation once your appointment is confirmed.')}
      </table>
    </div>

    ${divider()}

    <p style="margin:0 0 12px;font-size:15px;color:#2C2C2A;line-height:1.6;font-weight:500;">
      Before your appointment:
    </p>

    <p style="margin:0 0 16px;font-size:15px;color:#2C2C2A;line-height:1.6;">
      The day before your appointment, please share your college essay via a Google Docs link or by uploading the document
      <a href="${d.essayUploadUrl}" style="color:#534AB7;font-weight:500;">here</a>.
      If there are multiple essays in your document, please indicate which essay you
      plan to discuss during your meeting: 1 long essay or up to 3 PIQs.
    </p>

    ${divider()}

    <p style="margin:0 0 12px;font-size:15px;color:#2C2C2A;line-height:1.6;font-weight:500;">
      Cancellation policy:
    </p>

    <p style="margin:0 0 16px;font-size:15px;color:#2C2C2A;line-height:1.6;">
      If for any reason you must cancel your appointment, please go to your
      Google Calendar invitation and change your availability from "Yes" to "No". Your 
      cancellation must be made <strong>AT LEAST 24 HOURS</strong> in advance.
    </p>

    ${divider()}

    <p style="margin:0 0 4px;font-size:15px;color:#2C2C2A;line-height:1.6;">
      Thank you! We look forward to working with you!
    </p>

    <p style="margin:0;font-size:15px;color:#2C2C2A;line-height:1.6;">
      — The College Essay Mentors
    </p>`

  return {
    subject: `Appointment confirmed with ${d.mentorName} — ${date}`,
    html:    emailLayout(content, `Your appointment with ${d.mentorName} on ${date} is confirmed.`),
  }
}