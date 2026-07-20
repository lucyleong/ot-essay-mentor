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

  // Get today's date in PST
  const todayPST = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' })
  const startOfDay = `${todayPST}T00:00:00`
  const endOfDay = `${todayPST}T23:59:59`

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
    .gte('checked_in_at', startOfDay)
    .lte('checked_in_at', endOfDay)
    .order('checked_in_at', { ascending: true })

  return NextResponse.json({
    queue: queue ?? [],
    isInPersonAvailable: mentor.is_in_person_available ?? false,
  })
}