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
  const [sessionEase,   setSessionEase]   = useState<number | null>(null)
const [mentorOnTime,  setMentorOnTime]  = useState<string | null>(null)
const [nextSteps,     setNextSteps]     = useState<string | null>(null)
const [workAgain,     setWorkAgain]     = useState<string | null>(null)
const [howHeard,      setHowHeard]      = useState('')

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
   if (!sessionEase || !mentorOnTime || !nextSteps || !workAgain) {
      setError('Please answer all required questions before submitting.')
      return
    }

    const res = await fetch(`/api/survey/${bookingId}/student`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        rating_overall:     sessionEase,
        additional_answers: {
          session_ease:  sessionEase,
          mentor_on_time: mentorOnTime,
          next_steps:    nextSteps,
          work_again:    workAgain,
          how_heard:     howHeard,
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
          Were you able to get into your session easily?
        </p>
        <p style={{ fontSize: 12, color: '#888780', margin: '0 0 4px' }}>1 = Very difficult · 5 = Very easy</p>
        <RatingButtons value={sessionEase} onChange={setSessionEase} />
      </div>

      {/* Q2 */}
      <div style={{ background: '#ffffff', border: '0.5px solid #e8e6de', borderRadius: 12, padding: '1.25rem', marginBottom: 12 }}>
        <p style={{ fontWeight: 500, fontSize: 14, margin: '0 0 12px' }}>
          Was your mentor on time?
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          {['Yes', 'No'].map(opt => (
            <button key={opt} onClick={() => setMentorOnTime(opt)} style={{
              flex: 1, padding: '10px 0', borderRadius: 8, fontSize: 14,
              fontWeight: mentorOnTime === opt ? 600 : 400,
              background: mentorOnTime === opt ? '#534AB7' : '#ffffff',
              color: mentorOnTime === opt ? '#ffffff' : '#2C2C2A',
              border: `0.5px solid ${mentorOnTime === opt ? '#534AB7' : '#D3D1C7'}`,
              cursor: 'pointer',
            }}>{opt}</button>
          ))}
        </div>
      </div>

      {/* Q3 */}
      <div style={{ background: '#ffffff', border: '0.5px solid #e8e6de', borderRadius: 12, padding: '1.25rem', marginBottom: 12 }}>
        <p style={{ fontWeight: 500, fontSize: 14, margin: '0 0 12px' }}>
          Did your mentor give you direction about next steps for your essay(s)?
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          {['Yes', 'No', 'Not sure'].map(opt => (
            <button key={opt} onClick={() => setNextSteps(opt)} style={{
              flex: 1, padding: '10px 0', borderRadius: 8, fontSize: 14,
              fontWeight: nextSteps === opt ? 600 : 400,
              background: nextSteps === opt ? '#534AB7' : '#ffffff',
              color: nextSteps === opt ? '#ffffff' : '#2C2C2A',
              border: `0.5px solid ${nextSteps === opt ? '#534AB7' : '#D3D1C7'}`,
              cursor: 'pointer',
            }}>{opt}</button>
          ))}
        </div>
      </div>

      {/* Q4 */}
      <div style={{ background: '#ffffff', border: '0.5px solid #e8e6de', borderRadius: 12, padding: '1.25rem', marginBottom: 12 }}>
        <p style={{ fontWeight: 500, fontSize: 14, margin: '0 0 12px' }}>
          Would you work with this mentor again?
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          {['Yes', 'No', 'Not sure'].map(opt => (
            <button key={opt} onClick={() => setWorkAgain(opt)} style={{
              flex: 1, padding: '10px 0', borderRadius: 8, fontSize: 14,
              fontWeight: workAgain === opt ? 600 : 400,
              background: workAgain === opt ? '#534AB7' : '#ffffff',
              color: workAgain === opt ? '#ffffff' : '#2C2C2A',
              border: `0.5px solid ${workAgain === opt ? '#534AB7' : '#D3D1C7'}`,
              cursor: 'pointer',
            }}>{opt}</button>
          ))}
        </div>
      </div>

      {/* Q5 */}
      <div style={{ background: '#ffffff', border: '0.5px solid #e8e6de', borderRadius: 12, padding: '1.25rem', marginBottom: 20 }}>
        <p style={{ fontWeight: 500, fontSize: 14, margin: '0 0 8px' }}>
          How did you hear about this program? Any other comments?
        </p>
        <p style={{ fontSize: 12, color: '#888780', margin: '0 0 8px' }}>Optional</p>
        <textarea
          value={howHeard}
          onChange={e => setHowHeard(e.target.value)}
          placeholder="e.g. My teacher told me, I saw a flyer..."
          rows={3}
          style={{ width: '100%', boxSizing: 'border-box', fontSize: 13, padding: '8px', borderRadius: 6, border: '0.5px solid #D3D1C7', resize: 'vertical' }}
        />
      </div>
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleSubmit}
disabled={!sessionEase || !mentorOnTime || !nextSteps || !workAgain}
        style={{ width: '100%', fontSize: 14 }}
      >
        Submit feedback
      </button>

    </main>
  )
}