'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'

export default function AdminPage() {
  const [connected, setConnected] = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const router   = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('connected') === 'google') setConnected(true)
    if (params.get('error')) setError(params.get('error'))
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <main style={{ padding: '2rem', maxWidth: 600 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, margin: 0 }}>Admin Dashboard</h1>
        <button onClick={handleSignOut} style={{ fontSize: 12 }}>Sign out</button>
      </div>

      {connected && (
        <div style={{
          background: '#E1F5EE', border: '0.5px solid #5DCAA5',
          borderRadius: 8, padding: '10px 14px', marginBottom: 16,
          fontSize: 13, color: '#085041',
        }}>
          Google Calendar connected successfully!
        </div>
      )}

      {error && (
        <div style={{
          background: '#FCEBEB', border: '0.5px solid #F09595',
          borderRadius: 8, padding: '10px 14px', marginBottom: 16,
          fontSize: 13, color: '#791F1F',
        }}>
          Error: {error}
        </div>
      )}

      <div style={{
        background: '#ffffff', border: '0.5px solid #e8e6de',
        borderRadius: 12, padding: '1.5rem', marginBottom: 12,
      }}>
        <p style={{ fontWeight: 500, fontSize: 14, margin: '0 0 8px' }}>
          Google Calendar
        </p>
        <p style={{ fontSize: 13, color: '#888780', margin: '0 0 16px', lineHeight: 1.6 }}>
          Connect the program Google account to automatically create
          Google Meet links for all appointments.
        </p>
        
          <a
          href="/api/auth/google"
          style={{
            display: 'inline-block',
            background: '#534AB7', color: '#ffffff',
            textDecoration: 'none', fontSize: 13,
            fontWeight: 500, padding: '8px 18px',
            borderRadius: 8,
          }}
        >
          Connect Google Calendar
        </a>
      </div>

      <div style={{
        background: '#ffffff', border: '0.5px solid #e8e6de',
        borderRadius: 12, padding: '1.5rem',
      }}>
        <p style={{ fontWeight: 500, fontSize: 14, margin: '0 0 8px' }}>
          Full admin panel
        </p>
        <p style={{ fontSize: 13, color: '#888780', margin: 0 }}>
          Coming in Phase 9 — mentor management, program sessions, reporting.
        </p>
      </div>
    </main>
  )
}