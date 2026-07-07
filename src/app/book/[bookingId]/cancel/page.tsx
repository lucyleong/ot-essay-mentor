'use client'
import { use, useState } from 'react'
import { format } from 'date-fns'
import { formatDatePST, formatTimePST } from '@/lib/utils'

export default function CancelPage({
  params,
}: {
  params: Promise<{ bookingId: string }>
}) {
  const { bookingId } = use(params)
  const [booking,   setBooking]   = useState<any>(null)
  const [loading,   setLoading]   = useState(true)
  const [cancelled, setCancelled] = useState(false)
  const [error,     setError]     = useState('')
  const [confirming, setConfirming] = useState(false)

  useState(() => {
    fetch(`/api/survey/${bookingId}`)
      .then(r => r.json())
      .then(data => {
        setBooking(data)
        setLoading(false)
      })
      .catch(() => {
        setError('Booking not found.')
        setLoading(false)
      })
  })

  async function handleCancel() {
    setConfirming(true)
    const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
      method: 'POST',
    })

    if (res.ok) {
      setCancelled(true)
    } else {
      setError('Something went wrong. Please try again.')
      setConfirming(false)
    }
  }

  if (loading) return <p style={{ padding: '2rem', color: '#888780' }}>Loading...</p>

  if (cancelled) {
    return (
      <main style={{ maxWidth: 500, margin: '0 auto', padding: '3rem 1rem', textAlign: 'center' }}>
        <div style={{ background: '#FCEBEB', border: '0.5px solid #F09595', borderRadius: 12, padding: '2rem' }}>
          <p style={{ fontSize: 20, fontWeight: 500, color: '#791F1F', margin: '0 0 8px' }}>Appointment canceled</p>
        <p style={{ fontSize: 13, color: '#791F1F', margin: '0 0 16px' }}>
            Your appointment has been canceled.<br />We hope to see you again soon!
          </p>
          <a href="/book" style={{ color: '#534AB7', fontSize: 14 }}>Book a new appointment →</a>
        </div>
      </main>
    )
  }

  const mentorFirstName = booking?.mentor_name?.split(' ')[0] ?? 'your mentor'
  const apptDate = booking?.start_time
? formatDatePST(booking.start_time)
    : ''
  const apptTime = booking?.start_time
? formatTimePST(booking.start_time)
    : ''

  return (
    <main style={{ maxWidth: 500, margin: '0 auto', padding: '2rem 1rem' }}>
      <h1 style={{ fontSize: 20, fontWeight: 500, margin: '0 0 4px' }}>Cancel appointment</h1>
      <p style={{ fontSize: 13, color: '#888780', margin: '0 0 24px' }}>
        Appointment with {mentorFirstName} · {apptDate} at {apptTime}
      </p>

      {error && (
        <div style={{ background: '#FCEBEB', border: '0.5px solid #F09595', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#791F1F' }}>
          {error}
        </div>
      )}

      <div style={{ background: '#ffffff', border: '0.5px solid #e8e6de', borderRadius: 12, padding: '1.5rem', marginBottom: 16 }}>
        <p style={{ fontSize: 15, color: '#2C2C2A', margin: '0 0 8px', fontWeight: 500 }}>
          Are you sure you want to cancel?
        </p>
        <p style={{ fontSize: 13, color: '#888780', margin: 0, lineHeight: 1.6 }}>
          Cancelling will free up your slot for another student. You can book a new appointment afterwards.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={handleCancel}
          disabled={confirming}
          style={{ flex: 1, background: '#E24B4A', color: '#ffffff', border: 'none', borderRadius: 8, padding: '10px', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
        >
          {confirming ? 'Cancelling...' : 'Yes, cancel my appointment'}
        </button>
        <a
          href="/"
          style={{ flex: 1, background: '#ffffff', color: '#2C2C2A', border: '0.5px solid #e8e6de', borderRadius: 8, padding: '10px', fontSize: 14, textAlign: 'center', textDecoration: 'none' }}
        >
          Keep my appointment
        </a>
      </div>
    </main>
  )
}