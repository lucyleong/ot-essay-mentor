import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/admin-auth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const { data, error } = await supabase
    .from('mentor_shadow_links')
    .select(`
      id, shadow_mentor_id, lead_mentor_id,
      shadow_mentor:mentor_profiles!mentor_shadow_links_shadow_mentor_id_fkey ( full_name ),
      lead_mentor:mentor_profiles!mentor_shadow_links_lead_mentor_id_fkey ( full_name )
    `)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data ?? [])
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const { shadowMentorId, leadMentorId } = await request.json()

  if (!shadowMentorId || !leadMentorId) {
    return NextResponse.json({ error: 'shadowMentorId and leadMentorId are required' }, { status: 400 })
  }

  if (shadowMentorId === leadMentorId) {
    return NextResponse.json({ error: 'A mentor cannot shadow themselves' }, { status: 400 })
  }

  const { error } = await supabase
    .from('mentor_shadow_links')
    .insert({ shadow_mentor_id: shadowMentorId, lead_mentor_id: leadMentorId })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const { error } = await supabase
    .from('mentor_shadow_links')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
