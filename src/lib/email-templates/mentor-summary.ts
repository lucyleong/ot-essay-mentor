import { emailLayout, detailRow, divider } from './layout'
import { format } from 'date-fns'
import { formatDatePST, formatTimePST } from '@/lib/utils'

type Appointment = {
  studentName:  string
  studentPhone: string | null
  startTime:    string
  endTime:      string
  meetLink:     string | null
  hasEssay:     boolean
  smsStatus:    'confirmed' | 'no_reply' | 'no_sms'
}

type SummaryData = {
  mentorName:   string
  appointments: Appointment[]
  dashboardUrl: string
  issuesUrl:    string
}
export function mentorMorningSummaryEmail(d: SummaryData) {
  const today        = format(new Date(), 'EEEE, MMMM d, yyyy')
  const count        = d.appointments.length
  const confirmed    = d.appointments.filter(a => a.smsStatus === 'confirmed').length
  const noReply      = d.appointments.filter(a => a.smsStatus === 'no_reply').length
  const noSms        = d.appointments.filter(a => a.smsStatus === 'no_sms').length

  const statusBar = `
    <div style="display:flex;gap:8px;margin-bottom:24px;flex-wrap:wrap;">
      <div style="background:#E1F5EE;border-radius:8px;padding:10px 16px;flex:1;min-width:80px;text-align:center;">
        <div style="font-size:22px;font-weight:500;color:#085041;">${confirmed}</div>
        <div style="font-size:12px;color:#0F6E56;margin-top:2px;">Confirmed</div>
      </div>
      <div style="background:#FAEEDA;border-radius:8px;padding:10px 16px;flex:1;min-width:80px;text-align:center;">
        <div style="font-size:22px;font-weight:500;color:#633806;">${noReply}</div>
        <div style="font-size:12px;color:#854F0B;margin-top:2px;">No reply</div>
      </div>
      <div style="background:#F1EFE8;border-radius:8px;padding:10px 16px;flex:1;min-width:80px;text-align:center;">
        <div style="font-size:22px;font-weight:500;color:#5F5E5A;">${noSms}</div>
        <div style="font-size:12px;color:#5F5E5A;margin-top:2px;">No SMS sent</div>
      </div>
      <div style="background:#EEEDFE;border-radius:8px;padding:10px 16px;flex:1;min-width:80px;text-align:center;">
        <div style="font-size:22px;font-weight:500;color:#3C3489;">${count}</div>
        <div style="font-size:12px;color:#534AB7;margin-top:2px;">Total today</div>
      </div>
    </div>`

  const apptCards = d.appointments.map(a => {
   const start = formatTimePST(a.startTime)
    const end   = formatTimePST(a.endTime)

    const statusColor =
      a.smsStatus === 'confirmed' ? '#085041' :
      a.smsStatus === 'no_reply'  ? '#854F0B' : '#5F5E5A'

   const statusLabel =
      a.smsStatus === 'confirmed' ? 'Confirmed' :
      a.smsStatus === 'no_reply'  ? 'No reply' : 'No consent'

    const statusBg =
      a.smsStatus === 'confirmed' ? '#E1F5EE' :
      a.smsStatus === 'no_reply'  ? '#FAEEDA' : '#F1EFE8'

    return `
      <div style="border:0.5px solid #e8e6de;border-radius:10px;padding:16px 20px;margin-bottom:12px;">
       <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
          <div>
            <p style="font-size:16px;font-weight:500;margin:0 0 2px;color:#2C2C2A;">${start} – ${end}</p>
            <p style="font-size:14px;margin:0;color:#2C2C2A;">${a.studentName}</p>
          </div>
          <div style="display:flex;gap:6px;align-items:center;">
            ${a.hasEssay ? `
            <span style="font-size:11px;padding:2px 10px;border-radius:20px;background:#EEEDFE;color:#3C3489;font-weight:500;">
              Essay shared
            </span>` : ''}
            <span style="font-size:11px;padding:2px 10px;border-radius:20px;background:${statusBg};color:${statusColor};font-weight:500;">
              ${statusLabel}
            </span>
          </div>
        </div>
        <table width="100%" cellpadding="0" cellspacing="0">
          ${a.studentPhone ? detailRow('Phone', a.studentPhone) : detailRow('Phone', 'Not provided')}
          ${a.meetLink
            ? detailRow('Meet link', `<a href="${a.meetLink}" style="color:#534AB7;">${a.meetLink}</a>`)
            : detailRow('Meet link', 'No link available')}
        </table>
      </div>`
  }).join('')

  const subject = noReply > 0
    ? `Today's appointments — ${confirmed} confirmed, ${noReply} no reply (${today})`
    : `Today's appointments — ${count} total (${today})`

  const content = `
    <h1 style="margin:0 0 4px;font-size:22px;font-weight:500;color:#2C2C2A;">
      Good morning, ${d.mentorName.split(' ')[0]}!
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:#5F5E5A;">
      Here are your appointments for today, ${today}.
    </p>

    ${statusBar}
    ${apptCards}

    ${divider()}

   <a href="${d.dashboardUrl}" style="display:inline-block;background:#534AB7;color:#EEEDFE;text-decoration:none;font-size:14px;font-weight:500;padding:12px 24px;border-radius:8px;margin-right:10px;">
      Open mentor dashboard
    </a>

    <p style="font-size:12px;color:#888780;margin:16px 0 0;line-height:1.6;">
      This summary was sent at 5:00 AM. Student confirmation statuses reflect replies received as of that time.
    </p>`

  return { subject, html: emailLayout(content, subject) }
}