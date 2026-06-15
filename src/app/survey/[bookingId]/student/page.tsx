'use client'
import { useEffect, useState } from 'react'
import { format, parseISO } from 'date-fns'

export default function StudentSurveyPage({
  params,
}: {
  params: Promise<{ bookingId: string }>
}) {
  const [bookingId, setBookingId] = useState<string | null>(null)
  const [booking,   setBooking]   = useState<any>(null)
  const [loading,   setLoading]   = useState(true)
  const [submitted, setSubmitted] = useState(false)
  const [error,     setError]     = useState('')

  // Answers
  const [meetEase,    setMeetEase]    = useState<number | null>(null)
  const [helpfulness, setHelpfulness] = useState<number | null>(null)
  const [recommend,   setRecommend]   = useState<string | null>(null)

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
    if (!meetEase || !helpfulness || !recommend) {
      setError('Please answer all questions before submitting.')
      return
    }

    const res = await fetch(`/api/survey/${bookingId}/student`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        rating_overall:    helpfulness,
        additional_answers: {
          meet_ease:  meetEase,
          recommend,
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
            Your feedback helps us improve the program.
          </p>
        </div>
      </main>
    )
  }

  const mentorFirstName = booking?.mentor_name?.split(' ')[0] ?? 'your mentor'
  const apptDate = booking?.start_time
    ? format(new Date(new Date(booking.start_time).toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })), 'EEEE, MMMM d')
    : ''
  const apptTime = booking?.start_time
    ? format(new Date(new Date(booking.start_time).toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })), 'h:mm a')
    : ''

  function RatingButtons({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
    return (
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            onClick={() => onChange(n)}
            style={{
              width: 44, height: 44, borderRadius: 8, fontSize: 15,
              fontWeight: value === n ? 600 : 400,
              background: value === n ? '#534AB7' : '#ffffff',
              color:      value === n ? '#ffffff' : '#2C2C2A',
              border:     `0.5px solid ${value === n ? '#534AB7' : '#D3D1C7'}`,
              cursor: 'pointer',
            }}
          >
            {n}
          </button>
        ))}
      </div>
    )
  }

  return (
    <main style={{ maxWidth: 500, margin: '0 auto', padding: '2rem 1rem' }}>

      <h1 style={{ fontSize: 20, fontWeight: 500, margin: '0 0 4px' }}>How did it go?</h1>
      <p style={{ fontSize: 13, color: '#888780', margin: '0 0 24px' }}>
        Your appointment with {mentorFirstName} · {apptDate} at {apptTime}
      </p>

      {error && (
        <div style={{ background: '#FCEBEB', border: '0.5px solid #F09595', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#791F1F' }}>
          {error}
        </div>
      )}

      {/* Q1 */}
      <div style={{ background: '#ffffff', border: '0.5px solid #e8e6de', borderRadius: 12, padding: '1.25rem', marginBottom: 12 }}>
        <p style={{ fontWeight: 500, fontSize: 14, margin: '0 0 4px' }}>
          How easy was it to connect on Google Meet?
        </p>
        <p style={{ fontSize: 12, color: '#888780', margin: '0 0 4px' }}>1 = Very difficult · 5 = Very easy</p>
        <RatingButtons value={meetEase} onChange={setMeetEase} />
      </div>

      {/* Q2 */}
      <div style={{ background: '#ffffff', border: '0.5px solid #e8e6de', borderRadius: 12, padding: '1.25rem', marginBottom: 12 }}>
        <p style={{ fontWeight: 500, fontSize: 14, margin: '0 0 4px' }}>
          How helpful was {mentorFirstName}?
        </p>
        <p style={{ fontSize: 12, color: '#888780', margin: '0 0 4px' }}>1 = Not helpful · 5 = Extremely helpful</p>
        <RatingButtons value={helpfulness} onChange={setHelpfulness} />
      </div>

      {/* Q3 */}
      <div style={{ background: '#ffffff', border: '0.5px solid #e8e6de', borderRadius: 12, padding: '1.25rem', marginBottom: 20 }}>
        <p style={{ fontWeight: 500, fontSize: 14, margin: '0 0 12px' }}>
          Would you recommend this program to other Oakland Tech seniors?
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          {['Yes', 'Maybe', 'No'].map(opt => (
            <button
              key={opt}
              onClick={() => setRecommend(opt)}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 8, fontSize: 14,
                fontWeight: recommend === opt ? 600 : 400,
                background: recommend === opt ? '#534AB7' : '#ffffff',
                color:      recommend === opt ? '#ffffff' : '#2C2C2A',
                border:     `0.5px solid ${recommend === opt ? '#534AB7' : '#D3D1C7'}`,
                cursor: 'pointer',
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={!meetEase || !helpfulness || !recommend}
        style={{ width: '100%', fontSize: 14 }}
      >
        Submit feedback
      </button>

    </main>
  )
}