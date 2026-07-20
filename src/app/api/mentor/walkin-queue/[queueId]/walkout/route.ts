import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const serviceSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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

  // Update walk-in queue status to walked_out
  const { error } = await serviceSupabase
    .from('walkin_queue')
    .update({ status: 'walked_out' })
    .eq('id', queueId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Mark the permanent booking as cancelled since they walked out
  const { data: booking } = await serviceSupabase
    .from('student_bookings')
    .select('id')
    .eq('queue_id', queueId)
    .single()

  if (booking) {
    await serviceSupabase
      .from('student_bookings')
      .update({ cancelled_at: new Date().toISOString() })
      .eq('id', booking.id)
  }

  return NextResponse.json({ ok: true })
}