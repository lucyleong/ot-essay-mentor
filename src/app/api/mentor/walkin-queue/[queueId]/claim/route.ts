import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ queueId: string }> }
) {
  const supabase = await createServerSupabaseClient()
  const { queueId } = await context.params

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: mentor } = await supabase
    .from('mentor_profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (!mentor) return NextResponse.json({ error: 'Not a mentor' }, { status: 403 })

  const { error } = await supabase
    .from('walkin_queue')
    .update({
      status: 'helped',
      helped_by_mentor_id: mentor.id,
      helped_at: new Date().toISOString(),
    })
    .eq('id', queueId)
    .eq('status', 'waiting')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}