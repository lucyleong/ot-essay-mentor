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

  // The 8 PST calendar days we actually want to show, as 'en-CA' (YYYY-MM-DD)
  // keys — computed the same way the slots get bucketed below, so "total"
  // can never drift from what actually gets displayed for these days.
  const targetDayKeys = new Set(
    Array.from({ length: 8 }, (_, i) => {
      const d = new Date(nowPST)
      d.setDate(d.getDate() + daysToAdd + i)
      return d.toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' })
    })
  )

  // Query a generously padded UTC range around those days — converting a PST
  // wall-clock date back into a precise UTC instant via string round-tripping
  // is unreliable (that's what caused this bug in the first place), so
  // instead of trying to get the boundary exact, we over-fetch by a day on
  // each side and then filter down to targetDayKeys below, where the
  // precise, already-correct per-slot PST conversion does the real work.
  const paddedStart = new Date(nowPST)
  paddedStart.setDate(paddedStart.getDate() + daysToAdd - 1)
  paddedStart.setHours(0, 0, 0, 0)

  const paddedEnd = new Date(nowPST)
  paddedEnd.setDate(paddedEnd.getDate() + daysToAdd + 8)
  paddedEnd.setHours(23, 59, 59, 999)

  let query = supabase
    .from('appointment_slots')
    .select(`
      id,
      start_time,
      end_time,
      duration_minutes,
      meeting_type,
      google_meet_link,
mentor_profiles!appointment_slots_mentor_id_fkey!inner (
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
   .gte('start_time', paddedStart.toISOString())
    .lte('start_time', paddedEnd.toISOString())
    .order('start_time', { ascending: true })

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Group slots by date, keeping only the 8 target days — this is what
  // guarantees "total" always matches what actually gets shown.
  const grouped: Record<string, typeof data> = {}
  let total = 0
  for (const slot of data ?? []) {
    const dateKey = new Date(slot.start_time).toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' })
    if (!targetDayKeys.has(dateKey)) continue
    if (!grouped[dateKey]) grouped[dateKey] = []
    grouped[dateKey].push(slot)
    total++
  }

  return NextResponse.json({
    slots: grouped,
    total,
  })
}