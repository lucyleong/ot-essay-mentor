import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const serviceSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

  const { data: mentor } = await supabase
    .from('mentor_profiles')
    .select('id, full_name')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!mentor) return NextResponse.json({ error: 'No mentor profile' }, { status: 404 })

  // Find any lead mentors this mentor shadows, so their appointments can be
  // included below (read-only — the dashboard hides mutation controls for them)
  const { data: shadowLinks, error: shadowError } = await serviceSupabase
    .from('mentor_shadow_links')
    .select('lead_mentor_id, mentor_profiles!mentor_shadow_links_lead_mentor_id_fkey ( full_name )')
    .eq('shadow_mentor_id', mentor.id)

  if (shadowError) {
    return NextResponse.json({ error: shadowError.message }, { status: 500 })
  }

  const leadMentorNames: Record<string, string> = {}
  ;(shadowLinks ?? []).forEach((link: any) => {
    leadMentorNames[link.lead_mentor_id] = link.mentor_profiles?.full_name ?? 'their lead mentor'
  })
  const leadMentorIds = Object.keys(leadMentorNames)
  const mentorIds = [mentor.id, ...leadMentorIds]

  // Get all slots for this mentor and any mentors they shadow
  const { data: slots, error: slotsError } = await serviceSupabase
    .from('appointment_slots')
    .select('id, mentor_id')
    .in('mentor_id', mentorIds)

  if (slotsError) {
    return NextResponse.json({ error: slotsError.message }, { status: 500 })
  }

  const slotIds = (slots ?? []).map(s => s.id)

  if (slotIds.length === 0) {
    return NextResponse.json({ mentor, bookings: [] })
  }

  const { data: bookings, error: bookingsError } = await serviceSupabase
    .from('student_bookings')
    .select(`
    id, student_name, student_email, student_phone,
      sms_confirmed_at, sms_confirm_sent, sms_consent, cancelled_at, booked_at, meeting_type,
      appointment_slots (
        id, start_time, end_time, meeting_type, google_meet_link, mentor_id
      ),
      student_essays ( id )
    `)
    .is('cancelled_at', null)
    .in('slot_id', slotIds)
    .order('booked_at', { ascending: false })

  if (bookingsError) {
    return NextResponse.json({ error: bookingsError.message }, { status: 500 })
  }

  const bookingsWithShadowInfo = (bookings ?? []).map((b: any) => {
    const slotMentorId = b.appointment_slots?.mentor_id
    const isShadow = !!slotMentorId && slotMentorId !== mentor.id
    return {
      ...b,
      isShadow,
      leadMentorName: isShadow ? leadMentorNames[slotMentorId] ?? null : null,
    }
  })

  return NextResponse.json({ mentor, bookings: bookingsWithShadowInfo })
}
