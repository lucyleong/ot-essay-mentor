'use client'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'

export default function AdminPage() {
  const router   = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <main style={{ padding: '2rem' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
      }}>
        <h1 style={{ fontSize: 22, fontWeight: 500 }}>
          Admin Dashboard
        </h1>
        <button onClick={handleSignOut} style={{ fontSize: 12 }}>
          Sign out
        </button>
      </div>
      <p style={{ color: '#888780' }}>
        You are logged in as admin. Full dashboard coming in Phase 9.
      </p>
    </main>
  )
}