import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdminOrCCC } from '@/lib/admin-auth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const auth = await requireAdminOrCCC(request)
  if ('error' in auth) return auth.error

  const nowPST = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }))
  const startOfDayPST = new Date(nowPST)
  startOfDayPST.setHours(0, 0, 0, 0)
  const endOfDayPST = new Date(nowPST)
  endOfDayPST.setHours(23, 59, 59, 999)

  const dstStart = new Date(Date.UTC(nowPST.getFullYear(), 2, 1))
  dstStart.setUTCDate(1 + (7 - dstStart.getUTCDay()) % 7 + 7)
  const dstEnd = new Date(Date.UTC(nowPST.getFullYear(), 10, 1))
  dstEnd.setUTCDate(1 + (7 - dstEnd.getUTCDay()) % 7)
  const isPDT = new Date() >= dstStart && new Date() < dstEnd
  const offsetMs = isPDT ? 7 * 60 * 60 * 1000 : 8 * 60 * 60 * 1000

  const startUTC = new Date(startOfDayPST.getTime() + offsetMs).toISOString()
  const endUTC = new Date(endOfDayPST.getTime() + offsetMs).toISOString()

  const { data: log, error } = await supabase
    .from('mentor_availability_log')
    .select(`
      id, is_available, toggled_at,
      mentor_profiles ( full_name )
    `)
    .gte('toggled_at', startUTC)
    .lte('toggled_at', endUTC)
    .order('toggled_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ log: log ?? [] })
}
