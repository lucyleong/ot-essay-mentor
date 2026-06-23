import { NextRequest, NextResponse } from 'next/server'
import { addStudentToCalendarEvent } from '@/lib/calendar'

export async function GET(request: NextRequest) {
  const bookingId = request.nextUrl.searchParams.get('bookingId')
  if (!bookingId) return NextResponse.json({ error: 'No bookingId' })

  try {
    const result = await addStudentToCalendarEvent(bookingId)
    return NextResponse.json({ success: true, ...result })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}