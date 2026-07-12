import { emailLayout, detailRow, divider } from './layout'
import { format, parseISO } from 'date-fns'
import { formatDatePST, formatTimePST } from '@/lib/utils'

type ConfirmationData = {
  cancelUrl:        string
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
 const date  = formatDatePST(d.startTime, 'EEEE, MMMM d, yyyy')
const start = formatTimePST(d.startTime)
const end   = formatTimePST(d.endTime)

  const content = `
    <h1 style="margin:0 0 20px;font-size:22px;font-weight:500;color:#2C2C2A;">
      Your appointment is confirmed!
    </h1>

    <p style="margin:0 0 16px;font-size:15px;color:#2C2C2A;line-height:1.6;">
      Dear ${d.studentName.split(' ')[0]},
    </p>

    <p style="margin:0 0 16px;font-size:15px;color:#2C2C2A;line-height:1.6;">
      Thank you for signing up for an appointment with an Oakland Tech College Essay Mentor.
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

    <p style="margin:0 0 16px;font-size:13px;color:#854F0B;background:#FAEEDA;border-radius:8px;padding:10px 14px;line-height:1.6;">
      <strong>IMPORTANT:</strong> Please make sure you are signed into THIS GMAIL account in your browser before clicking the meeting link. If you are signed into a different Google account (or not signed in at all), you will not be let into the meeting.
    </p>

    ${divider()}

    <p style="margin:0 0 12px;font-size:15px;color:#2C2C2A;line-height:1.6;font-weight:500;">
      Before your appointment:
    </p>

   <p style="margin:0 0 12px;font-size:15px;color:#2C2C2A;line-height:1.6;">
      The day before your appointment, please share your college essay. If there are multiple essays in your document, please indicate which essay you plan to discuss during your meeting: 1 long essay or up to 3 PIQs.
    </p>

    <a href="${d.essayUploadUrl}" style="display:inline-block;background:#534AB7;color:#EEEDFE;text-decoration:none;font-size:14px;font-weight:500;padding:12px 28px;border-radius:8px;margin-bottom:20px;">
      Upload your essay →
    </a>

    ${divider()}

    <p style="margin:0 0 12px;font-size:15px;color:#2C2C2A;line-height:1.6;font-weight:500;">
      <p style="margin:0 0 8px;font-size:15px;font-weight:500;color:#2C2C2A;">
      Cancellation policy:
    </p>

    <p style="margin:0 0 16px;font-size:15px;color:#2C2C2A;line-height:1.6;">
    If you need to cancel, please do so at least 24 hours in advance by clicking the button below. <strong>Do not decline the Google Calendar invite</strong> — that will not cancel your appointment in our system.
    </p>

    <a href="${d.cancelUrl}" style="display:inline-block;background:#E24B4A;color:#ffffff;text-decoration:none;font-size:14px;font-weight:500;padding:10px 24px;border-radius:8px;margin-bottom:24px;">
      Cancel my appointment
    </a>

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