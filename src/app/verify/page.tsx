'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function VerifyPage() {
  const [code,    setCode]    = useState('')
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
console.log('Entered:', code.trim().toUpperCase(), 'Expected:', process.env.NEXT_PUBLIC_BOOKING_CODE?.toUpperCase())
    if (code.trim().toUpperCase() === process.env.NEXT_PUBLIC_BOOKING_CODE?.toUpperCase()) {
      // Store verification in sessionStorage so booking page knows they're verified
      sessionStorage.setItem('booking_verified', 'true')
      router.push('/book')
    } else {
      setError('Incorrect code. Please check with your teacher and try again.')
      setLoading(false)
    }
  }

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f4f0', padding: '1rem' }}>
      <div style={{ background: '#ffffff', border: '0.5px solid #e8e6de', borderRadius: 12, padding: '2rem', width: '100%', maxWidth: 400 }}>
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 11, fontWeight: 500, letterSpacing: '.06em', textTransform: 'uppercase', color: '#888780', margin: '0 0 4px' }}>
            Oakland Tech
          </p>
          <h1 style={{ fontSize: 20, fontWeight: 500, margin: '0 0 8px' }}>College Essay Mentor Program</h1>
          <p style={{ fontSize: 14, color: '#5F5E5A', margin: 0, lineHeight: 1.6 }}>
            Please enter the access code provided by your teacher to book an appointment.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#5F5E5A', marginBottom: 4 }}>
              Access code
            </label>
            <input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="Enter your access code"
              required
              autoFocus
              style={{ width: '100%', boxSizing: 'border-box', textTransform: 'uppercase', letterSpacing: '.1em' }}
            />
          </div>

         {error && (
            <div style={{ background: '#FCEBEB', border: '0.5px solid #F09595', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#791F1F' }}>
             {error}
            </div>
          )}

<button type="submit" disabled={loading} style={{ width: '100%', background: '#534AB7', color: '#ffffff', border: 'none' }}>            {loading ? 'Verifying...' : 'Continue →'}
          </button>
        </form>
      </div>
    </main>
  )
}