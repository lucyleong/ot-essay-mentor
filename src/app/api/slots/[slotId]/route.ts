import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ slotId: string }> }
) {
  const supabase = await createServerSupabaseClient()
  const { slotId } = await context.params

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('appointment_slots')
    .update({ is_cancelled: true })
    .eq('id', slotId)
    .eq('is_booked', false) // Safety check — don't cancel booked slots

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}