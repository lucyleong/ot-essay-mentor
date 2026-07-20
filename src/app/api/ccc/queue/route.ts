import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const nowPST = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }))
  const startOfDayPST = new Date(nowPST)
  startOfDayPST.setHours(0, 0, 0, 0)
  const endOfDayPST = new Date(nowPST)
  endOfDayPST.setHours(23, 59, 59, 999)
  const offsetMs = 7 * 60 * 60 * 1000
  const startUTC = new Date(startOfDayPST.getTime() + offsetMs).toISOString()
  const endUTC = new Date(endOfDayPST.getTime() + offsetMs).toISOString()

  const { data: queue } = await supabase
    .from('walkin_queue')
    .select(`
      id, student_name, status, checked_in_at, helped_by_mentor_id,
      mentor_profiles ( full_name ),
      walkin_queue_answers (
        answer_text,
        intake_questions ( question_text )
      )
    `)
    .gte('checked_in_at', startUTC)
    .lte('checked_in_at', endUTC)
    .order('checked_in_at', { ascending: true })

  return NextResponse.json({ queue: queue ?? [] })
}