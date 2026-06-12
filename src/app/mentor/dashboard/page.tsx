'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import { format, parseISO, isToday, isFuture } from 'date-fns'

type Booking = {
  id: string
  student_name: string
  student_email: string
  student_phone: string | null
  student_major: string | null
  year_in_school: number | null
  first_gen_student: boolean
  sms_confirmed_at: string | null
  sms_confirm_sent: boolean
  cancelled_at: string | null
  appointment_slots: {
    id: string
    start_time: string
    end_time: string
    meeting_type: string
    google_meet_link: string | null
  }
  student_essays: { id: string }[]
}

type MentorProfile = {
  id: string
  full_name: string
  email: string
}

export default function MentorDashboardPage() {
  const [activePanel, setActivePanel] = useState('today')
  const [bookings,    setBookings]    = useState<Booking[]>([])
  const [mentor,      setMentor]      = useState<MentorProfile | null>(null)
  const [loading,     setLoading]     = useState(true)
  const router   = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: mentorData } = await supabase
      .from('mentor_profiles')
      .select('id, full_name, email')
      .eq('auth_user_id', user.id)
      .single()

    if (!mentorData) { router.push('/login'); return }
    setMentor(mentorData)

    const bookingsRes = await fetch('/api/mentor/bookings')
    const bookingsData = await bookingsRes.json()
    const filtered = (bookingsData.bookings ?? []).filter((b: any) => {
      const slot = b.appointment_slots
      return slot && isFuture(parseISO(slot.start_time))
    })
    setBookings(filtered)
    setLoading(false)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const todayBookings    = bookings.filter(b => isToday(parseISO(b.appointment_slots.start_time)))
  const upcomingBookings = bookings.filter(b => !isToday(parseISO(b.appointment_slots.start_time)))

  function statusBadge(booking: Booking) {
    if (booking.sms_confirmed_at) {
      return (
        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#E1F5EE', color: '#085041' }}>
          Confirmed
        </span>
      )
    } else if (booking.sms_confirm_sent) {
      return (
        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#FAEEDA', color: '#633806' }}>
          No reply
        </span>
      )
    } else {
      return (
        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#F1EFE8', color: '#5F5E5A' }}>
          No SMS sent
        </span>
      )
    }
  }

  const navItems = [
    { key: 'today',    label: 'Today' },
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'students', label: 'Students' },
    { key: 'slots',    label: 'My availability' },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f5f4f0' }}>

      {/* Sidebar */}
      <div style={{
        width: 200,
        flexShrink: 0,
        background: '#ffffff',
        borderRight: '0.5px solid #e8e6de',
        display: 'flex',
        flexDirection: 'column',
        padding: '16px 0',
      }}>
        <div style={{ padding: '12px 16px 16px', borderBottom: '0.5px solid #e8e6de', marginBottom: 8 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: '#EEEDFE', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 13, fontWeight: 500,
            color: '#3C3489', marginBottom: 8,
          }}>
            {mentor?.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
          <p style={{ fontSize: 13, fontWeight: 500, margin: '0 0 2px' }}>{mentor?.full_name}</p>
          <p style={{ fontSize: 11, color: '#888780', margin: 0 }}>Mentor</p>
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
            {/* TODAY */}
            {activePanel === 'today' && (
              <div>
                <h1 style={{ fontSize: 20, fontWeight: 500, margin: '0 0 4px' }}>
                  Today — {format(new Date(), 'EEEE, MMMM d')}
                </h1>
                <p style={{ fontSize: 13, color: '#888780', margin: '0 0 20px' }}>
                  {todayBookings.length} appointment{todayBookings.length !== 1 ? 's' : ''} today
                </p>

                {todayBookings.length === 0 ? (
                  <div style={{ background: '#ffffff', border: '0.5px solid #e8e6de', borderRadius: 12, padding: '2rem', textAlign: 'center' }}>
                    <p style={{ color: '#888780', margin: 0 }}>No appointments today.</p>
                  </div>
                ) : (
                  todayBookings.map(booking => (
                    <div key={booking.id} style={{
                      background: '#ffffff',
                      border: '0.5px solid #e8e6de',
                      borderRadius: 12,
                      padding: '16px 20px',
                      marginBottom: 10,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                        <div>
                          <p style={{ fontWeight: 500, fontSize: 14, margin: '0 0 2px' }}>
                            {booking.student_name}
                          </p>
                          <p style={{ fontSize: 13, color: '#888780', margin: 0 }}>
                            {format(parseISO(booking.appointment_slots.start_time), 'h:mm a')} –{' '}
                            {format(parseISO(booking.appointment_slots.end_time), 'h:mm a')} ·{' '}
                            {booking.appointment_slots.meeting_type === 'in_person' ? 'In person' : 'Virtual'}
                          </p>
                        </div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          {statusBadge(booking)}
                          {booking.student_essays.length > 0 && (
                            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#EEEDFE', color: '#3C3489' }}>
                              {booking.student_essays.length} essay{booking.student_essays.length !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {booking.appointment_slots.google_meet_link && (
                          
                        <a
                          href={booking.appointment_slots.google_meet_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              fontSize: 12, padding: '5px 14px', borderRadius: 8,
                              background: '#534AB7', color: '#ffffff',
                              textDecoration: 'none', fontWeight: 500,
                            }}
                          >
                            Join Google Meet
                          </a>
                        )}
                        <button
                          onClick={() => router.push(`/mentor/students/${encodeURIComponent(booking.student_email)}`)}
                          style={{ fontSize: 12, padding: '5px 14px' }}
                        >
                          View student profile
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* UPCOMING */}
            {activePanel === 'upcoming' && (
              <div>
                <h1 style={{ fontSize: 20, fontWeight: 500, margin: '0 0 4px' }}>Upcoming</h1>
                <p style={{ fontSize: 13, color: '#888780', margin: '0 0 20px' }}>
                  {upcomingBookings.length} upcoming appointment{upcomingBookings.length !== 1 ? 's' : ''}
                </p>

                {upcomingBookings.length === 0 ? (
                  <div style={{ background: '#ffffff', border: '0.5px solid #e8e6de', borderRadius: 12, padding: '2rem', textAlign: 'center' }}>
                    <p style={{ color: '#888780', margin: 0 }}>No upcoming appointments.</p>
                  </div>
                ) : (
                  upcomingBookings.map(booking => (
                    <div key={booking.id} style={{
                      background: '#ffffff',
                      border: '0.5px solid #e8e6de',
                      borderRadius: 12,
                      padding: '16px 20px',
                      marginBottom: 10,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                    }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 500, fontSize: 14, margin: '0 0 2px' }}>
                          {booking.student_name}
                        </p>
                        <p style={{ fontSize: 13, color: '#888780', margin: 0 }}>
                          {format(parseISO(booking.appointment_slots.start_time), 'EEE MMM d · h:mm a')} –{' '}
                          {format(parseISO(booking.appointment_slots.end_time), 'h:mm a')}
                        </p>
                      </div>
                      {statusBadge(booking)}
                      {booking.student_essays.length > 0 && (
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#EEEDFE', color: '#3C3489' }}>
                          {booking.student_essays.length} essay{booking.student_essays.length !== 1 ? 's' : ''}
                        </span>
                      )}
                      <button
                        onClick={() => router.push(`/mentor/students/${encodeURIComponent(booking.student_email)}`)}
                        style={{ fontSize: 12, padding: '5px 14px' }}
                      >
                        Profile
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* STUDENTS */}
            {activePanel === 'students' && (
              <div>
                <h1 style={{ fontSize: 20, fontWeight: 500, margin: '0 0 4px' }}>Students</h1>
                <p style={{ fontSize: 13, color: '#888780', margin: '0 0 20px' }}>
                  Everyone who has booked with you
                </p>

                {bookings.length === 0 ? (
                  <div style={{ background: '#ffffff', border: '0.5px solid #e8e6de', borderRadius: 12, padding: '2rem', textAlign: 'center' }}>
                    <p style={{ color: '#888780', margin: 0 }}>No students yet.</p>
                  </div>
                ) : (
                  Array.from(new Map(bookings.map(b => [b.student_email, b])).values()).map(booking => (
                    <div key={booking.student_email} style={{
                      background: '#ffffff',
                      border: '0.5px solid #e8e6de',
                      borderRadius: 12,
                      padding: '14px 20px',
                      marginBottom: 8,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                    }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: '#E6F1FB', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: 12, fontWeight: 500,
                        color: '#0C447C', flexShrink: 0,
                      }}>
                        {booking.student_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 500, fontSize: 14, margin: '0 0 2px' }}>
                          {booking.student_name}
                        </p>
                        <p style={{ fontSize: 12, color: '#888780', margin: 0 }}>
                          {booking.student_email}
                          {booking.student_major ? ` · ${booking.student_major}` : ''}
                          {booking.year_in_school ? ` · Year ${booking.year_in_school}` : ''}
                          {booking.first_gen_student ? ' · First-gen' : ''}
                        </p>
                      </div>
                      <button
                        onClick={() => router.push(`/mentor/students/${encodeURIComponent(booking.student_email)}`)}
                        style={{ fontSize: 12, padding: '5px 14px' }}
                      >
                        View profile
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* MY AVAILABILITY */}
            {activePanel === 'slots' && (
              <div>
                <h1 style={{ fontSize: 20, fontWeight: 500, margin: '0 0 4px' }}>My availability</h1>
                <p style={{ fontSize: 13, color: '#888780', margin: '0 0 20px' }}>
                  Manage your appointment slots
                </p>
                <div style={{ background: '#ffffff', border: '0.5px solid #e8e6de', borderRadius: 12, padding: '2rem', textAlign: 'center' }}>
                  <p style={{ color: '#888780', margin: 0 }}>
                    Slot management coming in Phase 6 when Google Calendar is connected.
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}