import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { mentorId, field, value } = body

  if (!mentorId || !field) {
    return NextResponse.json({ error: 'Missing mentorId or field' }, { status: 400 })
  }

  if (!['is_active', 'is_virtual_available'].includes(field)) {
    return NextResponse.json({ error: 'Invalid field' }, { status: 400 })
  }

  const { error } = await supabase
    .from('mentor_profiles')
    .update({ [field]: value })
    .eq('id', mentorId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}