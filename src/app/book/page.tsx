'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import Link from 'next/link'
import Script from 'next/script'
import { formatTimePST } from '@/lib/utils'

type Slot = {
  id: string
  start_time: string
  end_time: string
  duration_minutes: number
  meeting_type: string
  mentor_profiles: {
    full_name: string
    department: string
  }
}

type Question = {
  id: string
  question_text: string
  question_type: string
  options: string[] | null
  is_required: boolean
  sort_order: number
  question_key?: string
}

const OPTIONAL_START = 10

function shortenLabel(label: string) {
  return label.split(' (')[0]
}

function getDetailInParens(label: string) {
  const match = label.match(/\(([^)]+)\)/)
  return match ? match[1] : ''
}

export default function BookPage() {
  const router = useRouter()
  const [slots,        setSlots]        = useState<Record<string, Slot[]>>({})
  const [total,        setTotal]        = useState(0)
  const [questions,    setQuestions]    = useState<Question[]>([])
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [typeFilter,   setTypeFilter]   = useState<string | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [submitting,   setSubmitting]   = useState(false)
  const [submitted,    setSubmitted]    = useState(false)
  const [confirmCode,  setConfirmCode]  = useState('')
  const [error,        setError]        = useState('')
  const [firstName,    setFirstName]    = useState('')
  const [lastName,     setLastName]     = useState('')
  const [email,        setEmail]        = useState('')
  const [isReturning, setIsReturning] = useState(false)
  const [emailError,   setEmailError]   = useState('')
  const [phoneError,   setPhoneError]   = useState('')
  const [phone,        setPhone]        = useState('')
  const [smsConsent,   setSmsConsent]   = useState(false)
  const [answers,      setAnswers]      = useState<Record<string, any>>({})
  const [showMentor,   setShowMentor]   = useState(false)
  const formRef = useRef<HTMLDivElement>(null)
  const errorRef = useRef<HTMLDivElement>(null)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)

  useEffect(() => {
    (window as any).onTurnstileSuccess = (token: string) => {
      console.log('Turnstile token received:', token ? 'yes' : 'no')
      setTurnstileToken(token)
      const errEl = document.getElementById('turnstile-error')
      if (errEl) errEl.style.display = 'none'
    }
    ;(window as any).onTurnstileError = () => {
      const errEl = document.getElementById('turnstile-error')
      if (errEl) errEl.style.display = 'block'
    }
  }, [])

 useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const urlCode = params.get('code')

    if (urlCode && urlCode.toUpperCase() === process.env.NEXT_PUBLIC_BOOKING_CODE?.toUpperCase()) {
      sessionStorage.setItem('booking_verified', 'true')
      return
    }

    const verified = sessionStorage.getItem('booking_verified')
    if (!verified) {
      router.push('/verify')
      return
    }
  }, [])

  useEffect(() => {
    const params = typeFilter ? `?type=${typeFilter}` : ''
    fetch(`/api/slots/available${params}`)
      .then(r => r.json())
      .then(data => {
        setSlots(data.slots ?? {})
        setTotal(data.total ?? 0)
        setLoading(false)
      })
    fetch('/api/bookings/questions')
      .then(r => r.json())
      .then(setQuestions)
  }, [typeFilter])

 const nowPST = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }))
  const isPast10pm = nowPST.getHours() >= 22
  const daysToAdd = isPast10pm ? 2 : 1

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + daysToAdd + i)
    return d.toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' })
  })

  function selectSlot(slot: Slot) {
    setSelectedSlot(slot)
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }

 function validateEmail(v: string) {
    if (!v) { setEmailError(''); setIsReturning(false); return }
    if (!/^[^\s@]+@gmail\.com$/i.test(v)) {
      setEmailError('Please use a Gmail address (@gmail.com)')
      setIsReturning(false)
    } else {
      setEmailError('')
      checkReturningStudent(v)
    }
  }

  async function checkReturningStudent(emailToCheck: string) {
    try {
      const res = await fetch(`/api/bookings/check-returning?email=${encodeURIComponent(emailToCheck)}`)
      const data = await res.json()
    if (data.isReturning) {
        setIsReturning(true)
        setFirstName(data.firstName)
        setLastName(data.lastName)
        if (data.phone) setPhone(data.phone)
        setSmsConsent(!!data.smsConsent)
      } else {
        setIsReturning(false)
      }
    } catch {
      setIsReturning(false)
    }
  }

 function handleAnswerChange(questionId: string, value: any) {
    setAnswers(prev => ({ ...prev, [questionId]: value }))
   const mentorPrevQuestion = questions.find(q => q.question_text === 'I worked with a College Essay Mentor in Spring 2026 through this program')
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
    if (!selectedSlot) return
    if (emailError) return
    setSubmitting(true)
    setError('')

    if (!turnstileToken) {
      setError('Please wait for the security check to complete.')
      setSubmitting(false)
      return
    }

   const formattedAnswers = questions
      .filter(q => {
        if (q.sort_order <= 4) return false
if (q.question_text === 'I worked with a College Essay Mentor in Spring 2026 through this program' && isReturning) return false
if (q.question_text === 'Which mentor have you worked with?' && !showMentor && !isReturning) return false
        return true
                  })
    .flatMap(q => {
        const value = answers[q.id]
        if (Array.isArray(value)) {
          // Multiselect — create one answer entry per selected option
          return value.map((v: string) => {
            // If "Other" is selected, append the free text
            if (v === 'Other' && answers[`${q.id}_other`]) {
              return { questionId: q.id, answer: `Other: ${answers[`${q.id}_other`]}` }
            }
            return { questionId: q.id, answer: v }
          })
        }
        return [{
          questionId: q.id,
          answer: value ?? '',
        }]
      })

    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slotId:         selectedSlot.id,
        firstName,
        lastName,
        studentEmail:   email,
        studentPhone:   phone,
        smsConsent,
        answers:        formattedAnswers,
        turnstileToken,
      }),
    })

    const data = await res.json()
    setSubmitting(false)

    if (!res.ok) {
      setError(data.error ?? 'Something went wrong. Please try again.')
      if (res.status === 409 && data.error?.includes('slot was just booked')) {
        fetch('/api/slots/available')
          .then(r => r.json())
          .then(d => { setSlots(d.slots ?? {}); setTotal(d.total ?? 0) })
        setSelectedSlot(null)
      }
      setTimeout(() => {
        errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 100)
      return
    }

    setConfirmCode(data.confirmationCode)
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <main style={{ maxWidth: 560, margin: '0 auto', padding: '2rem 1rem' }}>
        <div style={{
          background: '#E1F5EE',
          border: '0.5px solid #5DCAA5',
          borderRadius: 12,
          padding: '2rem',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: 22, fontWeight: 500, margin: '0 0 8px', color: '#085041' }}>
            You're booked!
          </p>
          <p style={{ fontSize: 14, color: '#0F6E56', margin: '0 0 16px' }}>
Your appointment with {selectedSlot?.mentor_profiles?.full_name?.split(' ')[0]} is confirmed.          </p>
          <p style={{ fontSize: 14, color: '#0F6E56', margin: '0 0 8px' }}>
            {selectedSlot && format(parseISO(selectedSlot.start_time), 'EEEE, MMMM d')} at{' '}
            {selectedSlot && format(parseISO(selectedSlot.start_time), 'h:mm a')}
          </p>
          <p style={{ fontSize: 13, color: '#0F6E56', margin: '12px 0 0' }}>
            A confirmation email has been sent to {email}
          </p>
       </div>
      </main>
    )
  }

  return (
    <main style={{ maxWidth: 680, margin: '0 auto', padding: '2rem 1rem' }}>
      <Link href="/" style={{ 
        fontSize: 13, color: '#888780', textDecoration: 'none', 
        display: 'block', marginBottom: 20 
      }}>
        ← Back to home
      </Link>

      <div style={{ marginBottom: 24 }}>
  <h1 style={{ fontSize: 22, fontWeight: 500, margin: '0 0 12px' }}>
    Fall 2026 College Essay Mentor Sign-Up
  </h1>
  
    <p style={{ margin: '0 0 12px', fontWeight: 500 }}>
      Oakland Tech Seniors, let's get these essays done!
    </p>
    <p style={{ margin: '0 0 12px' }}>
      Use this form to sign up for a FREE virtual appointment with a College Essay Mentor
      to work on your essays! We will confirm your appointment via
      email with a Google Meet link 
      and ability to share access to the PIQ / essay if you have one.
    </p>
    <p style={{ margin: '0 0 12px' }}>
      One appointment per student at a time only. Please complete your appointment before booking a new one.
    </p>
    <p style={{ margin: 0, fontSize: 13, color: '#888780' }}>
      {total} open slot{total !== 1 ? 's' : ''} available in the next 7 days
    </p>
  </div>

      {loading ? (
        <p style={{ color: '#888780', fontSize: 13 }}>Loading available slots...</p>
      ) : total === 0 ? (
        <div style={{
          background: '#F1EFE8',
          borderRadius: 12,
          padding: '2rem',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: 14, color: '#5F5E5A', margin: 0 }}>
            No appointments available in the next 7 days. Please check back soon.
          </p>
        </div>
      ) : (
        days.map(dateKey => (
          <div key={dateKey} style={{ marginBottom: 20 }}>
            <p style={{
              fontSize: 15, fontWeight: 600, letterSpacing: '.02em',
              textTransform: 'uppercase', color: '#2C2C2A',
              borderBottom: '0.5px solid #e8e6de',
              paddingBottom: 8, marginBottom: 10,
            }}>
              {format(parseISO(dateKey), 'EEEE, MMM d')}
            </p>

            {(slots[dateKey] ?? []).length === 0 ? (
              <p style={{ fontSize: 13, color: '#B4B2A9' }}>No open slots this day</p>
            ) : (
              (slots[dateKey] ?? []).map(slot => (
                <div
                  key={slot.id}
                  onClick={() => selectSlot(slot)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 12px', marginBottom: 6, cursor: 'pointer',
                    border: `0.5px solid ${selectedSlot?.id === slot.id ? '#534AB7' : '#e8e6de'}`,
                    background: selectedSlot?.id === slot.id ? '#EEEDFE' : '#ffffff',
                    borderRadius: 10,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontWeight: 500, fontSize: 13 }}>
{slot.mentor_profiles?.full_name?.split(' ')[0] ?? 'Mentor'}
                    </p>
                    <p style={{ margin: 0, fontSize: 12, color: '#888780' }}>
                  {formatTimePST(slot.start_time)} –{' '}
                      {formatTimePST(slot.end_time)}

                      {slot.mentor_profiles?.department ? ` · ${slot.mentor_profiles.department}` : ''}
                    </p>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); selectSlot(slot) }}
                    style={{ fontSize: 12, padding: '5px 14px', background: '#534AB7', color: '#ffffff', border: 'none' }}
                  >
                    Book
                  </button>
                </div>
              ))
            )}
          </div>
        ))
      )}

      {selectedSlot && (
        <div ref={formRef} style={{
          marginTop: 24,
          border: '0.5px solid #534AB7',
          borderRadius: 12,
          padding: '1.25rem',
          background: '#ffffff',
        }}>
          <p style={{ fontWeight: 500, fontSize: 15, margin: '0 0 4px' }}>
Booking Virtual Appointment with {selectedSlot.mentor_profiles?.full_name?.split(' ')[0] ?? 'Mentor'}

          </p>
          <p style={{ fontSize: 13, color: '#888780', margin: '0 0 20px' }}>
            {format(parseISO(selectedSlot.start_time), 'EEEE, MMMM d')} at{' '}
            {format(parseISO(selectedSlot.start_time), 'h:mm a')} –{' '}
            {format(parseISO(selectedSlot.end_time), 'h:mm a')}
          </p>

          <div style={{
            background: '#F1EFE8',
            borderRadius: 8,
            padding: '12px 14px',
            marginBottom: 20,
            fontSize: 13,
            color: '#5F5E5A',
            lineHeight: 1.6,
          }}>
            Please fill out all required fields to complete your booking.
            Your information will only be used for program purposes.
          </div>

          <form onSubmit={handleSubmit}>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#5F5E5A', marginBottom: 4 }}>
                Email Address <span style={{ color: '#E24B4A' }}>*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); validateEmail(e.target.value) }}
                placeholder="you@gmail.com"
                required
                style={{ borderColor: emailError ? '#E24B4A' : undefined }}
              />
            {emailError && (
                <p style={{ fontSize: 12, color: '#E24B4A', margin: '4px 0 0' }}>{emailError}</p>
              )}
              <p style={{ fontSize: 11, color: '#B4B2A9', margin: '4px 0 0' }}>
                A Gmail address is required
              </p>
              {isReturning && (
                <div style={{ background: '#E1F5EE', border: '0.5px solid #5DCAA5', borderRadius: 8, padding: '8px 12px', marginTop: 8, fontSize: 12, color: '#085041' }}>
                  Welcome back, {firstName}! We've filled in info from your last booking. Please update us with any changes.
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#5F5E5A', marginBottom: 4 }}>
                  First Name <span style={{ color: '#E24B4A' }}>*</span>
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  placeholder="First name"
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#5F5E5A', marginBottom: 4 }}>
                  Last Name <span style={{ color: '#E24B4A' }}>*</span>
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  placeholder="Last name"
                  required
                />
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#5F5E5A', marginBottom: 4 }}>
                Cell Phone with Area Code <span style={{ color: '#E24B4A' }}>*</span>
              </label>
              <input
  type="tel"
  value={phone}
  onChange={e => {
  const digits = e.target.value.replace(/\D/g, '').slice(0, 10)
  
  // Format as (xxx)xxx-xxxx
  let formatted = ''
  if (digits.length <= 3) {
    formatted = digits.length ? `(${digits}` : ''
  } else if (digits.length <= 6) {
    formatted = `(${digits.slice(0, 3)})${digits.slice(3)}`
  } else {
    formatted = `(${digits.slice(0, 3)})${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  
  setPhone(formatted)
  if (digits.length > 0 && digits.length < 10) {
    setPhoneError('Please enter a 10-digit phone number')
  } else {
    setPhoneError('')
  }
}}
placeholder="(510)555-5555"
  required
  style={{ borderColor: phoneError ? '#E24B4A' : undefined }}
/>
{phoneError && (
  <p style={{ fontSize: 12, color: '#E24B4A', margin: '4px 0 0' }}>
    {phoneError}
  </p>
)}
             {phone && (
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: '#5F5E5A', marginTop: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={smsConsent}
                    onChange={e => setSmsConsent(e.target.checked)}
                    style={{ width: 'auto', marginTop: 2, flexShrink: 0 }}
                  />
                  <span>
                    By signing up, you agree to receive SMS messages from the Oakland Tech College Essay Mentor Program. Message frequency varies. Message and data rates may apply. Reply HELP for help or STOP to opt-out. See our{' '}
                    <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: '#534AB7' }}>
                      Terms, Conditions & Privacy Policy
                    </a>.
                  </span>
                </label>
              )}
            </div>

         {questions
              .filter(q => {
                if (q.sort_order <= 4) return false
                if (q.question_text === 'I worked with a College Essay Mentor in Spring 2026 through this program' && isReturning) return false
if (q.question_text === 'Which mentor have you worked with?' && !showMentor) 
  return false                
        if (isReturning) {
          const alwaysAskKeys = ['which_mentor', 'help_with', 'private_counselor']
          if (!q.question_key || !alwaysAskKeys.includes(q.question_key)) return false
        }
        return true
              })
              .map(q => {
const isOptional = !q.is_required
                const showOptionalHeader = q.sort_order === OPTIONAL_START

                return (
                  <div key={q.id}>
                    {showOptionalHeader && (
                      <div style={{
                        background: '#F1EFE8',
                        borderRadius: 8,
                        padding: '10px 14px',
                        marginBottom: 16,
                        marginTop: 8,
                        fontSize: 13,
                        color: '#5F5E5A',
                        lineHeight: 1.6,
                      }}>
                        The following questions help us compile statistics about who we are helping.
                        Your personal information will not be shared.
                      </div>
                    )}

                    <div style={{ marginBottom: 14 }}>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#5F5E5A', marginBottom: 4 }}>
                        {q.question_text}
                        {q.is_required && !isOptional && <span style={{ color: '#E24B4A' }}> *</span>}
                        {isOptional && <span style={{ color: '#B4B2A9', fontWeight: 400 }}> (optional)</span>}
                      </label>

                      {q.question_type === 'text' && (
                        <input
                          type="text"
                          value={answers[q.id] ?? ''}
                          onChange={e => handleAnswerChange(q.id, e.target.value)}
                          required={q.is_required && !isOptional}
                        />
                      )}

                      {q.question_type === 'textarea' && (
                        <textarea
                          value={answers[q.id] ?? ''}
                          onChange={e => handleAnswerChange(q.id, e.target.value)}
                          rows={3}
                          required={q.is_required && !isOptional}
                          style={{ resize: 'vertical' }}
                        />
                      )}

                      {q.question_type === 'select' && q.options && (
                        <select
                          value={answers[q.id] ?? ''}
                          onChange={e => handleAnswerChange(q.id, e.target.value)}
                          required={q.is_required && !isOptional}
                        >
                          <option value="">Select an option</option>
                          {q.options.map((opt: string) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      )}

                      {q.question_type === 'multiselect' && q.options && (
                        <div style={{
                          border: '0.5px solid #D3D1C7',
                          borderRadius: 8,
                          padding: '8px 12px',
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 8,
                        }}>
                          {q.options.map((opt: string) => {
                            const selected = (answers[q.id] ?? []).includes(opt)
                            return (
                              <label
                                key={opt}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  fontSize: 13,
                                  cursor: 'pointer',
                                  padding: '4px 10px',
                                  borderRadius: 20,
                                  background: selected ? '#EEEDFE' : '#F1EFE8',
                                  border: `0.5px solid ${selected ? '#534AB7' : '#D3D1C7'}`,
                                  color: selected ? '#3C3489' : '#5F5E5A',
                                }}
                              >
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
                        {(answers[q.id] ?? []).includes('Other') && (
                          <input
                            type="text"
                            placeholder="Please specify other..."
                            value={answers[`${q.id}_other`] ?? ''}
                            onChange={e => handleAnswerChange(`${q.id}_other`, e.target.value)}
                            style={{ width: '100%', boxSizing: 'border-box', marginTop: 8 }}
                          />
                        )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}

            {error && (
  <div ref={errorRef} style={{
    background: '#FCEBEB',
                border: '0.5px solid #F09595',
                borderRadius: 8,
                padding: '10px 14px',
                marginBottom: 16,
                fontSize: 13,
                color: '#791F1F',
              }}>
                {error}
              </div>
            )}
<div
              className="cf-turnstile"
              data-sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
              data-callback="onTurnstileSuccess"
              data-refresh-expired="auto"
              data-retry="auto"
              data-retry-interval="5000"
              data-error-callback="onTurnstileError"
              style={{ marginBottom: 12 }}
            />
           <p id="turnstile-error" style={{ display: 'none', fontSize: 12, color: '#791F1F', marginBottom: 8 }}>
              Security check failed. <a href="#" onClick={e => { e.preventDefault(); window.location.reload() }} style={{ color: '#534AB7' }}>Click here to refresh the page and try again.</a>
            </p>
            <p style={{ fontSize: 11, color: '#B4B2A9', marginBottom: 8 }}>
              If the security check gets stuck, please wait 5 seconds for it to refresh automatically.
            </p>

            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button
                type="submit"
                disabled={submitting || !!emailError || !!phoneError || !email || !firstName || !lastName || !phone}
style={{ flex: 1, background: '#534AB7', color: '#ffffff', border: 'none' }}
              >                {submitting ? 'Booking...' : 'Confirm booking'}
              </button>
              <button
                type="button"
                onClick={() => setSelectedSlot(null)}
                style={{ padding: '0 16px' }}
              >
                Cancel
              </button>
            </div>
<Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async />
          </form>
        </div>
      )}
    </main>
  )
}