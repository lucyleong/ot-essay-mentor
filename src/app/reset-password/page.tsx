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
  const supabase = createClient()
  const router   = useRouter()

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