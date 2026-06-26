import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST() {
  try {
    // Delete essays from storage first
    const { data: essays } = await supabase
      .from('student_essays')
      .select('file_path')
      .not('file_path', 'is', null)

    if (essays && essays.length > 0) {
      const filePaths = essays.map(e => e.file_path).filter(Boolean)
      if (filePaths.length > 0) {
        await supabase.storage.from('essays').remove(filePaths)
      }
    }

    // Delete in order to avoid foreign key errors
   await supabase.from('survey_responses').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('mentor_daily_summaries').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('notifications_log').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('mentor_student_notes').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('student_essays').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('booking_question_answers').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('student_bookings').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('appointment_slots').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('End session error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}