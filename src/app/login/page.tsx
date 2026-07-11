'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email,       setEmail]       = useState('')
  const [password,    setPassword]    = useState('')
  const [showPass,    setShowPass]    = useState(false)
  const [error,       setError]       = useState('')
  const [loading,     setLoading]     = useState(false)
  const [resetSent,   setResetSent]   = useState(false)
  const [resetMode,   setResetMode]   = useState(false)
  const router   = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError('Invalid email or password. Please try again.')
      setLoading(false)
      return
    }

   let { data: mentor } = await supabase
      .from('mentor_profiles')
      .select('id')
      .eq('auth_user_id', data.user.id)
      .single()

   // If no profile found by auth_user_id, try linking by email via API
    if (!mentor) {
const { data: { session } } = await supabase.auth.getSession()
      const linkRes = await fetch('/api/admin/mentors/link', { 
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}` }
      })
            const linkData = await linkRes.json()
      if (linkData.linked) {
        mentor = { id: linkData.profileId }
      }
    }

    if (data.user.app_metadata?.role === 'admin') {
      router.push('/admin')
    } else if (mentor) {
      router.push('/mentor/dashboard')
    } else {
      setError('No account found. Please contact your program coordinator.')
      setLoading(false)
    }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault()
    if (!email) {
      setError('Please enter your email address first.')
      return
    }
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
redirectTo: `${window.location.origin}/reset-password`,
    })

    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    setResetSent(true)
  }

  if (resetSent) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f4f0', padding: '1rem' }}>
        <div style={{ background: '#E1F5EE', border: '0.5px solid #5DCAA5', borderRadius: 12, padding: '2rem', width: '100%', maxWidth: 400, textAlign: 'center' }}>
          <p style={{ fontSize: 16, fontWeight: 500, color: '#085041', margin: '0 0 8px' }}>Check your email</p>
          <p style={{ fontSize: 14, color: '#0F6E56', margin: '0 0 16px', lineHeight: 1.6 }}>
            We sent a password reset link to <strong>{email}</strong>.
            Click the link in the email to set a new password.
          </p>
          <button onClick={() => { setResetSent(false); setResetMode(false) }} style={{ fontSize: 13 }}>
            Back to sign in
          </button>
        </div>
      </main>
    )
  }

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f4f0', padding: '1rem' }}>
      <div style={{ background: '#ffffff', border: '0.5px solid #e8e6de', borderRadius: 12, padding: '2rem', width: '100%', maxWidth: 400 }}>

        <div style={{ marginBottom: 24, textAlign: 'center' }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, margin: '0 0 6px', color: '#2C2C2A' }}>
            Oakland Tech<br />College Essay Mentor Program
          </h1>
          <p style={{ fontSize: 14, color: '#888780', margin: 0 }}>
            {resetMode ? 'Reset your password' : 'Sign in to your account'}
          </p>
        </div>

        <form onSubmit={resetMode ? handleForgotPassword : handleLogin}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#5F5E5A', marginBottom: 4 }}>
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@email.com"
              required
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          {!resetMode && (
            <div style={{ marginBottom: 8 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#5F5E5A', marginBottom: 4 }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Your password"
                  required
                  style={{ width: '100%', boxSizing: 'border-box', paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{
                    position: 'absolute', right: 10, top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#888780', fontSize: 13, padding: 0,
                  }}
                >
                  {showPass ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
          )}

          {!resetMode && (
            <div style={{ textAlign: 'right', marginBottom: 16 }}>
              <button
                type="button"
                onClick={() => { setResetMode(true); setError('') }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#534AB7', padding: 0 }}
              >
                Forgot your password?
              </button>
            </div>
          )}

          {error && (
            <div style={{ background: '#FCEBEB', border: '0.5px solid #F09595', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#791F1F' }}>
              {error}
            </div>
          )}

<button type="submit" disabled={loading} style={{ width: '100%', background: '#534AB7', color: '#ffffff', border: 'none' }}>            
  {loading ? (resetMode ? 'Sending...' : 'Signing in...') : (resetMode ? 'Send reset link' : 'Sign in')}
          </button>

          {resetMode && (
            <button
              type="button"
              onClick={() => { setResetMode(false); setError('') }}
              style={{ width: '100%', marginTop: 8, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#888780' }}
            >
              Back to sign in
            </button>
          )}
        </form>

        {!resetMode && (
          <p style={{ fontSize: 12, color: '#888780', textAlign: 'center', marginTop: 16, lineHeight: 1.6 }}>
            Don't have an account? Contact your program coordinator to get access.
          </p>
        )}
      </div>
    </main>
  )
}