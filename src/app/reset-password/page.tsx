'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
  const [password,        setPassword]        = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error,           setError]           = useState('')
  const [success,         setSuccess]         = useState(false)
  const [loading,         setLoading]         = useState(false)
  const [ready,           setReady]           = useState(false)
  const supabase = createClient()
  const router   = useRouter()

 useEffect(() => {
   async function setupSession() {
      // Handle hash-based tokens (recovery and invite flows)
      const hash = window.location.hash
      console.log('Hash:', hash.slice(0, 50))
      if (hash.includes('access_token')) {
        const params = new URLSearchParams(hash.slice(1))
        const accessToken = params.get('access_token') ?? ''
        const refreshToken = params.get('refresh_token') ?? ''
        console.log('Access token exists:', !!accessToken, 'Refresh token exists:', !!refreshToken)
        const { data, error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        console.log('setSession result - session:', !!data.session, 'error:', error?.message)
        if (data.session) {
          setReady(true)
          return
        }
      }

      // For implicit flow — Supabase auto-parses the hash token
      const { data: { session } } = await supabase.auth.getSession()

      if (session) {
        setReady(true)
        return
      }

      // For PKCE flow fallback — exchange code if present
      const params = new URLSearchParams(window.location.search)
      const code   = params.get('code')
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
        if (exchangeError) {
          setError('This reset link is invalid or has expired. Please request a new one.')
        }
        setReady(true)
        return
      }

      // Wait briefly for Supabase to process hash token
      setTimeout(async () => {
        const { data: { session: delayedSession } } = await supabase.auth.getSession()
        if (!delayedSession) {
          setError('This reset link is invalid or has expired. Please request a new one.')
        }
        setReady(true)
      }, 1000)
    }
    setupSession()
  }, [])

  async function handleReset() {
    if (!password || !confirmPassword) {
      setError('Please fill in both fields.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)
    setError('')

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setTimeout(() => router.push('/login'), 3000)
  }
if (!ready) {
    return (
      <main style={{ maxWidth: 400, margin: '4rem auto', padding: '0 1rem', textAlign: 'center' }}>
        <p style={{ color: '#888780', fontSize: 14 }}>Loading...</p>
      </main>
    )
  }

  if (success) {
    return (
      <main style={{ maxWidth: 400, margin: '4rem auto', padding: '0 1rem', textAlign: 'center' }}>
        <div style={{ background: '#E1F5EE', border: '0.5px solid #5DCAA5', borderRadius: 12, padding: '2rem' }}>
          <p style={{ fontSize: 18, fontWeight: 500, color: '#085041', margin: '0 0 8px' }}>Password updated!</p>
          <p style={{ fontSize: 13, color: '#085041', margin: 0 }}>Redirecting you to login...</p>
        </div>
      </main>
    )
  }

  return (
    <main style={{ maxWidth: 400, margin: '4rem auto', padding: '0 1rem' }}>
      <div style={{ background: '#ffffff', border: '0.5px solid #e8e6de', borderRadius: 12, padding: '2rem' }}>
        <h1 style={{ fontSize: 20, fontWeight: 500, margin: '0 0 4px' }}>Reset your password</h1>
        <p style={{ fontSize: 13, color: '#888780', margin: '0 0 20px' }}>
          OT College Essay Mentor Program
        </p>

        {error && (
          <p style={{ fontSize: 13, color: '#791F1F', background: '#FCEBEB', border: '0.5px solid #F09595', borderRadius: 8, padding: '8px 12px', marginBottom: 14 }}>
            {error}
          </p>
        )}

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#5F5E5A', marginBottom: 4 }}>
            New password
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            style={{ width: '100%', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#5F5E5A', marginBottom: 4 }}>
            Confirm new password
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            placeholder="Repeat your new password"
            style={{ width: '100%', boxSizing: 'border-box' }}
          />
        </div>

        <button
          onClick={handleReset}
          disabled={loading}
          style={{
            width: '100%', padding: '10px', fontSize: 14, fontWeight: 500,
            background: password && confirmPassword ? '#534AB7' : undefined,
            color: password && confirmPassword ? '#ffffff' : undefined,
            border: password && confirmPassword ? 'none' : undefined,
          }}
        >
          {loading ? 'Updating...' : 'Set new password'}
        </button>
      </div>
    </main>
  )
}