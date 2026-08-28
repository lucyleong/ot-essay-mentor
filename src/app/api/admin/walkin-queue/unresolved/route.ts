import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/admin-auth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  // Start of today in Pacific time, DST-aware
  const nowPST = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }))
  const startOfDayPST = new Date(nowPST)
  startOfDayPST.setHours(0, 0, 0, 0)

  const dstStart = new Date(Date.UTC(nowPST.getFullYear(), 2, 1))
  dstStart.setUTCDate(1 + (7 - dstStart.getUTCDay()) % 7 + 7)
  const dstEnd = new Date(Date.UTC(nowPST.getFullYear(), 10, 1))
  dstEnd.setUTCDate(1 + (7 - dstEnd.getUTCDay()) % 7)
  const isPDT = new Date() >= dstStart && new Date() < dstEnd
  const offsetMs = isPDT ? 7 * 60 * 60 * 1000 : 8 * 60 * 60 * 1000

  const startOfTodayUTC = new Date(startOfDayPST.getTime() + offsetMs).toISOString()

  const { data: queue, error } = await supabase
    .from('walkin_queue')
    .select('id, student_name, student_email, student_phone, checked_in_at')
    .eq('status', 'waiting')
    .lt('checked_in_at', startOfTodayUTC)
    .order('checked_in_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ queue: queue ?? [] })
}
