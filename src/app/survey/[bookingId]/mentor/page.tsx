'use client'
import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { formatDatePST, formatTimePST } from '@/lib/utils'

export default function MentorSurveyPage({
  params,
}: {
  params: Promise<{ bookingId: string }>
}) {
  const [bookingId,  setBookingId]  = useState<string | null>(null)
  const [booking,    setBooking]    = useState<any>(null)
  const [loading,    setLoading]    = useState(true)
  const [submitted,  setSubmitted]  = useState(false)
  const [error,      setError]      = useState('')
  const [noShow,     setNoShow]     = useState<string | null>(null)
  const [meetIssue,  setMeetIssue]  = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      const { bookingId: id } = await params
      setBookingId(id)

      const res  = await fetch(`/api/survey/${id}`)
      const data = await res.json()
      if (res.ok) {
        setBooking(data)
      } else {
        setError('Survey not found.')
      }
      setLoading(false)
    }
    init()
  }, [])

  async function handleSubmit() {
    if (!noShow || !meetIssue) {
      setError('Please answer all questions before submitting.')
      return
    }

    const res = await fetch(`/api/survey/${bookingId}/mentor`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        additional_answers: {
          no_show:    noShow,
          meet_issue: meetIssue,
        },
      }),
    })

    if (res.ok) {
      setSubmitted(true)
    } else {
      setError('Something went wrong. Please try again.')
    }
  }

  if (loading) return <p style={{ padding: '2rem', color: '#888780' }}>Loading...</p>

  if (submitted) {
    return (
      <main style={{ maxWidth: 500, margin: '0 auto', padding: '3rem 1rem', textAlign: 'center' }}>
        <div style={{ background: '#E1F5EE', border: '0.5px solid #5DCAA5', borderRadius: 12, padding: '2rem' }}>
          <p style={{ fontSize: 20, fontWeight: 500, color: '#085041', margin: '0 0 8px' }}>Thank you!</p>
          <p style={{ fontSize: 14, color: '#0F6E56', margin: 0 }}>
            Your feedback has been recorded.
          </p>
        </div>
      </main>
    )
  }

  const studentName = booking?.student_name ?? 'your student'
  const apptDate = booking?.start_time
? formatDatePST(booking.start_time)
    : ''
  const apptTime = booking?.start_time
? formatTimePST(booking.start_time)
    : ''

  function YesNoButtons({ value, onChange }: { value: string | null; onChange: (v: string) => void }) {
    return (
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        {['Yes', 'No'].map(opt => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 8, fontSize: 14,
              fontWeight: value === opt ? 600 : 400,
              background: value === opt ? '#534AB7' : '#ffffff',
              color:      value === opt ? '#ffffff' : '#2C2C2A',
              border:     `0.5px solid ${value === opt ? '#534AB7' : '#D3D1C7'}`,
              cursor: 'pointer',
            }}
          >
            {opt}
          </button>
        ))}
      </div>
    )
  }

  return (
    <main style={{ maxWidth: 500, margin: '0 auto', padding: '2rem 1rem' }}>

      <h1 style={{ fontSize: 20, fontWeight: 500, margin: '0 0 4px' }}>Session report</h1>
      <p style={{ fontSize: 13, color: '#888780', margin: '0 0 8px' }}>
        Please fill out this report only if the student was a no-show or had issues connecting on Google Meet.
      </p>
      <p style={{ fontSize: 13, color: '#888780', margin: '0 0 24px' }}>
        Appointment with {studentName} · {apptDate} at {apptTime}
      </p>

      {error && (
        <div style={{ background: '#FCEBEB', border: '0.5px solid #F09595', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#791F1F' }}>
          {error}
        </div>
      )}

      {/* Q1 */}
      <div style={{ background: '#ffffff', border: '0.5px solid #e8e6de', borderRadius: 12, padding: '1.25rem', marginBottom: 12 }}>
        <p style={{ fontWeight: 500, fontSize: 14, margin: 0 }}>
          Was the student a no-show?
        </p>
        <YesNoButtons value={noShow} onChange={setNoShow} />
      </div>

      {/* Q2 */}
      <div style={{ background: '#ffffff', border: '0.5px solid #e8e6de', borderRadius: 12, padding: '1.25rem', marginBottom: 20 }}>
        <p style={{ fontWeight: 500, fontSize: 14, margin: 0 }}>
          Did the student have issues connecting on Google Meet?
        </p>
        <YesNoButtons value={meetIssue} onChange={setMeetIssue} />
      </div>

      <button
        onClick={handleSubmit}
        disabled={!noShow || !meetIssue}
        style={{ width: '100%', fontSize: 14 }}
      >
        Submit report
      </button>

    </main>
  )
}