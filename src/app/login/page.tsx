'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const router  = useRouter()
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

    // Check if admin or mentor and redirect accordingly
    const { data: mentor } = await supabase
      .from('mentor_profiles')
      .select('id')
      .eq('auth_user_id', data.user.id)
      .single()

    if (data.user.app_metadata?.role === 'admin') {
      router.push('/admin')
    } else if (mentor) {
      router.push('/mentor/dashboard')
    } else {
      setError('No account found. Please contact your program coordinator.')
      setLoading(false)
    }
  }

  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f5f4f0',
      padding: '1rem',
    }}>
      <div style={{
        background: '#ffffff',
        border: '0.5px solid #e8e6de',
        borderRadius: 12,
        padding: '2rem',
        width: '100%',
        maxWidth: 400,
      }}>
        {/* Header */}
        <div style={{ marginBottom: 24, textAlign: 'center' }}>
          <h1 style={{
            fontSize: 22,
            fontWeight: 500,
            margin: '0 0 6px',
            color: '#2C2C2A',
          }}>
            OT College Essay Mentor Program
          </h1>
          <p style={{ fontSize: 14, color: '#888780', margin: 0 }}>
            Sign in to your account
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 14 }}>
            <label style={{
              display: 'block',
              fontSize: 12,
              fontWeight: 500,
              color: '#5F5E5A',
              marginBottom: 4,
            }}>
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

          <div style={{ marginBottom: 20 }}>
            <label style={{
              display: 'block',
              fontSize: 12,
              fontWeight: 500,
              color: '#5F5E5A',
              marginBottom: 4,
            }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Your password"
              required
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          {error && (
            <div style={{
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

          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%' }}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p style={{
          fontSize: 12,
          color: '#888780',
          textAlign: 'center',
          marginTop: 16,
          lineHeight: 1.6,
        }}>
          Don't have an account? Contact your program coordinator to get access.
        </p>
      </div>
    </main>
  )
}