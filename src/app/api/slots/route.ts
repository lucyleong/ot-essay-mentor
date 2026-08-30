import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { addDays, addWeeks } from 'date-fns'

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

// Debug test
export async function GET() {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: mentor } = await supabase
    .from('mentor_profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!mentor) return NextResponse.json({ error: 'Not a mentor' }, { status: 403 })

  const { data: slots } = await supabase
    .from('appointment_slots')
    .select('*')
    .eq('mentor_id', mentor.id)
    .eq('is_cancelled', false)
    .gte('start_time', new Date().toISOString())
    .order('start_time', { ascending: true })

  return NextResponse.json(slots ?? [])
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: mentor } = await supabase
    .from('mentor_profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!mentor) return NextResponse.json({ error: 'Not a mentor' }, { status: 403 })

  // Check program end date
  const { data: endDateSetting } = await supabase
    .from('program_settings')
    .select('value')
    .eq('key', 'program_end_date')
    .maybeSingle()

  const programEndDate = endDateSetting?.value

  const body = await request.json()

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
const programEndDateObj = programEndDate ? toLA(programEndDate, '23:59') : null
const untilDate = body.recurrenceUntil ? toLA(body.recurrenceUntil, '23:59') : programEndDateObj
  // Validate against program end date
  if (programEndDate) {
    const endDate = new Date(programEndDate + 'T23:59:59')
    for (const baseSlot of baseDaySlots) {
      if (new Date(baseSlot.start_time) > endDate) {
        return NextResponse.json({ error: `Slots cannot be scheduled past ${programEndDate}` }, { status: 422 })
      }
    }
    // Also check recurrence end date
   if (untilDate && untilDate > new Date(programEndDate + 'T23:59:59-08:00')) {
      return NextResponse.json({ error: `Recurrence cannot extend past ${programEndDate}` }, { status: 422 })
    }
  }
  for (const baseSlot of baseDaySlots) {
    let current = {
      start: new Date(baseSlot.start_time),
      end:   new Date(baseSlot.end_time),
    }

    let count = 0
    while (count < 200) {
      if (untilDate && current.start > untilDate) break

      slotsToInsert.push({
        mentor_id:        mentor.id,
        start_time:       current.start.toISOString(),
        end_time:         current.end.toISOString(),
        duration_minutes: body.durationMinutes ?? 20,
        meeting_type:     body.meetingType ?? 'virtual',
        recurrence_rule:  body.recurrenceRule ?? null,
      })

      if (!body.recurrenceRule) break

   const daysToAdd = body.recurrenceRule === 'daily' ? 1 : body.recurrenceRule === 'weekly' ? 7 : 14

      // Get LA wall clock time for CURRENT slot
      const laFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Los_Angeles',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
        hour12: false
      })

      const getPart = (parts: Intl.DateTimeFormatPart[], type: string) => 
        parts.find(p => p.type === type)?.value ?? '00'

      const currentStartParts = laFormatter.formatToParts(current.start)
      const currentEndParts = laFormatter.formatToParts(current.end)

      // Get current LA date and time
      const currentDateStr = `${getPart(currentStartParts, 'year')}-${getPart(currentStartParts, 'month')}-${getPart(currentStartParts, 'day')}`
      const startTimeStr = `${getPart(currentStartParts, 'hour')}:${getPart(currentStartParts, 'minute')}`
      const endTimeStr = `${getPart(currentEndParts, 'hour')}:${getPart(currentEndParts, 'minute')}`

      // Add days to the DATE only (not UTC timestamp)
      const currentDate = new Date(currentDateStr + 'T12:00:00') // noon to avoid date boundary issues
      const nextDate = addDays(currentDate, daysToAdd)
      const nextDateStr = nextDate.toISOString().split('T')[0]

      current = {
        start: toLA(nextDateStr, startTimeStr),
        end: toLA(nextDateStr, endTimeStr)
      }
      count++
    }
  }

  const { data: inserted, error } = await supabase
    .from('appointment_slots')
    .insert(slotsToInsert)
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ slotsCreated: inserted?.length ?? 0 })
}