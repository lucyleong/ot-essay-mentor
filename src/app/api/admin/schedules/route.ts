import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { addDays, addWeeks, addMonths } from 'date-fns'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  const body = await request.json()

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
  const untilDate = body.recurrenceUntil ? new Date(body.recurrenceUntil) : null

  for (const baseSlot of baseDaySlots) {
    let current = {
      start: new Date(baseSlot.start_time),
      end:   new Date(baseSlot.end_time),
    }

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

      if (body.recurrenceRule === 'daily') {
        current = { start: addDays(current.start, 1), end: addDays(current.end, 1) }
      } else if (body.recurrenceRule === 'weekly') {
        current = { start: addWeeks(current.start, 1), end: addWeeks(current.end, 1) }
      } else if (body.recurrenceRule === 'biweekly') {
        current = { start: addWeeks(current.start, 2), end: addWeeks(current.end, 2) }
      } else {
        break
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