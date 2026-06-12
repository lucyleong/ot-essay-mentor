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

  // For the mentor multiselect question, fetch current mentor names
  const mentorQuestion = data?.find(q => q.sort_order === 9)
  if (mentorQuestion) {
    const { data: mentors } = await supabase
      .from('mentor_profiles')
      .select('full_name')
      .eq('is_active', true)
      .order('full_name', { ascending: true })

    if (mentors && mentors.length > 0) {
      mentorQuestion.options = mentors.map(m => m.full_name)
    }
  }

  return NextResponse.json(data ?? [])
}