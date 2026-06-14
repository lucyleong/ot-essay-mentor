'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import { format, parseISO } from 'date-fns'

type Mentor = {
  id: string
  full_name: string
  email: string
  is_active: boolean
  created_at: string
}

type Booking = {
  id: string
  student_name: string
  student_email: string
  booked_at: string
  cancelled_at: string | null
  confirmation_code: string
  appointment_slots: any
}

export default function AdminPage() {
  const [activePanel, setActivePanel] = useState('mentors')
  const [mentors,     setMentors]     = useState<Mentor[]>([])
  const [bookings,    setBookings]    = useState<Booking[]>([])
  const [loading,     setLoading]     = useState(true)
  const [connected,   setConnected]   = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  // Add mentor form
  const [newName,     setNewName]     = useState('')
  const [newEmail,    setNewEmail]    = useState('')
  const [adding,      setAdding]      = useState(false)
  const [addError,    setAddError]    = useState('')
  const [addSuccess,  setAddSuccess]  = useState('')

  const router   = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('connected') === 'google') setConnected(true)
    if (params.get('error')) setError(params.get('error'))
    loadData()
  }, [])

  async function loadData() {
    const { data: mentorData } = await supabase
      .from('mentor_profiles')
      .select('id, full_name, email, is_active, created_at')
      .neq('email', 'otessaymentors@gmail.com')
      .order('full_name', { ascending: true })

    setMentors(mentorData ?? [])

    const { data: bookingData } = await supabase
      .from('student_bookings')
      .select(`
        id, student_name, student_email, booked_at, cancelled_at, confirmation_code,
        appointment_slots (
          start_time, meeting_type,
          mentor_profiles ( full_name )
        )
      `)
      .order('booked_at', { ascending: false })
      .limit(100)

    setBookings(bookingData ?? [])
    setLoading(false)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  async function addMentor() {
    if (!newName.trim() || !newEmail.trim()) {
      setAddError('Please fill in both name and email.')
      return
    }
    setAdding(true)
    setAddError('')
    setAddSuccess('')

    const { error } = await supabase
      .from('mentor_profiles')
      .insert({ full_name: newName.trim(), email: newEmail.trim().toLowerCase(), is_active: true })

    setAdding(false)

    if (error) {
      setAddError(error.message)
      return
    }

    setAddSuccess(`${newName} added successfully!`)
    setNewName('')
    setNewEmail('')
    loadData()
  }

  async function toggleMentorActive(mentor: Mentor) {
    await supabase
      .from('mentor_profiles')
      .update({ is_active: !mentor.is_active })
      .eq('id', mentor.id)
    loadData()
  }

  const navItems = [
    { key: 'mentors',  label: 'Mentors' },
    { key: 'bookings', label: 'All bookings' },
    { key: 'calendar', label: 'Google Calendar' },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f5f4f0' }}>

      {/* Sidebar */}
      <div style={{
        width: 200, flexShrink: 0, background: '#ffffff',
        borderRight: '0.5px solid #e8e6de',
        display: 'flex', flexDirection: 'column', padding: '16px 0',
      }}>
        <div style={{ padding: '12px 16px 16px', borderBottom: '0.5px solid #e8e6de', marginBottom: 8 }}>
          <p style={{ fontSize: 13, fontWeight: 500, margin: '0 0 2px' }}>Admin</p>
          <p style={{ fontSize: 11, color: '#888780', margin: 0 }}>OT Essay Mentor Program</p>
        </div>

        {navItems.map(item => (
          <button
            key={item.key}
            onClick={() => setActivePanel(item.key)}
            style={{
              display: 'flex', alignItems: 'center',
              padding: '9px 16px', fontSize: 13, cursor: 'pointer',
              background: activePanel === item.key ? '#f5f4f0' : 'transparent',
              color: activePanel === item.key ? '#2C2C2A' : '#5F5E5A',
              fontWeight: activePanel === item.key ? 500 : 400,
              border: 'none', width: '100%', textAlign: 'left',
            }}
          >
            {item.label}
          </button>
        ))}

        <div style={{ marginTop: 'auto', padding: '12px 16px', borderTop: '0.5px solid #e8e6de' }}>
          <button
            onClick={handleSignOut}
            style={{ fontSize: 12, color: '#888780', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, padding: '24px 28px', minWidth: 0 }}>
        {loading ? (
          <p style={{ color: '#888780' }}>Loading...</p>
        ) : (
          <>
            {/* MENTORS */}
            {activePanel === 'mentors' && (
              <div>
                <h1 style={{ fontSize: 20, fontWeight: 500, margin: '0 0 4px' }}>Mentors</h1>
                <p style={{ fontSize: 13, color: '#888780', margin: '0 0 20px' }}>
                  {mentors.filter(m => m.is_active).length} active mentors
                </p>

                {/* Add mentor form */}
                <div style={{ background: '#ffffff', border: '0.5px solid #e8e6de', borderRadius: 12, padding: '1.25rem', marginBottom: 16 }}>
                  <p style={{ fontWeight: 500, fontSize: 14, margin: '0 0 12px' }}>Add a mentor</p>

                  {addSuccess && (
                    <div style={{ background: '#E1F5EE', border: '0.5px solid #5DCAA5', borderRadius: 8, padding: '8px 12px', marginBottom: 10, fontSize: 13, color: '#085041' }}>
                      {addSuccess}
                    </div>
                  )}
                  {addError && (
                    <div style={{ background: '#FCEBEB', border: '0.5px solid #F09595', borderRadius: 8, padding: '8px 12px', marginBottom: 10, fontSize: 13, color: '#791F1F' }}>
                      {addError}
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, alignItems: 'end' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#5F5E5A', marginBottom: 4 }}>Full name</label>
                      <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Maria Reyes" style={{ width: '100%', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#5F5E5A', marginBottom: 4 }}>Email</label>
                      <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="mentor@email.com" style={{ width: '100%', boxSizing: 'border-box' }} />
                    </div>
                    <button onClick={addMentor} disabled={adding} style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                      {adding ? 'Adding...' : 'Add mentor'}
                    </button>
                  </div>
                </div>

                {/* Mentor list */}
                <div style={{ background: '#ffffff', border: '0.5px solid #e8e6de', borderRadius: 12, padding: '.75rem 1rem' }}>
                  {mentors.map(mentor => (
                    <div key={mentor.id} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 0', borderBottom: '0.5px solid #e8e6de',
                    }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: '#EEEDFE', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: 11, fontWeight: 500,
                        color: '#3C3489', flexShrink: 0,
                      }}>
                        {mentor.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 500, fontSize: 13, margin: '0 0 2px' }}>{mentor.full_name}</p>
                        <p style={{ fontSize: 12, color: '#888780', margin: 0 }}>{mentor.email}</p>
                      </div>
                      <span style={{
                        fontSize: 11, padding: '2px 8px', borderRadius: 20,
                        background: mentor.is_active ? '#E1F5EE' : '#F1EFE8',
                        color: mentor.is_active ? '#085041' : '#5F5E5A',
                      }}>
                        {mentor.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <button
                        onClick={() => toggleMentorActive(mentor)}
                        style={{ fontSize: 12, padding: '4px 10px' }}
                      >
                        {mentor.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ALL BOOKINGS */}
            {activePanel === 'bookings' && (
              <div>
                <h1 style={{ fontSize: 20, fontWeight: 500, margin: '0 0 4px' }}>All bookings</h1>
                <p style={{ fontSize: 13, color: '#888780', margin: '0 0 20px' }}>
                  {bookings.filter(b => !b.cancelled_at).length} active bookings
                </p>

                <div style={{ background: '#ffffff', border: '0.5px solid #e8e6de', borderRadius: 12, padding: '.75rem 1rem' }}>
                  {bookings.map(booking => (
                    <div key={booking.id} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 0', borderBottom: '0.5px solid #e8e6de',
                    }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 500, fontSize: 13, margin: '0 0 2px' }}>{booking.student_name}</p>
                        <p style={{ fontSize: 12, color: '#888780', margin: 0 }}>
                          {booking.student_email} ·{' '}
                          {(booking.appointment_slots as any)?.mentor_profiles?.full_name?.split(' ')[0]} ·{' '}
                          {(booking.appointment_slots as any)?.start_time
                            ? format(parseISO((booking.appointment_slots as any).start_time), 'MMM d · h:mm a')
                            : 'No slot'}
                        </p>
                      </div>
                      <span style={{
                        fontSize: 11, padding: '2px 8px', borderRadius: 20,
                        background: booking.cancelled_at ? '#F1EFE8' : '#E1F5EE',
                        color: booking.cancelled_at ? '#5F5E5A' : '#085041',
                      }}>
                        {booking.cancelled_at ? 'Cancelled' : 'Active'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* GOOGLE CALENDAR */}
            {activePanel === 'calendar' && (
              <div>
                <h1 style={{ fontSize: 20, fontWeight: 500, margin: '0 0 4px' }}>Google Calendar</h1>
                <p style={{ fontSize: 13, color: '#888780', margin: '0 0 20px' }}>
                  Connect the program Google account to create Meet links automatically
                </p>

                {connected && (
                  <div style={{ background: '#E1F5EE', border: '0.5px solid #5DCAA5', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#085041' }}>
                    Google Calendar connected successfully!
                  </div>
                )}

                {error && (
                  <div style={{ background: '#FCEBEB', border: '0.5px solid #F09595', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#791F1F' }}>
                    Error: {error}
                  </div>
                )}

                <div style={{ background: '#ffffff', border: '0.5px solid #e8e6de', borderRadius: 12, padding: '1.5rem' }}>
                  <p style={{ fontWeight: 500, fontSize: 14, margin: '0 0 8px' }}>Program Google account</p>
                  <p style={{ fontSize: 13, color: '#888780', margin: '0 0 16px', lineHeight: 1.6 }}>
                    All Google Meet links and calendar events are created through the program account (otessaymentors@gmail.com).
                    Click below to reconnect if Meet links stop working.
                  </p>
                  <a
                    href="/api/auth/google"
                    style={{
                      display: 'inline-block', background: '#534AB7', color: '#ffffff',
                      textDecoration: 'none', fontSize: 13, fontWeight: 500,
                      padding: '8px 18px', borderRadius: 8,
                    }}
                  >
                    Connect Google Calendar
                  </a>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}