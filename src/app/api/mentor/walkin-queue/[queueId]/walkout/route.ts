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

  const isCCC = user.app_metadata?.role === 'ccc'
  const isAdmin = user.app_metadata?.role === 'admin'

  const { data: mentor } = await supabase
    .from('mentor_profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!mentor && !isCCC && !isAdmin) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

  // Update walk-in queue status to walked_out
  const { data: updatedRows, error } = await serviceSupabase
    .from('walkin_queue')
    .update({ status: 'walked_out' })
    .eq('id', queueId)
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!updatedRows || updatedRows.length === 0) {
    return NextResponse.json(
      { error: `No walk-in queue entry found with id ${queueId}` },
      { status: 404 }
    )
  }

  // Mark the permanent booking as cancelled since they walked out
  const { data: booking } = await serviceSupabase
    .from('student_bookings')
    .select('id')
    .eq('queue_id', queueId)
    .maybeSingle()

  if (booking) {
    await serviceSupabase
      .from('student_bookings')
      .update({ cancelled_at: new Date().toISOString() })
      .eq('id', booking.id)
  }

  return NextResponse.json({ ok: true })
}