import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { addDays, addWeeks } from 'date-fns'

function toLA(dateStr: string, timeStr: string): Date {
  // Use Intl to get the UTC offset for LA on this specific date
  const testDate = new Date(`${dateStr}T${timeStr}:00Z`)
  const laString = testDate.toLocaleString('en-US', { timeZone: 'America/Los_Angeles', hour12: false })
  const utcString = testDate.toLocaleString('en-US', { hour12: false })
  const laDate = new Date(laString)
  const utcDate = new Date(utcString)
  const offsetMs = utcDate.getTime() - laDate.getTime()
  return new Date(testDate.getTime() + offsetMs)
}

// Debug test
const testDST = toLA('2026-11-01', '15:00')
console.log('DST test - Nov 1 3pm LA should be 23:00 UTC:', testDST.toISOString())

export async function GET() {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: mentor } = await supabase
    .from('mentor_profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

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
    .single()

  if (!mentor) return NextResponse.json({ error: 'Not a mentor' }, { status: 403 })

  // Check program end date
  const { data: endDateSetting } = await supabase
    .from('program_settings')
    .select('value')
    .eq('key', 'program_end_date')
    .single()

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
const programEndDateObj = programEndDate ? new Date(programEndDate + 'T23:59:59-08:00') : null
  const untilDate = body.recurrenceUntil ? new Date(body.recurrenceUntil) : programEndDateObj

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
    while (count < 52) {
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

      // Get the next date in LA timezone
      const nextStart = addDays(current.start, daysToAdd)
      const nextEnd = addDays(current.end, daysToAdd)

      // Get the wall clock time in LA for the current slot
      const laFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Los_Angeles',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false
      })

      const startParts = laFormatter.formatToParts(nextStart)
      const endParts = laFormatter.formatToParts(nextEnd)

      const getPart = (parts: Intl.DateTimeFormatPart[], type: string) => 
        parts.find(p => p.type === type)?.value ?? '00'

      // Reconstruct using LA wall clock time to get correct UTC for that date
      const nextDateStr = `${getPart(startParts, 'year')}-${getPart(startParts, 'month')}-${getPart(startParts, 'day')}`
      const startTimeStr = `${getPart(startParts, 'hour')}:${getPart(startParts, 'minute')}`
      const endTimeStr = `${getPart(endParts, 'hour')}:${getPart(endParts, 'minute')}`

      const nextEndDateStr = `${getPart(endParts, 'year')}-${getPart(endParts, 'month')}-${getPart(endParts, 'day')}`

      current = {
        start: toLA(nextDateStr, startTimeStr),
        end: toLA(nextEndDateStr, endTimeStr)
      }
      console.log(`Recurring slot: ${nextDateStr} ${startTimeStr} → ${current.start.toISOString()}`)
      count++
        start: toLA(nextDateStr, startTimeStr),
        end: toLA(nextEndDateStr, endTimeStr)
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