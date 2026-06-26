'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Question = {
  id: string
  question_text: string
  question_type: string
  options: string[] | null
  is_required: boolean
  sort_order: number
}

function shortenLabel(label: string) {
  return label.split(' (')[0]
}

function getDetailInParens(label: string) {
  const match = label.match(/\(([^)]+)\)/)
  return match ? match[1] : ''
}

export default function CheckInPage() {
  const router = useRouter()
  const [questions, setQuestions] = useState<Question[]>([])
  const [firstName, setFirstName] = useState('')
  const [lastName,  setLastName]  = useState('')
  const [email,     setEmail]     = useState('')
  const [emailError, setEmailError] = useState('')
  const [phone,     setPhone]     = useState('')
  const [answers,   setAnswers]   = useState<Record<string, any>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted,  setSubmitted]  = useState(false)
  const [error,      setError]      = useState('')
  const [showMentor, setShowMentor] = useState(false)

  useEffect(() => {
    fetch('/api/bookings/questions')
      .then(r => r.json())
      .then(setQuestions)
  }, [])
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const urlCode = params.get('code')

    if (urlCode && urlCode.toUpperCase() === process.env.NEXT_PUBLIC_CHECKIN_CODE?.toUpperCase()) {
      sessionStorage.setItem('checkin_verified', 'true')
      return
    }

    const verified = sessionStorage.getItem('checkin_verified')
    if (!verified) {
      router.push('/verify')
      return
    }
  }, [])

  function validateEmail(value: string) {
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
    setEmailError(isValid || !value ? '' : 'Please enter a valid email address')
  }
 function handleAnswerChange(questionId: string, value: any) {
    setAnswers(prev => ({ ...prev, [questionId]: value }))
    const mentorPrevQuestion = questions.find(q => q.question_text === 'I have worked with a College Essay Mentor before through this program')
    if (mentorPrevQuestion && questionId === mentorPrevQuestion.id) {
      setShowMentor(value === 'Yes')
    }
  }

  function handleMultiSelect(questionId: string, option: string) {
    const current = answers[questionId] ?? []
    const updated = current.includes(option)
      ? current.filter((o: string) => o !== option)
      : [...current, option]
    handleAnswerChange(questionId, updated)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (emailError) return
    setSubmitting(true)
    setError('')

    const formattedAnswers = questions
      .filter(q => q.sort_order > 4)
       .filter(q => q.question_text !== 'Which mentor(s) have you worked with?' || showMentor)
      .flatMap(q => {
        const value = answers[q.id]
        if (Array.isArray(value)) {
          return value.map((v: string) => ({ questionId: q.id, answer: v }))
        }
        return [{ questionId: q.id, answer: value ?? '' }]
      })

    const res = await fetch('/api/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName,
        lastName,
        studentEmail: email,
        studentPhone: phone,
        answers: formattedAnswers,
      }),
    })

    setSubmitting(false)

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Something went wrong. Please try again.')
      return
    }

    setSubmitted(true)
  }

  if (submitted) {
    return (
      <main style={{ maxWidth: 560, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <div style={{
          background: '#E1F5EE',
          border: '0.5px solid #5DCAA5',
          borderRadius: 12,
          padding: '2rem',
        }}>
          <p style={{ fontSize: 22, fontWeight: 500, margin: '0 0 8px', color: '#085041' }}>
            You're checked in!
          </p>
         <p style={{ fontSize: 13, color: '#0F6E56', margin: 0 }}>
            A mentor will be with you shortly. Please have a seat and wait to be called.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main style={{ maxWidth: 680, margin: '0 auto', padding: '2rem 1rem' }}>
      <Link href="/" style={{ fontSize: 13, color: '#888780', textDecoration: 'none', display: 'block', marginBottom: 20 }}>
        ← Back to home
      </Link>

      <h1 style={{ fontSize: 22, fontWeight: 500, margin: '0 0 12px' }}>
        In-Person Check-In
      </h1>
      <p style={{ margin: '0 0 20px' }}>
        Welcome! Please fill out this short form to check in for in-person essay mentoring.
        A mentor will be with you shortly.
      </p>

      {error && (
        <div style={{ background: '#FCEBEB', border: '0.5px solid #F09595', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#791F1F' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#5F5E5A', marginBottom: 4 }}>
            Email Address <span style={{ color: '#E24B4A' }}>*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={e => { setEmail(e.target.value); validateEmail(e.target.value) }}
placeholder="you@example.com"
            required
            style={{ borderColor: emailError ? '#E24B4A' : undefined }}
          />
          {emailError && <p style={{ fontSize: 12, color: '#E24B4A', margin: '4px 0 0' }}>{emailError}</p>}
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#5F5E5A', marginBottom: 4 }}>
            First Name <span style={{ color: '#E24B4A' }}>*</span>
          </label>
          <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} required />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#5F5E5A', marginBottom: 4 }}>
            Last Name <span style={{ color: '#E24B4A' }}>*</span>
          </label>
          <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} required />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#5F5E5A', marginBottom: 4 }}>
            Cell Phone with Area Code
          </label>
          <input
            type="tel"
            value={phone}
            onChange={e => {
              const digits = e.target.value.replace(/\D/g, '').slice(0, 10)
              let formatted = ''
              if (digits.length <= 3) formatted = digits.length ? `(${digits}` : ''
              else if (digits.length <= 6) formatted = `(${digits.slice(0, 3)})${digits.slice(3)}`
              else formatted = `(${digits.slice(0, 3)})${digits.slice(3, 6)}-${digits.slice(6)}`
              setPhone(formatted)
            }}
            placeholder="(510)555-0100"
          />
        </div>

       {questions
          .filter(q => q.sort_order > 4)
          .filter(q => q.question_text !== 'Which mentor(s) have you worked with?' || showMentor)
          .sort((a, b) => a.sort_order - b.sort_order)
          .map(q => (
            <div key={q.id} style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#5F5E5A', marginBottom: 4 }}>
                {q.question_text} {q.is_required && <span style={{ color: '#E24B4A' }}>*</span>}
              </label>

              {q.question_type === 'select' && q.options && (
                <select
                  value={answers[q.id] ?? ''}
                  onChange={e => handleAnswerChange(q.id, e.target.value)}
                  required={q.is_required}
                >
                  <option value="">Select an option</option>
                  {q.options.map((opt: string) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              )}

              {q.question_type === 'text' && (
                <input
                  type="text"
                  value={answers[q.id] ?? ''}
                  onChange={e => handleAnswerChange(q.id, e.target.value)}
                  required={q.is_required}
                />
              )}

              {q.question_type === 'multiselect' && q.options && (
                <div style={{ border: '0.5px solid #D3D1C7', borderRadius: 8, padding: '8px 12px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {q.options.map((opt: string) => {
                    const selected = (answers[q.id] ?? []).includes(opt)
                    return (
                      <label key={opt} style={{
                        display: 'flex', alignItems: 'center', gap: 6, fontSize: 13,
                        cursor: 'pointer', padding: '4px 10px', borderRadius: 20,
                        background: selected ? '#EEEDFE' : '#F1EFE8',
                        border: `0.5px solid ${selected ? '#534AB7' : '#D3D1C7'}`,
                        color: selected ? '#3C3489' : '#5F5E5A',
                      }}>
                       <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => handleMultiSelect(q.id, opt)}
                          style={{ width: 'auto', margin: 0 }}
                          title={getDetailInParens(opt)}
                        />
                        <span title={getDetailInParens(opt)}>{shortenLabel(opt)}</span>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
          ))}

        <button
          type="submit"
          disabled={submitting || !!emailError || !email || !firstName || !lastName}
          style={{ width: '100%', background: '#534AB7', color: '#ffffff', border: 'none' }}
        >
          {submitting ? 'Checking in...' : 'Check in'}
        </button>
      </form>
    </main>
  )
}