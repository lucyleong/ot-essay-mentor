import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { addDays, addWeeks, addMonths } from 'date-fns'
import { sendEmail } from '@/lib/email'
import { formatDatePST } from '@/lib/utils'

function toLA(dateStr: string, timeStr: string): Date {
  // Calculate DST boundaries for the year
  const [y, m, d] = dateStr.split('-').map(Number)
  const year = y
  
  // DST starts: second Sunday in March
  const dstStart = new Date(Date.UTC(year, 2, 1))
  dstStart.setUTCDate(1 + (7 - dstStart.getUTCDay()) % 7 + 7)
  
  // DST ends: first Sunday in November
  const dstEnd = new Date(Date.UTC(year, 10, 1))
  dstEnd.setUTCDate(1 + (7 - dstEnd.getUTCDay()) % 7)
  
  const date = new Date(Date.UTC(y, m - 1, d))
  const isPDT = date >= dstStart && date < dstEnd
  const offsetHours = isPDT ? 7 : 8
  
  const [hour, minute] = timeStr.split(':').map(Number)
  return new Date(Date.UTC(y, m - 1, d, hour + offsetHours, minute))
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  const body = await request.json()
  console.log('Received slotTimes:', JSON.stringify(body.slotTimes?.slice(0,2)))
console.log('recurrenceRule:', body.recurrenceRule)
console.log('recurrenceUntil:', body.recurrenceUntil)

  if (!body.mentorId) {
    return NextResponse.json({ error: 'Missing mentorId' }, { status: 400 })
  }

  // Build base slots from time window
  let baseDaySlots: { start_time: string; end_time: string }[] = []

  if (body.slotTimes && Array.isArray(body.slotTimes)) {
    baseDaySlots = body.slotTimes.map((t: any) => ({
      start_time: t.startTime,
      end_time:   t.endTime,
    }))
  } else {
    baseDaySlots = [{ start_time: body.startTime, end_time: body.endTime }]
  }

  // Expand for recurrence
  const slotsToInsert: any[] = []
// Fetch program end date
  const { data: endDateSetting } = await supabase
    .from('program_settings')
    .select('value')
    .eq('key', 'program_end_date')
    .single()

  const programEndDate = endDateSetting?.value
  const programEndDateObj = programEndDate ? new Date(programEndDate + 'T23:59:59-08:00') : null
const untilDate = body.recurrenceUntil ? toLA(body.recurrenceUntil, '23:59') : programEndDateObj  
for (const baseSlot of baseDaySlots) {
    let current = {
      start: new Date(baseSlot.start_time),
      end:   new Date(baseSlot.end_time),
    }

    // Extract the wall clock time ONCE from the base slot
    const laFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
      hour12: false
    })

    const getPart = (parts: Intl.DateTimeFormatPart[], type: string) => 
      parts.find(p => p.type === type)?.value ?? '00'

    const baseParts = laFormatter.formatToParts(current.start)
    const wallClockStart = `${getPart(baseParts, 'hour')}:${getPart(baseParts, 'minute')}`
    const baseEndParts = laFormatter.formatToParts(current.end)
    const wallClockEnd = `${getPart(baseEndParts, 'hour')}:${getPart(baseEndParts, 'minute')}`
    const baseDateStr = `${getPart(baseParts, 'year')}-${getPart(baseParts, 'month')}-${getPart(baseParts, 'day')}`

    let count = 0
    while (count < 52) {
      if (untilDate && current.start > untilDate) break

      slotsToInsert.push({
        mentor_id:        body.mentorId,
        start_time:       current.start.toISOString(),
        end_time:         current.end.toISOString(),
        duration_minutes: body.durationMinutes ?? 20,
        meeting_type:     body.meetingType ?? 'virtual',
        recurrence_rule:  body.recurrenceRule ?? null,
      })

      if (!body.recurrenceRule) break

      const daysToAdd = body.recurrenceRule === 'daily' ? 1 : body.recurrenceRule === 'weekly' ? 7 : 14

      // Add days to the base date, keeping wall clock time constant
      const currentDateParts = laFormatter.formatToParts(current.start)
      const currentDateStr = `${getPart(currentDateParts, 'year')}-${getPart(currentDateParts, 'month')}-${getPart(currentDateParts, 'day')}`
      const currentDate = new Date(currentDateStr + 'T12:00:00')
      const nextDate = addDays(currentDate, daysToAdd)
      const nextDateStr = nextDate.toISOString().split('T')[0]

      // Always use the ORIGINAL wall clock time
      current = {
        start: toLA(nextDateStr, wallClockStart),
        end: toLA(nextDateStr, wallClockEnd)
      }
      console.log(`Admin slot: ${nextDateStr} ${wallClockStart} → ${current.start.toISOString()}`)

      count++
    }
  }

  const { data: inserted, error } = await supabase
    .from('appointment_slots')
    .insert(slotsToInsert)
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify the mentor that availability was added on their behalf
  try {
    const { data: mentor } = await supabase
      .from('mentor_profiles')
      .select('full_name, email')
      .eq('id', body.mentorId)
      .single()

    if (mentor?.email) {
    const firstDate = inserted?.[0]?.start_time ? formatDatePST(inserted[0].start_time) : 'an upcoming date'

      await sendEmail({
        to:               mentor.email,
        subject:          `New availability added to your mentor dashboard`,
        html:             `
          <p>Hi ${mentor.full_name.split(' ')[0]},</p>
          <p>We've added ${inserted?.length ?? 0} appointment slot${(inserted?.length ?? 0) !== 1 ? 's' : ''} to your mentor schedule, starting ${firstDate}.</p>
          <p>You can view your full schedule by logging into your mentor dashboard at <a href="${process.env.NEXT_PUBLIC_APP_URL}/mentor/dashboard">otessaymentors.org/mentor/dashboard</a>.</p>
          <p>If you haven't logged in before, use the "Forgot password" link on the login page to set up your account.</p>
        `,
        notificationType: 'admin_created_schedule',
        recipientType:    'mentor',
      })
    }
  } catch (emailErr) {
  }

  return NextResponse.json({ slotsCreated: inserted?.length ?? 0 })
}