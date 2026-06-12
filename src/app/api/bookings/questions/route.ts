import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET() {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('intake_questions')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Fetch mentor first names for the mentor multiselect question
  const { data: mentors } = await supabase
    .from('mentor_profiles')
    .select('full_name')
    .eq('is_active', true)
    .order('full_name', { ascending: true })

  const mentorNames = (mentors ?? []).map(m => m.full_name.split(' ')[0])

  // Build the final questions array with mentor names injected
  const questions = (data ?? []).map(q => {
    if (q.sort_order === 9 && mentorNames.length > 0) {
      return { ...q, options: mentorNames }
    }
    return q
  })

  return NextResponse.json(questions)
}