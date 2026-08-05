'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function VerifyContent() {
  const [code,    setCode]    = useState('')
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const urlCode = searchParams.get('code')
    if (urlCode) {
      const entered = urlCode.trim().toUpperCase()
      if (entered === process.env.NEXT_PUBLIC_BOOKING_CODE?.toUpperCase()) {
localStorage.setItem('booking_verified', process.env.NEXT_PUBLIC_BOOKING_CODE!)
        router.push('/book')
      } else if (entered === process.env.NEXT_PUBLIC_CHECKIN_CODE?.toUpperCase()) {
localStorage.setItem('checkin_verified', process.env.NEXT_PUBLIC_CHECKIN_CODE!)
        router.push('/checkin')
      }
    }
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const entered = code.trim().toUpperCase()

   if (entered === process.env.NEXT_PUBLIC_BOOKING_CODE?.toUpperCase()) {
      localStorage.setItem('booking_verified', process.env.NEXT_PUBLIC_BOOKING_CODE!)
      router.push('/book')
    } else if (entered === process.env.NEXT_PUBLIC_CHECKIN_CODE?.toUpperCase()) {
      localStorage.setItem('checkin_verified', process.env.NEXT_PUBLIC_CHECKIN_CODE!)
      router.push('/checkin')
    } else {
      setError('Incorrect code. Please check with your teacher and try again.')
      setLoading(false)
    }
  }

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#582C83', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: 440, textAlign: 'center' }}>
        
        <img src="/bulldog.png" alt="Oakland Tech Bulldog" style={{ width: 150, marginBottom: 16 }} />

        <h1 style={{ fontSize: 36, fontWeight: 700, color: '#ffffff', margin: '0 0 16px', lineHeight: 1.2 }}>
          Got College Essays?<br />Get Help!
        </h1>

        <p style={{ fontSize: 16, color: '#EEEDFE', margin: '0 0 32px', lineHeight: 1.6 }}>
          Oakland Tech Seniors, sign up here for a free, online appointment with an Oakland Tech College Essay Mentor.
        </p>

        <div style={{ background: '#ffffff', borderRadius: 12, padding: '2rem' }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
            <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder="Enter sign up code"
                required
                autoFocus
                style={{ width: '100%', boxSizing: 'border-box', textTransform: 'uppercase', letterSpacing: '.1em', fontSize: 18, textAlign: 'center' }}
              />
            </div>

            {error && (
              <div style={{ background: '#FCEBEB', border: '0.5px solid #F09595', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#791F1F' }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={{ width: '100%', background: '#582C83', color: '#ffffff', border: 'none', fontSize: 16, padding: '12px' }}>
              {loading ? 'Verifying...' : 'Enter'}
            </button>
          </form>
        </div>

        <p style={{ fontSize: 13, color: '#EEEDFE', margin: '24px 0 0', lineHeight: 1.6 }}>
          Looking for an in-person appointment with a Oakland Tech College Essay Mentor in the CCC?<br />
          Check the CCC's Google Classroom for hours.
        </p>

      </div>
    </main>
  )
}

export default function VerifyPage() {
  return (
    <Suspense>
      <VerifyContent />
    </Suspense>
  )
}