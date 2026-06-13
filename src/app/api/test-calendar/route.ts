import { NextRequest, NextResponse } from 'next/server'
import { createSlotOnCalendar } from '@/lib/calendar'

export async function GET(request: NextRequest) {
  const slotId = request.nextUrl.searchParams.get('slotId')
  if (!slotId) return NextResponse.json({ error: 'No slotId provided' })

  try {
    const result = await createSlotOnCalendar(slotId)
    return NextResponse.json({ success: true, ...result })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}