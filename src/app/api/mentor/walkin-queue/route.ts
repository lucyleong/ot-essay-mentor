import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET() {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: mentor } = await supabase
    .from('mentor_profiles')
    .select('id, is_in_person_available')
    .eq('auth_user_id', user.id)
    .single()

  if (!mentor) return NextResponse.json({ error: 'Not a mentor' }, { status: 403 })

 // Calculate today's date range in UTC based on PST boundaries
  const nowPST = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }))
  const startOfDayPST = new Date(nowPST)
  startOfDayPST.setHours(0, 0, 0, 0)
  const endOfDayPST = new Date(nowPST)
  endOfDayPST.setHours(23, 59, 59, 999)
  
  // Convert PST boundaries to UTC for database query
  const offsetMs = 7 * 60 * 60 * 1000 // PST is UTC-7
  const startUTC = new Date(startOfDayPST.getTime() + offsetMs).toISOString()
  const endUTC = new Date(endOfDayPST.getTime() + offsetMs).toISOString()

  const { data: queue } = await supabase
    .from('walkin_queue')
    .select(`
      id, student_name, student_email, student_phone, status, checked_in_at, helped_by_mentor_id,
      mentor_profiles ( full_name ),
      walkin_queue_answers (
        answer_text,
        intake_questions ( question_text, sort_order )
      )
    `)
    .gte('checked_in_at', startUTC)
    .lte('checked_in_at', endUTC)
    .order('checked_in_at', { ascending: true })

  return NextResponse.json({
    queue: queue ?? [],
    isInPersonAvailable: mentor.is_in_person_available ?? false,
  })
}