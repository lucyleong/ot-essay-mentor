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

  const { data: queue } = await supabase
    .from('walkin_queue')
    .select(`
      id, student_name, student_email, student_phone, status, checked_in_at,
      walkin_queue_answers (
        answer_text,
        intake_questions ( question_text, sort_order )
      )
    `)
    .eq('status', 'waiting')
    .order('checked_in_at', { ascending: true })

  return NextResponse.json({
    queue: queue ?? [],
    isInPersonAvailable: mentor.is_in_person_available ?? false,
  })
}