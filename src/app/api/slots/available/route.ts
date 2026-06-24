import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { addDays, startOfDay, endOfDay } from 'date-fns'

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const type     = request.nextUrl.searchParams.get('type')

  const now    = new Date()
  const window = endOfDay(addDays(now, 7))

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
    .gte('start_time', now.toISOString())
    .lte('start_time', window.toISOString())
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