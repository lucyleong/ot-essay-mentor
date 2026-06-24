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
  is_virtual_available?: boolean
}

export default function MentorDashboardPage() {
  const [activePanel, setActivePanel] = useState('today')
  const [bookings,    setBookings]    = useState<Booking[]>([])
  const [mentor,      setMentor]      = useState<MentorProfile | null>(null)
  const [loading,     setLoading]     = useState(true)
  const router   = useRouter()
  const supabase = createClient()
  const [slots,          setSlots]          = useState<any[]>([])
const [showSlotForm,   setShowSlotForm]   = useState(false)
const [slotDate,       setSlotDate]       = useState('')
const [slotStart,      setSlotStart]      = useState('')
const [slotEnd,        setSlotEnd]        = useState('')
const [slotBreak, setSlotBreak] = useState('10')
const [slotType,       setSlotType]       = useState('virtual')
const [slotRecurrence, setSlotRecurrence] = useState('none')
const [slotUntil, setSlotUntil] = useState('')
const [addingSlot,     setAddingSlot]     = useState(false)
const [slotSuccess,    setSlotSuccess]    = useState('')
const [slotError,      setSlotError]      = useState('')
const [allBookings, setAllBookings] = useState<any[]>([])
const [walkinQueue, setWalkinQueue] = useState<any[]>([])
const [isInPersonAvailable, setIsInPersonAvailable] = useState(false)

function generateTimeOptions(startAfter?: string) {
  const options = []
  for (let hour = 9; hour <= 21; hour++) {
    for (let min = 0; min < 60; min += 30) {
      const val  = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`
      if (startAfter && val <= startAfter) continue
      const h    = hour % 12 || 12
      const ampm = hour < 12 ? 'AM' : 'PM'
      const m    = String(min).padStart(2, '0')
      options.push({ value: val, label: `${h}:${m} ${ampm}` })
    }
  }
  return options
}

const timeOptions = generateTimeOptions()
  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: mentorData } = await supabase
      .from('mentor_profiles')
      .select('id, full_name, email, is_virtual_available')
      .eq('auth_user_id', user.id)
      .single()

    if (!mentorData) { router.push('/login'); return }
    setMentor(mentorData)

    const bookingsRes = await fetch('/api/mentor/bookings')
    const bookingsData = await bookingsRes.json()
    const allBookings = bookingsData.bookings ?? []
    const filtered = allBookings.filter((b: any) => {
      const slot = b.appointment_slots
      return slot && isFuture(parseISO(slot.start_time))
    })
    setBookings(filtered)
    setAllBookings(allBookings)
    // Load mentor's slots
   const slotsRes = await fetch('/api/slots')
    const slotsData = await slotsRes.json()
    setSlots(Array.isArray(slotsData) ? slotsData : [])

    // Load walk-in queue
    const queueRes = await fetch('/api/mentor/walkin-queue')
    const queueData = await queueRes.json()
    setWalkinQueue(queueData.queue ?? [])
    setIsInPersonAvailable(queueData.isInPersonAvailable ?? false)

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
    ...(mentor?.is_virtual_available !== false ? [{ key: 'slots', label: 'My availability' }] : []),
    ...(isInPersonAvailable ? [{ key: 'walkin', label: 'Walk-in Queue' }] : []),
  ]
  return (
    <div className="mentor-layout" style={{ display: 'flex', minHeight: '100vh', background: '#f5f4f0' }}>

      {/* Sidebar */}
      <div className="mentor-sidebar" style={{
        width: 200,
        flexShrink: 0,
        background: '#ffffff',
        borderRight: '0.5px solid #e8e6de',
        display: 'flex',
        flexDirection: 'column',
        padding: '16px 0',
        position: 'sticky',
        top: 0,
        height: '100vh',
        overflowY: 'auto',
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

        <div style={{ padding: '12px 16px', borderTop: '0.5px solid #e8e6de', marginTop: 16 }}>
          <a href="/" style={{ display: 'block', fontSize: 12, color: '#888780', textDecoration: 'none', marginBottom: 8 }}>
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

                {allBookings.length === 0 ? (
                  <div style={{ background: '#ffffff', border: '0.5px solid #e8e6de', borderRadius: 12, padding: '2rem', textAlign: 'center' }}>
                    <p style={{ color: '#888780', margin: 0 }}>No students yet.</p>
                  </div>
                ) : (
Array.from(new Map(allBookings.map(b => [b.student_email, b])).values())
                  .sort((a, b) => a.student_name.split(' ')[0].localeCompare(b.student_name.split(' ')[0]))
                  .map(booking => (
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

           {activePanel === 'slots' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                  <div>
                    <h1 style={{ fontSize: 20, fontWeight: 500, margin: '0 0 4px' }}>My availability</h1>
                    <p style={{ fontSize: 13, color: '#888780', margin: 0 }}>
                      Add appointment slots for students to book
                    </p>
                  </div>
                </div>

                {slotSuccess && (
                  <div style={{ background: '#E1F5EE', border: '0.5px solid #5DCAA5', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#085041' }}>
                    {slotSuccess}
                  </div>
                )}

                {slotError && (
                  <div style={{ background: '#FCEBEB', border: '0.5px solid #F09595', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#791F1F' }}>
                    {slotError}
                  </div>
                )}

              <div style={{ background: '#ffffff', border: '0.5px solid #e8e6de', borderRadius: 12, padding: '1.25rem', marginBottom: 16 }}>
                  <p style={{ fontWeight: 500, fontSize: 14, margin: '0 0 14px' }}>Add availability</p>


                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#5F5E5A', marginBottom: 4 }}>Date</label>
                      <input type="date" value={slotDate} onChange={e => setSlotDate(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#5F5E5A', marginBottom: 4 }}>Available from</label>
                      <input
                        type="time"
                        value={slotStart}
                        onChange={e => setSlotStart(e.target.value)}
                        list="start-times"
                        min="09:00"
                        max="21:00"
                        style={{ width: '100%', boxSizing: 'border-box' }}
                      />
                      <datalist id="start-times">
                        {timeOptions.map(t => (
                          <option key={t.value} value={t.value} />
                        ))}
                      </datalist>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#5F5E5A', marginBottom: 4 }}>Available until</label>
                      <input
                        type="time"
                        value={slotEnd}
                        onChange={e => setSlotEnd(e.target.value)}
                        list="end-times"
                        min={slotStart || "09:00"}
                        max="21:00"
                        style={{ width: '100%', boxSizing: 'border-box' }}
                      />
                      <datalist id="end-times">
                        {generateTimeOptions(slotStart).map(t => (
                          <option key={t.value} value={t.value} />
                        ))}
                      </datalist>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#5F5E5A', marginBottom: 4 }}>Break between</label>
                      <select value={slotBreak} onChange={e => setSlotBreak(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }}>
                        <option value="10">10 minutes</option>
                        <option value="5">5 minutes</option>
                      </select>
                    </div>
                  </div>

<div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10, alignItems: 'end', marginBottom: 12 }}>                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#5F5E5A', marginBottom: 4 }}>Repeat</label>
                        <select value={slotRecurrence} onChange={e => setSlotRecurrence(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }}>
                          <option value="none">One time only</option>
                          <option value="daily">Every day</option>
                          <option value="weekly">Every week</option>
                          <option value="biweekly">Every 2 weeks</option>
                        </select>
                      </div>
                      <button
                    onClick={async () => {
                      if (!slotDate || !slotStart || !slotEnd) {
                        setSlotError('Please fill in the date, start time, and end time.')
                        return
                      }
                      setAddingSlot(true)
                      setSlotError('')
                      setSlotSuccess('')

                      const breakMinutes = parseInt(slotBreak)
                      const slotDuration = 20
                      const intervalMins = slotDuration + breakMinutes

                      const windowStart = new Date(`${slotDate}T${slotStart}:00`)
                      const windowEnd   = new Date(`${slotDate}T${slotEnd}:00`)

                      const slotTimes: { startTime: string; endTime: string }[] = []
                      let current = new Date(windowStart)

                      while (true) {
                        const slotEndTime = new Date(current.getTime() + slotDuration * 60_000)
                        if (slotEndTime > windowEnd) break
                        slotTimes.push({
                          startTime: current.toISOString(),
                          endTime:   slotEndTime.toISOString(),
                        })
                        current = new Date(current.getTime() + intervalMins * 60_000)
                      }

                      if (slotTimes.length === 0) {
                        setSlotError('No slots fit in that time window. Please check your times.')
                        setAddingSlot(false)
                        return
                      }

                      let data: any = {}
                      try {
                        const res = await fetch('/api/slots', {
                          method:  'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body:    JSON.stringify({
                            slotTimes,
                            durationMinutes: 20,
                            meetingType:     slotType,
                            recurrenceRule:  slotRecurrence === 'none' ? null : slotRecurrence,
                            recurrenceUntil: slotRecurrence === 'none' ? null : slotUntil,
                          }),
                        })
                        data = await res.json()
                        if (!res.ok) {
                          setSlotError(data.error ?? 'Something went wrong.')
                          setAddingSlot(false)
                          return
                        }
                      } catch {
                        setSlotError('Server error. Please try again.')
                        setAddingSlot(false)
                        return
                      }

                      setAddingSlot(false)
                      setSlotSuccess(`${data.slotsCreated} slot${data.slotsCreated !== 1 ? 's' : ''} added! Generating Google Meet links...`)
setSlotDate('')
setSlotStart('')
setSlotEnd('')
setSlotRecurrence('none')
setSlotUntil('')

// Refresh slot list immediately
const slotsRes  = await fetch('/api/slots')
const slotsData = await slotsRes.json()
setSlots(Array.isArray(slotsData) ? slotsData : [])

// Auto-sync calendar after 3 seconds
setTimeout(async () => {
  const syncRes  = await fetch('/api/slots/sync-calendar', { method: 'POST' })
  const syncData = await syncRes.json()
  if (syncRes.ok) {
    setSlotSuccess(`${data.slotsCreated} slot${data.slotsCreated !== 1 ? 's' : ''} added with Google Meet links!`)
    const refreshRes  = await fetch('/api/slots')
    const refreshData = await refreshRes.json()
    setSlots(Array.isArray(refreshData) ? refreshData : [])
  }
}, 3000)
                    }}
                    disabled={addingSlot}
style={{ 
  background: '#534AB7', 
  color: '#ffffff',
  padding: '8px 20px',
  whiteSpace: 'nowrap',
  fontSize: 13,
  fontWeight: 500,
}}                  >
                  {addingSlot ? 'Saving...' : 'Save schedule'}
                  </button>
                </div>

                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: '#f5f4f0', borderRadius: 8, padding: '10px 14px', marginTop: 16,
                }}>
                  <div>
                    <p style={{ fontWeight: 500, fontSize: 13, margin: '0 0 2px' }}>
                      I'm at the College and Career Center right now for in-person walk-ins
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      const newValue = !isInPersonAvailable
                      await fetch('/api/mentor/in-person-toggle', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ isAvailable: newValue }),
                      })
                      setIsInPersonAvailable(newValue)
                    }}
                    style={{
                      width: 48, height: 26, borderRadius: 20, border: 'none',
                      background: isInPersonAvailable ? '#534AB7' : '#D3D1C7',
                      position: 'relative', cursor: 'pointer', padding: 0,
                      flexShrink: 0,
                    }}
                  >
                    <div style={{
                      width: 20, height: 20, borderRadius: '50%', background: '#ffffff',
                      position: 'absolute', top: 3,
                      left: isInPersonAvailable ? 25 : 3,
                      transition: 'left 0.2s',
                    }} />
                  </button>
                </div>
              </div>

                {slots.length === 0 ? (
                  <div style={{ background: '#ffffff', border: '0.5px solid #e8e6de', borderRadius: 12, padding: '2rem', textAlign: 'center' }}>
                    <p style={{ color: '#888780', margin: 0 }}>No upcoming slots yet.</p>
                  </div>
                ) : (
                  slots.map(slot => (
                    <div key={slot.id} style={{
                      background: '#ffffff', border: '0.5px solid #e8e6de',
                      borderRadius: 12, padding: '14px 20px', marginBottom: 8,
                      display: 'flex', alignItems: 'center', gap: 12,
                    }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 500, fontSize: 14, margin: '0 0 2px' }}>
                          {new Date(slot.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'America/Los_Angeles' })}
                          {' · '}
                          {new Date(slot.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Los_Angeles' })}
                        </p>
                        <p style={{ fontSize: 12, color: '#888780', margin: 0 }}>
                          20 min · {slot.meeting_type === 'in_person' ? 'In person' : 'Virtual'}
                          {slot.google_meet_link ? ' · Meet link ready' : ' · No Meet link yet'}
                        </p>
                      </div>
                      <span style={{
                        fontSize: 11, padding: '2px 8px', borderRadius: 20,
                        background: slot.is_booked ? '#FAEEDA' : '#E1F5EE',
                        color: slot.is_booked ? '#633806' : '#085041',
                      }}>
                        {slot.is_booked ? 'Booked' : 'Open'}
                      </span>
                      {!slot.is_booked && (
                        <button
                          onClick={async () => {
                            await fetch(`/api/slots/${slot.id}`, { method: 'DELETE' })
                            setSlots(prev => prev.filter(s => s.id !== slot.id))
                          }}
                          style={{ fontSize: 12, padding: '4px 10px', color: '#791F1F', borderColor: '#F09595' }}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* WALK-IN QUEUE */}
            {activePanel === 'walkin' && isInPersonAvailable && (
              <div>
                <h1 style={{ fontSize: 20, fontWeight: 500, margin: '0 0 4px' }}>Walk-in Queue</h1>
                <p style={{ fontSize: 13, color: '#888780', margin: '0 0 20px' }}>
                  Students currently checked in and waiting at the College and Career Center
                </p>

                {walkinQueue.length === 0 ? (
                  <div style={{ background: '#ffffff', border: '0.5px solid #e8e6de', borderRadius: 12, padding: '2rem', textAlign: 'center' }}>
                    <p style={{ color: '#888780', margin: 0 }}>No one is waiting right now.</p>
                  </div>
                ) : (
                  walkinQueue.map((entry, index) => (
                    <div key={entry.id} style={{
                      background: '#ffffff', border: '0.5px solid #e8e6de',
                      borderRadius: 12, padding: '14px 20px', marginBottom: 8,
                      display: 'flex', alignItems: 'center', gap: 12,
                    }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: '#EEEDFE', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: 12, fontWeight: 500,
                        color: '#3C3489', flexShrink: 0,
                      }}>
                        {index + 1}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 500, fontSize: 14, margin: '0 0 2px' }}>
                          {entry.student_name}
                        </p>
                        <p style={{ fontSize: 12, color: '#888780', margin: 0 }}>
                          {entry.student_email}
                          {entry.student_phone ? ` · ${entry.student_phone}` : ''}
                          {' · Checked in '}
                          {new Date(entry.checked_in_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Los_Angeles' })}
                        </p>
                      </div>
                      <button
                        onClick={async () => {
                          await fetch(`/api/mentor/walkin-queue/${entry.id}/claim`, { method: 'POST' })
                          setWalkinQueue(prev => prev.filter(e => e.id !== entry.id))
                        }}
                        style={{ fontSize: 12, padding: '5px 14px', background: '#534AB7', color: '#ffffff', border: 'none' }}
                      >
                        Start session
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
            </>
        )}
      </div>
    </div>
  )
}