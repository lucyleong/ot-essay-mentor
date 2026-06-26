import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSlotOnCalendar } from '@/lib/calendar'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  const body = await request.json()

  if (!body.mentorId) {
    return NextResponse.json({ error: 'Missing mentorId' }, { status: 400 })
  }

  const { data: slots } = await supabase
    .from('appointment_slots')
    .select('id')
    .eq('mentor_id', body.mentorId)
    .eq('is_cancelled', false)
    .is('google_calendar_event_id', null)
    .gte('start_time', new Date().toISOString())

  const allSlots = slots ?? []
  let synced = 0

  const batchSize = 5
  for (let i = 0; i < allSlots.length; i += batchSize) {
    const batch = allSlots.slice(i, i + batchSize)
    await Promise.all(batch.map(async slot => {
      try {
        await createSlotOnCalendar(slot.id)
        synced++
      } catch (err: any) {
        console.error('Calendar sync failed for slot:', slot.id, err.message)
      }
    }))
  }

  return NextResponse.json({ synced })
}