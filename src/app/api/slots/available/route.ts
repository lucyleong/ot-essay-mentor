import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const type     = request.nextUrl.searchParams.get('type')

  const now = new Date()

  // 10pm PST cutoff — after 10pm, "tomorrow" becomes unavailable
  // We calculate the cutoff as 10pm PST today
  const nowPST = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }))
  const cutoffHour = 22 // 10pm
  
  // If it's after 10pm PST, start from day after tomorrow; otherwise start from tomorrow
  const daysToAdd = nowPST.getHours() >= cutoffHour ? 2 : 1
  
  // Window start: beginning of tomorrow (or day after tomorrow if past 10pm)
  const windowStart = new Date(nowPST)
  windowStart.setDate(windowStart.getDate() + daysToAdd)
  windowStart.setHours(0, 0, 0, 0)
  
// Window end: 6 days after window start (so total = 7 days including start day)
  const windowEnd = new Date(windowStart)
  windowEnd.setDate(windowEnd.getDate() + 6)
  windowEnd.setHours(23, 59, 59, 999)

  // Convert back to UTC for database query
  const windowStartUTC = new Date(windowStart.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }))
  const windowEndUTC = new Date(windowEnd.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }))

  let query = supabase
    .from('appointment_slots')
    .select(`
      id,
      start_time,
      end_time,
      duration_minutes,
      meeting_type,
      google_meet_link,
      mentor_profiles!inner (
        id,
        full_name,
        department,
        bio,
        is_virtual_available
      )
    `)
    .eq('is_booked', false)
    .eq('is_cancelled', false)
    .is('program_session_id', null)
    .eq('mentor_profiles.is_virtual_available', true)
   .gte('start_time', windowStart.toISOString())
    .lte('start_time', windowEnd.toISOString())
    .order('start_time', { ascending: true })

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Group slots by date
  const grouped: Record<string, typeof data> = {}
  for (const slot of data ?? []) {
    const dateKey = new Date(slot.start_time).toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' })
    if (!grouped[dateKey]) grouped[dateKey] = []
    grouped[dateKey].push(slot)
  }

  return NextResponse.json({
    slots: grouped,
    total: data?.length ?? 0,
  })
}