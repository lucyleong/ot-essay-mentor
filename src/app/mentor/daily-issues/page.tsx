'use client'
import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { formatTimePST } from '@/lib/utils'

type MeetIssue = 'No' | 'Yes - still met' | 'Yes - did not meet'

type DayBooking = {
  bookingId: string
  studentName: string
  startTime: string
  noShow: boolean
  meetIssue: MeetIssue
}

export default function DailyIssuesPage() {
  const [bookings, setBookings] = useState<DayBooking[]>([])
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState<string | null>(null)

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' })

  useEffect(() => {
    fetch(`/api/mentor/daily-issues?date=${today}`)
      .then(r => r.json())
      .then(data => {
        setBookings(Array.isArray(data) ? data : [])
        setLoading(false)
      })
  }, [])

 async function toggleNoShow(bookingId: string) {
    const currentBooking = bookings.find(b => b.bookingId === bookingId)
    if (!currentBooking) return

    setSaving(bookingId)
    const newNoShow = !currentBooking.noShow

    setBookings(prev => prev.map(b =>
      b.bookingId === bookingId ? { ...b, noShow: newNoShow } : b
    ))

    await fetch('/api/mentor/daily-issues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookingId,
        noShow: newNoShow,
        meetIssue: currentBooking.meetIssue,
      }),
    })

    setSaving(null)
  }

  async function setMeetIssue(bookingId: string, meetIssue: MeetIssue) {
    const currentBooking = bookings.find(b => b.bookingId === bookingId)
    if (!currentBooking) return

    setSaving(bookingId)

    setBookings(prev => prev.map(b =>
      b.bookingId === bookingId ? { ...b, meetIssue } : b
    ))

    await fetch('/api/mentor/daily-issues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookingId,
        noShow: currentBooking.noShow,
        meetIssue,
      }),
    })

    setSaving(null)
  }

  if (loading) return <p style={{ padding: '2rem', color: '#888780' }}>Loading...</p>

  return (
    <main style={{ maxWidth: 600, margin: '0 auto', padding: '2rem 1rem' }}>
      <h1 style={{ fontSize: 20, fontWeight: 500, margin: '0 0 4px' }}>
        Today's appointments
      </h1>
      <p style={{ fontSize: 13, color: '#888780', margin: '0 0 20px' }}>
        Only mark a student if there was a no-show or a connection issue. No action needed otherwise.
      </p>

      {bookings.length === 0 ? (
        <div style={{ background: '#ffffff', border: '0.5px solid #e8e6de', borderRadius: 12, padding: '2rem', textAlign: 'center' }}>
          <p style={{ color: '#888780', margin: 0 }}>No appointments found for today.</p>
        </div>
      ) : (
        bookings.map(b => (
          <div key={b.bookingId} style={{
            background: '#ffffff', border: '0.5px solid #e8e6de',
            borderRadius: 12, padding: '14px 20px', marginBottom: 8,
          }}>
            <p style={{ fontWeight: 500, fontSize: 14, margin: '0 0 2px' }}>
              {b.studentName}
            </p>
            <p style={{ fontSize: 12, color: '#888780', margin: '0 0 10px' }}>
{formatTimePST(b.startTime)}
            </p>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => toggleNoShow(b.bookingId)}
disabled={saving !== null}
                style={{
                  fontSize: 12, padding: '6px 14px', borderRadius: 20,
                  background: b.noShow ? '#FCEBEB' : '#ffffff',
                  border: `0.5px solid ${b.noShow ? '#E24B4A' : '#D3D1C7'}`,
                  color: b.noShow ? '#791F1F' : '#5F5E5A',
                }}
              >
                {b.noShow ? '✓ No-show' : 'No-show'}
              </button>
              <select
                value={b.meetIssue}
                onChange={e => setMeetIssue(b.bookingId, e.target.value as MeetIssue)}
                disabled={saving !== null}
                style={{
                  fontSize: 12, padding: '6px 10px', borderRadius: 20, height: 'auto',
                  background: b.meetIssue === 'No' ? '#ffffff' : '#FAEEDA',
                  border: `0.5px solid ${b.meetIssue === 'No' ? '#D3D1C7' : '#C9851A'}`,
                  color: b.meetIssue === 'No' ? '#5F5E5A' : '#854F0B',
                }}
              >
                <option value="No">No connection issue</option>
                <option value="Yes - still met">Connection issue - still met</option>
                <option value="Yes - did not meet">Connection issue - did not meet</option>
              </select>
            </div>
          </div>
        ))
      )}
    </main>
  )
}