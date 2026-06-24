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
  is_virtual_available: boolean
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
  const [activePanel, setActivePanel] = useState('reports')
  const [mentors,     setMentors]     = useState<Mentor[]>([])
  const [bookings,    setBookings]    = useState<Booking[]>([])
  const [loading,     setLoading]     = useState(true)
  const [connected,   setConnected]   = useState(false)
  const [reports,     setReports]     = useState<any>(null)
const [reportsLoading, setReportsLoading] = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [endSessionConfirm, setEndSessionConfirm] = useState('')
const [endingSession,     setEndingSession]     = useState(false)
const [sessionEnded,      setSessionEnded]      = useState(false)
const [showAllComments, setShowAllComments] = useState(false)
const [cancellingId, setCancellingId] = useState<string | null>(null)

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
    loadReports()
  }, [])

  useEffect(() => {
    if (activePanel === 'qrcodes' && typeof window !== 'undefined' && (window as any).QRCode) {
      const bookingEl = document.getElementById('qr-booking')
      const checkinEl = document.getElementById('qr-checkin')

      if (bookingEl) {
        bookingEl.innerHTML = ''
        new (window as any).QRCode(bookingEl, {
          text: `https://www.otessaymentors.org/book?code=${process.env.NEXT_PUBLIC_BOOKING_CODE}`,
          width: 160,
          height: 160,
        })
      }

      if (checkinEl) {
        checkinEl.innerHTML = ''
        new (window as any).QRCode(checkinEl, {
          text: `https://www.otessaymentors.org/checkin?code=${process.env.NEXT_PUBLIC_CHECKIN_CODE}`,
          width: 160,
          height: 160,
        })
      }
    }
  }, [activePanel])

  async function loadData() {
   const mentorRes  = await fetch('/api/admin/mentors/list')
    const mentorData = await mentorRes.json()

    const sortedMentors = (mentorData ?? []).sort((a: Mentor, b: Mentor) => {
      if (a.is_active === b.is_active) return 0
      return a.is_active ? -1 : 1
    })
    setMentors(sortedMentors)
    const bookingRes  = await fetch('/api/admin/bookings')
    const bookingData = await bookingRes.json()
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
    await fetch('/api/admin/mentors/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mentorId: mentor.id,
        field: 'is_active',
        value: !mentor.is_active,
      }),
    })
    loadData()
  }
async function toggleMentorVirtual(mentor: Mentor) {
    await fetch('/api/admin/mentors/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mentorId: mentor.id,
        field: 'is_virtual_available',
        value: !mentor.is_virtual_available,
      }),
    })
    loadData()
  }
  async function loadReports() {
    setReportsLoading(true)
    const res  = await fetch('/api/admin/reports')
    const data = await res.json()
    setReports(data)
    setReportsLoading(false)
  }

 const navItems = [
    { key: 'reports',   label: 'Reports' },
    { key: 'bookings',  label: 'All bookings' },
    { key: 'mentors',   label: 'Mentors' },
    { key: 'qrcodes',   label: 'QR Codes' },
    { key: 'calendar',  label: 'Google Calendar' },
    { key: 'session',   label: 'End Session' },
  ]

  return (
    <div className="mentor-layout" style={{ display: 'flex', minHeight: '100vh', background: '#f5f4f0' }}>
      {/* Sidebar */}
     <div className="mentor-sidebar" style={{
        width: 200, flexShrink: 0, background: '#ffffff',
        borderRight: '0.5px solid #e8e6de',
        display: 'flex', flexDirection: 'column', padding: '16px 0',
        position: 'sticky', top: 0, height: '100vh', overflowY: 'auto',
      }}>
        <div style={{ padding: '12px 16px 16px', borderBottom: '0.5px solid #e8e6de', marginBottom: 8 }}>
          <p style={{ fontSize: 13, fontWeight: 500, margin: '0 0 2px' }}>Admin</p>
          <p style={{ fontSize: 11, color: '#888780', margin: 0 }}>OT Essay Mentor Program</p>
        </div>

        {navItems.map(item => (
          <button
            key={item.key}
onClick={() => {
  setActivePanel(item.key)
  if (item.key === 'reports') loadReports()
}}
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

<div style={{ marginTop: 16, padding: '12px 16px', borderTop: '0.5px solid #e8e6de' }}>          <a href="/" style={{ display: 'block', fontSize: 12, color: '#888780', textDecoration: 'none', marginBottom: 8 }}>
            ← Home
          </a>
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
                  {mentors.filter(m => m.is_active).map(mentor => (
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
                        background: mentor.is_virtual_available ? '#EEEDFE' : '#F1EFE8',
                        color: mentor.is_virtual_available ? '#3C3489' : '#5F5E5A',
                      }}>
                        {mentor.is_virtual_available ? 'Virtual' : 'No virtual'}
                      </span>
                      <button
                        onClick={() => toggleMentorVirtual(mentor)}
                        style={{ fontSize: 12, padding: '4px 10px' }}
                      >
                        {mentor.is_virtual_available ? 'Remove from virtual' : 'Add to virtual'}
                      </button>
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

                {mentors.some(m => !m.is_active) && (
                  <>
                    <p style={{ fontSize: 14, fontWeight: 500, margin: '20px 0 10px', color: '#5F5E5A' }}>
                      Inactive Mentors
                    </p>
                    <div style={{ background: '#ffffff', border: '0.5px solid #e8e6de', borderRadius: 12, padding: '.75rem 1rem' }}>
                      {mentors.filter(m => !m.is_active).map(mentor => (
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
                            background: '#FCEBEB', color: '#791F1F',
                          }}>
                            Inactive
                          </span>
                          <button
                            onClick={() => toggleMentorActive(mentor)}
                            style={{ fontSize: 12, padding: '4px 10px' }}
                          >
                            Activate
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
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

                      {!booking.cancelled_at && (
                        cancellingId === booking.id ? (
                          <>
                            <button
                              onClick={async () => {
                                await fetch(`/api/bookings/${booking.id}/cancel`, { method: 'POST' })
                                setCancellingId(null)
                                loadData()
                              }}
                              style={{ fontSize: 12, padding: '4px 10px', background: '#E24B4A', color: '#ffffff', border: 'none' }}
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setCancellingId(null)}
                              style={{ fontSize: 12, padding: '4px 10px' }}
                            >
                              Never mind
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setCancellingId(booking.id)}
                            style={{ fontSize: 12, padding: '4px 10px', color: '#791F1F', borderColor: '#F09595' }}
                          >
                            Cancel
                          </button>
                        )
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

{/* REPORTS */}
            {activePanel === 'reports' && (
              <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <div>
                    <h1 style={{ fontSize: 20, fontWeight: 500, margin: '0 0 4px' }}>Reports</h1>
                    <p style={{ fontSize: 13, color: '#888780', margin: 0 }}>Program statistics and demographics</p>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {reports && (
                      <button
                        onClick={() => {
                          window.location.href = '/api/admin/reports/export'
                        }}
                        style={{ fontSize: 12 }}
                      >
                        Export CSV
                      </button>
                    )}
                  </div>
                </div>

                {!reports && !reportsLoading && (
                  <div style={{ background: '#ffffff', border: '0.5px solid #e8e6de', borderRadius: 12, padding: '2rem', textAlign: 'center' }}>
                    <p style={{ color: '#888780', margin: 0 }}>Click "Load reports" to view program statistics.</p>
                  </div>
                )}

                {reports && (
                  <div>
                    {/* Booking stats */}
                    <p style={{ fontSize: 14, fontWeight: 500, margin: '0 0 10px' }}>Bookings</p>
                  <div className="booking-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, marginBottom: 20 }}>
                      {[
                       { label: 'Total',     value: reports.bookings.total },
                        { label: 'Active',    value: reports.bookings.active },
                        { label: 'Cancelled', value: reports.bookings.cancelled },
                        { label: 'No shows',  value: reports.bookings.noShows },
                        { label: 'Meet issues', value: reports.bookings.meetIssues },
                        { label: 'Total slots', value: reports.bookings.totalSlots },
                        { label: 'Unused slots', value: reports.bookings.unbookedSlots },
                      ].map(stat => (
                        <div key={stat.label} style={{ background: '#ffffff', border: '0.5px solid #e8e6de', borderRadius: 10, padding: '14px', textAlign: 'center' }}>
                          <p style={{ fontSize: 24, fontWeight: 500, margin: '0 0 4px', color: '#534AB7' }}>{stat.value}</p>
                          <p style={{ fontSize: 12, color: '#888780', margin: 0 }}>{stat.label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Survey stats */}
                    {reports.surveys.totalResponses > 0 && (
                      <div style={{ background: '#F0EFFE', border: '0.5px solid #C9C5F7', borderRadius: 12, padding: '1rem', marginBottom: 20 }}>
                        <p style={{ fontSize: 14, fontWeight: 500, margin: '0 0 10px' }}>Student surveys ({reports.surveys.totalResponses} responses)</p>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
                          {/* Avg ease of connecting */}
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 500, margin: '0 0 8px' }}>Ease of connecting (avg)</p>
                            <div style={{ background: '#ffffff', border: '0.5px solid #e8e6de', borderRadius: 12, padding: '14px', textAlign: 'center' }}>
                              <p style={{ fontSize: 28, fontWeight: 500, margin: 0, color: '#534AB7' }}>{reports.surveys.avgRating}<span style={{ fontSize: 14, color: '#888780' }}>/5</span></p>
                            </div>
                          </div>

                          {/* Mentor on time */}
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 500, margin: '0 0 8px' }}>Mentor on time</p>
                            <div style={{ background: '#ffffff', border: '0.5px solid #e8e6de', borderRadius: 12, padding: '.75rem 1rem' }}>
                              {reports.surveys.mentorOnTime.map(([label, count]: [string, number]) => (
                                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '0.5px solid #e8e6de' }}>
                                  <p style={{ margin: 0, fontSize: 13 }}>{label}</p>
                                  <p style={{ margin: 0, fontSize: 13, fontWeight: 500 }}>{count}</p>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Next steps */}
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 500, margin: '0 0 8px' }}>Gave next steps</p>
                            <div style={{ background: '#ffffff', border: '0.5px solid #e8e6de', borderRadius: 12, padding: '.75rem 1rem' }}>
                              {reports.surveys.nextSteps.map(([label, count]: [string, number]) => (
                                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '0.5px solid #e8e6de' }}>
                                  <p style={{ margin: 0, fontSize: 13 }}>{label}</p>
                                  <p style={{ margin: 0, fontSize: 13, fontWeight: 500 }}>{count}</p>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Work with mentor again */}
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 500, margin: '0 0 8px' }}>Would work with mentor again</p>
                            <div style={{ background: '#ffffff', border: '0.5px solid #e8e6de', borderRadius: 12, padding: '.75rem 1rem' }}>
                              {reports.surveys.workAgain.map(([label, count]: [string, number]) => (
                                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '0.5px solid #e8e6de' }}>
                                  <p style={{ margin: 0, fontSize: 13 }}>{label}</p>
                                  <p style={{ margin: 0, fontSize: 13, fontWeight: 500 }}>{count}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                      </div>

                      {/* How heard - full width */}
                      {reports.surveys.howHeard?.length > 0 && (
                        <div style={{ gridColumn: '1 / -1' }}>
                          <p style={{ fontSize: 13, fontWeight: 500, margin: '0 0 8px' }}>
                            How they heard / comments ({reports.surveys.howHeard.length})
                          </p>
                          <div style={{ background: '#ffffff', border: '0.5px solid #e8e6de', borderRadius: 12, padding: '.75rem 1rem', maxHeight: showAllComments ? 'none' : 200, overflow: 'hidden' }}>
                            {reports.surveys.howHeard.map((answer: string, i: number) => (
                              <p key={i} style={{ margin: '0 0 6px', fontSize: 13, color: '#2C2C2A', borderBottom: '0.5px solid #e8e6de', paddingBottom: 6 }}>
                                "{answer}"
                              </p>
                            ))}
                          </div>
                          {reports.surveys.howHeard.length > 4 && (
                            <button
                              onClick={() => setShowAllComments(!showAllComments)}
                              style={{ fontSize: 12, marginTop: 8 }}
                            >
                              {showAllComments ? 'Show less' : `Show all ${reports.surveys.howHeard.length} comments`}
                            </button>
                          )}
                        </div>
                      )}

                        </div>
                    )}

                    
                  {/* Demographics */}
                    <p style={{ fontSize: 14, fontWeight: 500, margin: '0 0 10px' }}>Intake form responses</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>

                      {/* Mentor activity */}
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 500, margin: '0 0 10px' }}>Mentor appointments</p>
                        <div style={{ background: '#ffffff', border: '0.5px solid #e8e6de', borderRadius: 12, padding: '.75rem 1rem' }}>
                          {reports.mentorActivity.map(([name, count]: [string, number]) => (
                            <div key={name} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '0.5px solid #e8e6de' }}>
                              <p style={{ margin: 0, fontSize: 13, fontWeight: 500 }}>{name}</p>
                              <p style={{ margin: 0, fontSize: 13, color: '#888780' }}>{count}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* First gen */}
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 500, margin: '0 0 10px' }}>First in family going to college</p>
                        <div style={{ background: '#ffffff', border: '0.5px solid #e8e6de', borderRadius: 12, padding: '.75rem 1rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '0.5px solid #e8e6de' }}>
                            <p style={{ margin: 0, fontSize: 13 }}>Yes</p>
                            <p style={{ margin: 0, fontSize: 13, fontWeight: 500 }}>{reports.demographics.firstGen.yes}</p>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                            <p style={{ margin: 0, fontSize: 13 }}>No</p>
                            <p style={{ margin: 0, fontSize: 13, fontWeight: 500 }}>{reports.demographics.firstGen.no}</p>
                          </div>
                        </div>
                      </div>

                      {/* Private counselor */}
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 500, margin: '0 0 10px' }}>Using private counselor</p>
                        <div style={{ background: '#ffffff', border: '0.5px solid #e8e6de', borderRadius: 12, padding: '.75rem 1rem' }}>
                          {reports.demographics.privateCounselor.map(([label, count]: [string, number]) => (
                            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '0.5px solid #e8e6de' }}>
                              <p style={{ margin: 0, fontSize: 13 }}>{label}</p>
                              <p style={{ margin: 0, fontSize: 13, fontWeight: 500 }}>{count}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* LGBTQ */}
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 500, margin: '0 0 10px' }}>LGBTQIAA+ / Gender nonconforming</p>
                        <div style={{ background: '#ffffff', border: '0.5px solid #e8e6de', borderRadius: 12, padding: '.75rem 1rem' }}>
                          {reports.demographics.lgbtq.map(([label, count]: [string, number]) => (
                            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '0.5px solid #e8e6de' }}>
                              <p style={{ margin: 0, fontSize: 13 }}>{label}</p>
                              <p style={{ margin: 0, fontSize: 13, fontWeight: 500 }}>{count}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Immigrants */}
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 500, margin: '0 0 10px' }}>Immigrants</p>
                        <div style={{ background: '#ffffff', border: '0.5px solid #e8e6de', borderRadius: 12, padding: '.75rem 1rem' }}>
                          {reports.demographics.immigrants.map(([label, count]: [string, number]) => (
                            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '0.5px solid #e8e6de' }}>
                              <p style={{ margin: 0, fontSize: 12 }}>{label}</p>
                              <p style={{ margin: 0, fontSize: 13, fontWeight: 500 }}>{count}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* What they want help with */}
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 500, margin: '0 0 10px' }}>What students want help with</p>
                        <div style={{ background: '#ffffff', border: '0.5px solid #e8e6de', borderRadius: 12, padding: '.75rem 1rem' }}>
                          {reports.demographics.helpWith.map(([label, count]: [string, number]) => (
                            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '0.5px solid #e8e6de' }}>
                              <p style={{ margin: 0, fontSize: 13 }}>{label}</p>
                              <p style={{ margin: 0, fontSize: 13, fontWeight: 500 }}>{count}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Teacher distribution */}
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 500, margin: '0 0 10px' }}>Senior English/Advisory teacher</p>
                        <div style={{ background: '#ffffff', border: '0.5px solid #e8e6de', borderRadius: 12, padding: '.75rem 1rem' }}>
                          {reports.demographics.teachers.map(([label, count]: [string, number]) => (
                            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '0.5px solid #e8e6de' }}>
                              <p style={{ margin: 0, fontSize: 13 }}>{label}</p>
                              <p style={{ margin: 0, fontSize: 13, fontWeight: 500 }}>{count}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Ethnicity - full width */}
<div>
                          <p style={{ fontSize: 14, fontWeight: 500, margin: '0 0 10px' }}>Ethnicity</p>
                        <div style={{ background: '#ffffff', border: '0.5px solid #e8e6de', borderRadius: 12, padding: '.75rem 1rem' }}>
                          {reports.demographics.ethnicity.map(([label, count]: [string, number]) => (
                            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '0.5px solid #e8e6de' }}>
                              <p style={{ flex: 1, margin: 0, fontSize: 13 }}>{label}</p>
                              <p style={{ margin: 0, fontSize: 13, fontWeight: 500 }}>{count}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                   </div>
                  </div>
                )}
              </div>
            )}
{/* END SESSION */}
            {activePanel === 'session' && (
              <div>
                <h1 style={{ fontSize: 20, fontWeight: 500, margin: '0 0 4px' }}>End Session</h1>
                <p style={{ fontSize: 13, color: '#888780', margin: '0 0 24px' }}>
                  Use this at the end of the semester to clear all program data.
                </p>

                {sessionEnded ? (
                  <div style={{ background: '#E1F5EE', border: '0.5px solid #5DCAA5', borderRadius: 12, padding: '2rem', textAlign: 'center' }}>
                    <p style={{ fontSize: 16, fontWeight: 500, color: '#085041', margin: '0 0 8px' }}>Session ended successfully</p>
                    <p style={{ fontSize: 14, color: '#0F6E56', margin: 0 }}>All program data has been cleared. Ready for next semester!</p>
                  </div>
                ) : (
                  <>
                    <div style={{ background: '#FCEBEB', border: '0.5px solid #F09595', borderRadius: 12, padding: '1.5rem', marginBottom: 20 }}>
                      <p style={{ fontWeight: 500, fontSize: 15, color: '#791F1F', margin: '0 0 12px' }}>⚠️ Warning — this cannot be undone</p>
                      <p style={{ fontSize: 14, color: '#791F1F', margin: '0 0 8px', lineHeight: 1.6 }}>
                        Ending the session will permanently delete:
                      </p>
                      <ul style={{ fontSize: 14, color: '#791F1F', margin: '0 0 12px', paddingLeft: 20, lineHeight: 2 }}>
                        <li>All student bookings</li>
                        <li>All appointment slots</li>
                        <li>All uploaded essays</li>
                        <li>All survey responses</li>
                        <li>All intake form answers</li>
                        <li>All email logs</li>
                      </ul>
                      <p style={{ fontSize: 14, color: '#791F1F', margin: 0, fontWeight: 500 }}>
                        Mentor profiles and notes will be kept. Download your CSV report first!
                      </p>
                    </div>

                    <div style={{ background: '#ffffff', border: '0.5px solid #e8e6de', borderRadius: 12, padding: '1.5rem' }}>
                      <p style={{ fontWeight: 500, fontSize: 14, margin: '0 0 8px' }}>Type END SESSION to confirm</p>
                      <input
                        type="text"
                        value={endSessionConfirm}
                        onChange={e => setEndSessionConfirm(e.target.value)}
                        placeholder="END SESSION"
                        style={{ width: '100%', boxSizing: 'border-box', marginBottom: 16 }}
                      />
                      <button
                        onClick={async () => {
                          if (endSessionConfirm !== 'END SESSION') {
                            alert('Please type END SESSION exactly to confirm.')
                            return
                          }
                          setEndingSession(true)
                          const res = await fetch('/api/admin/end-session', { method: 'POST' })
                          setEndingSession(false)
                          if (res.ok) {
                            setSessionEnded(true)
                            loadData()
                          } else {
                            alert('Something went wrong. Please try again.')
                          }
                        }}
                        disabled={endingSession || endSessionConfirm !== 'END SESSION'}
                        style={{
                          width: '100%', background: '#E24B4A', color: '#ffffff',
                          border: 'none', borderRadius: 8, padding: '10px',
                          fontSize: 14, fontWeight: 500, cursor: 'pointer',
                          opacity: endSessionConfirm !== 'END SESSION' ? 0.5 : 1,
                        }}
                      >
                        {endingSession ? 'Ending session...' : 'End Session'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
            {/* QR CODES */}
            {activePanel === 'qrcodes' && (
              <div>
                <h1 style={{ fontSize: 20, fontWeight: 500, margin: '0 0 4px' }}>QR Codes</h1>
                <p style={{ fontSize: 13, color: '#888780', margin: '0 0 20px' }}>
                  Print these for students to scan and skip typing the access code
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div style={{ background: '#ffffff', border: '0.5px solid #e8e6de', borderRadius: 12, padding: '1.25rem', textAlign: 'center' }}>
                    <p style={{ fontWeight: 500, fontSize: 15, margin: '0 0 4px' }}>Virtual booking</p>
                    <p style={{ fontSize: 12, color: '#888780', margin: '0 0 12px' }}>Scan to go straight to the booking form</p>
                    <div id="qr-booking" style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }} />
                    <p style={{ fontSize: 11, color: '#B4B2A9', margin: 0, wordBreak: 'break-all' }}>
                      otessaymentors.org/book?code={process.env.NEXT_PUBLIC_BOOKING_CODE}
                    </p>
                  </div>
                  <div style={{ background: '#ffffff', border: '0.5px solid #e8e6de', borderRadius: 12, padding: '1.25rem', textAlign: 'center' }}>
                    <p style={{ fontWeight: 500, fontSize: 15, margin: '0 0 4px' }}>In-person check-in</p>
                    <p style={{ fontSize: 12, color: '#888780', margin: '0 0 12px' }}>Scan to check in at the CCC</p>
                    <div id="qr-checkin" style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }} />
                    <p style={{ fontSize: 11, color: '#B4B2A9', margin: 0, wordBreak: 'break-all' }}>
                      otessaymentors.org/checkin?code={process.env.NEXT_PUBLIC_CHECKIN_CODE}
                    </p>
                  </div>
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