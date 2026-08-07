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

  const mentorId = request.nextUrl.searchParams.get('mentorId')

  let query = supabase
    .from('appointment_slots')
    .select(`
      id, start_time, end_time, is_booked, meeting_type,
      mentor_profiles ( full_name )
    `)
    .eq('is_cancelled', false)
    .gte('start_time', new Date().toISOString())
    .order('start_time', { ascending: true })

  if (mentorId) query = query.eq('mentor_id', mentorId)

  const { data: slots } = await query

  return NextResponse.json(slots ?? [])
}