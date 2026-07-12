'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { formatDateTimePST } from '@/lib/utils'

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
  sms_consent: boolean
  sms_confirm_sent: boolean
  sms_confirmed_at: string | null
  appointment_slots: any
  survey_responses: any[]
}

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

function shortenLabel(label: string) {
  return label.split(' (')[0]
}

export default function AdminPage() {
const [activePanel, setActivePanel] = useState('reports')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const panel = params.get('panel')
    if (panel) setActivePanel(panel)
  }, [])

 const [menuOpen, setMenuOpen] = useState(false)
 const [mentors,     setMentors]     = useState<Mentor[]>([])
  const [scheduleMentorId, setScheduleMentorId] = useState('')
  const [scheduleDate,     setScheduleDate]     = useState('')
  const [scheduleStart,    setScheduleStart]    = useState('')
  const [scheduleEnd,      setScheduleEnd]      = useState('')
  const [scheduleBreak,    setScheduleBreak]    = useState('10')
  const [scheduleRecurrence, setScheduleRecurrence] = useState('none')
  const [scheduleUntil,    setScheduleUntil]    = useState('')
  const [scheduleType,     setScheduleType]     = useState('virtual')
  const [addingSchedule,   setAddingSchedule]   = useState(false)
  const [scheduleSuccess,  setScheduleSuccess]  = useState('')
  const [scheduleError,    setScheduleError]    = useState('')
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
const [bookingFilter, setBookingFilter] = useState<'all' | 'active' | 'completed' | 'cancelled' | 'available'>('all')
const [availableSlots, setAvailableSlots] = useState<any[]>([])
const [mentorFilter, setMentorFilter] = useState<string>('all')
const [transferringId, setTransferringId] = useState<string | null>(null)
const [transferMentorId, setTransferMentorId] = useState('')
const [transferring, setTransferring] = useState(false)
const [deletingMentorId, setDeletingMentorId] = useState<string | null>(null)
const [bookingSort, setBookingSort] = useState<'booked_at' | 'start_time_asc' | 'start_time_desc' | 'student_name'>('booked_at')

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
          width: 500,
          height: 500,
        })
      }

      if (checkinEl) {
        checkinEl.innerHTML = ''
       new (window as any).QRCode(checkinEl, {
          text: `https://www.otessaymentors.org/checkin?code=${process.env.NEXT_PUBLIC_CHECKIN_CODE}`,
          width: 500,
          height: 500,
        })
      }
    }
  }, [activePanel])

  useEffect(() => {
    if (activePanel === 'reports' && reports?.surveys?.mentorIssues?.length > 0 && typeof window !== 'undefined' && (window as any).Chart) {
      const canvas = document.getElementById('mentor-issues-chart') as HTMLCanvasElement
      if (!canvas) return

      const existingChart = (window as any).Chart.getChart(canvas)
      if (existingChart) existingChart.destroy()
      if ((window as any).ChartDataLabels) {
        (window as any).Chart.register((window as any).ChartDataLabels)
      }
      const issues = reports.surveys.mentorIssues
      new (window as any).Chart(canvas, {
        type: 'bar',
        data: {
          labels: issues.map((m: any) => m.mentorName),
          datasets: [
            { label: 'Late', data: issues.map((m: any) => m.lateCount), backgroundColor: '#C9851A' },
            { label: "Wouldn't work with again", data: issues.map((m: any) => m.wouldNotWorkAgainCount), backgroundColor: '#E24B4A' },
            { label: 'No next steps given', data: issues.map((m: any) => m.noNextStepsCount), backgroundColor: '#888780' },
          ],
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: { stacked: true, beginAtZero: true, ticks: { stepSize: 1 } },
            y: { stacked: true },
          },
          plugins: {
            legend: { display: false },
           datalabels: {
              color: '#ffffff',
              font: { weight: 500, size: 12 },
              formatter: (value: number) => value > 0 ? value : '',
              anchor: 'end',
              align: 'start',
            },
          },
        },
      })
    }
  }, [activePanel, reports])
  useEffect(() => {
    if (activePanel === 'reports' && reports?.demographics && typeof window !== 'undefined' && (window as any).Chart) {
const pieColors = ['#534AB7', '#1D9E75', '#D85A30', '#D4537E', '#888780', '#378ADD', '#E8A838', '#9B59B6', '#16A085', '#C0392B', '#2C7BB6', '#F4A261']
    function renderPie(canvasId: string, entries: [string, number][]) {
        const canvas = document.getElementById(canvasId) as HTMLCanvasElement
        if (!canvas) return
        const existing = (window as any).Chart.getChart(canvas)
        if (existing) existing.destroy()

        new (window as any).Chart(canvas, {
          type: 'pie',
          data: {
            labels: entries.map(([label, count]) => `${label} (${count})`),
            datasets: [{
              data: entries.map(([, count]) => count),
              backgroundColor: entries.map((_, i) => pieColors[i % pieColors.length]),
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } },
              datalabels: {
                color: '#ffffff',
                font: { weight: 500, size: 12 },
                formatter: (value: number) => value > 0 ? value : '',
              },
            },
          },
        })
      }
      renderPie('pie-lgbtq', reports.demographics.lgbtq)
      renderPie('pie-mentor-activity', reports.mentorActivity)
      renderPie('pie-first-gen', reports.demographics.firstGen)
      renderPie('pie-private-counselor', reports.demographics.privateCounselor)
      renderPie('pie-lgbtq', reports.demographics.lgbtq)
      renderPie('pie-immigrants', reports.demographics.immigrants)
      renderPie('pie-teachers', reports.demographics.teachers)

      function renderHorizontalBar(canvasId: string, entries: [string, number][]) {
        const canvas = document.getElementById(canvasId) as HTMLCanvasElement
        if (!canvas) return
        const existing = (window as any).Chart.getChart(canvas)
        if (existing) existing.destroy()

        const sorted = [...entries].sort((a, b) => b[1] - a[1])
        const barColors = ['#534AB7', '#1D9E75', '#D85A30', '#D4537E', '#378ADD', '#BA7517', '#639922', '#888780', '#993556', '#0F6E56']

        new (window as any).Chart(canvas, {
          type: 'bar',
          data: {
            labels: sorted.map(([label]) => shortenLabel(label)),
            datasets: [{
              data: sorted.map(([, count]) => count),
              backgroundColor: sorted.map((_, i) => barColors[i % barColors.length]),
            }],
          },
          options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              x: { beginAtZero: true, ticks: { stepSize: 1 } },
            },
            plugins: {
              legend: { display: false },
              datalabels: {
                color: '#ffffff',
                font: { weight: 500, size: 12 },
                formatter: (value: number) => value > 0 ? value : '',
                anchor: 'end',
                align: 'start',
              },
            },
          },
        })
      }

      renderHorizontalBar('bar-ethnicity', reports.demographics.ethnicity)
      renderHorizontalBar('bar-help-with', reports.demographics.helpWith)
    }
  }, [activePanel, reports])

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

    const slotsRes  = await fetch('/api/admin/slots/available')
    const slotsData = await slotsRes.json()
    setAvailableSlots(slotsData ?? [])

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

   const res = await fetch('/api/admin/mentors/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName: newName.trim(), email: newEmail.trim().toLowerCase() }),
    })
    const data = await res.json()
    const error = res.ok ? null : { message: data.error }

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
    { key: 'bookings',  label: 'Bookings' },
    { key: 'mentors',   label: 'Mentors' },
    { key: 'schedules', label: 'Scheduling' },
    { key: 'qrcodes',   label: 'QR Codes' },
    { key: 'calendar',  label: 'Google Calendar' },
    { key: 'session',   label: 'End Session' },
  ]

  return (
    <div className="mentor-layout" style={{ display: 'flex', minHeight: '100vh', background: '#f5f4f0' }}>
     
     {/* Mobile hamburger button — admin */}
      <div className="hamburger-btn" style={{ display: 'none' }}>
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
          background: '#ffffff', borderBottom: '0.5px solid #e8e6de',
          padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <p style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>Admin</p>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', padding: '0 4px' }}
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
        {menuOpen && (
          <div style={{
            position: 'fixed', top: 49, left: 0, right: 0, bottom: 0,
            background: '#ffffff', zIndex: 99, overflowY: 'auto',
            borderTop: '0.5px solid #e8e6de',
          }}>
            {navItems.map(item => (
              <button
                key={item.key}
                onClick={() => { setActivePanel(item.key); setMenuOpen(false) }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '14px 20px', fontSize: 15, cursor: 'pointer',
                  background: activePanel === item.key ? '#f5f4f0' : 'transparent',
                  color: activePanel === item.key ? '#2C2C2A' : '#5F5E5A',
                  fontWeight: activePanel === item.key ? 500 : 400,
                  border: 'none', borderBottom: '0.5px solid #e8e6de',
                }}
              >
                {item.label}
              </button>
            ))}
           <div style={{ padding: '16px 20px', borderTop: '0.5px solid #e8e6de' }}>
              <a href="/" style={{ display: 'block', fontSize: 14, color: '#888780', textDecoration: 'none', marginBottom: 12 }}>
                ← Home
              </a>
              <button
                onClick={handleSignOut}
                style={{ fontSize: 14, color: '#888780', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                Sign out
              </button>
           </div>
          </div>
        )}
      </div>

      {/* Sidebar */}
    <div className="admin-sidebar" style={{
        width: 200, flexShrink: 0, background: '#ffffff',
        borderRight: '0.5px solid #e8e6de',
        display: 'flex', flexDirection: 'column', padding: '16px 0',
        position: 'sticky', top: 0, height: '100vh', overflowY: 'auto',
      }}>
        <div style={{ padding: '12px 16px 16px', borderBottom: '0.5px solid #e8e6de', marginBottom: 8 }}>
          <p style={{ fontSize: 13, fontWeight: 500, margin: '0 0 2px' }}>Admin</p>
<p style={{ fontSize: 11, color: '#888780', margin: 0 }}>Oakland Tech<br />College Essay Mentor Program</p>        </div>

        {navItems.map(item => (
          <button
            key={item.key}
onClick={() => {
              setActivePanel(item.key)
              const url = new URL(window.location.href)
              url.searchParams.set('panel', item.key)
              window.history.pushState({}, '', url)
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
                 <button onClick={addMentor} disabled={adding} style={{ 
                        fontSize: 12, whiteSpace: 'nowrap',
                        background: newName && newEmail ? '#534AB7' : undefined,
                        color: newName && newEmail ? '#ffffff' : undefined,
                        border: newName && newEmail ? 'none' : undefined,
                      }}>
                      {adding ? 'Adding...' : 'Add mentor'}
                    </button>
                  </div>
                </div>

               {/* Mentor list */}
                <div style={{ background: '#ffffff', border: '0.5px solid #e8e6de', borderRadius: 12, padding: '.75rem 1rem' }}>
                 {mentors.filter(m => m.is_active).map(mentor => (
                    <div key={mentor.id} style={{
                      padding: '10px 0', borderBottom: '0.5px solid #e8e6de',
                    }}>
                      {/* Top row: avatar + name/email */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%',
                          background: '#EEEDFE', display: 'flex', alignItems: 'center',
                          justifyContent: 'center', fontSize: 11, fontWeight: 500,
                          color: '#3C3489', flexShrink: 0,
                        }}>
                          {mentor.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontWeight: 500, fontSize: 13, margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mentor.full_name}</p>
                          <p style={{ fontSize: 12, color: '#888780', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mentor.email}</p>
                        </div>
                      </div>
                      {/* Bottom row: badges + buttons */}
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
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
                          {mentor.is_virtual_available ? 'No virtual' : 'Add to virtual'}
                        </button>
                        <span style={{
                          fontSize: 11, padding: '2px 8px', borderRadius: 20,
                          background: '#E1F5EE', color: '#085041',
                        }}>
                          Active
                        </span>
                        <button
                          onClick={() => toggleMentorActive(mentor)}
                          style={{ fontSize: 12, padding: '4px 10px' }}
                        >
                          Deactivate
                        </button>
                      </div>
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
                          padding: '10px 0', borderBottom: '0.5px solid #e8e6de',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                            <div style={{
                              width: 32, height: 32, borderRadius: '50%',
                              background: '#EEEDFE', display: 'flex', alignItems: 'center',
                              justifyContent: 'center', fontSize: 11, fontWeight: 500,
                              color: '#3C3489', flexShrink: 0,
                            }}>
                              {mentor.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontWeight: 500, fontSize: 13, margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mentor.full_name}</p>
                              <p style={{ fontSize: 12, color: '#888780', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mentor.email}</p>
                            </div>
                          </div>
                       <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
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
                            {deletingMentorId === mentor.id ? (
                              <>
                                <button
                                  onClick={async () => {
                                    await fetch(`/api/admin/mentors/delete`, {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ mentorId: mentor.id }),
                                    })
                                    setDeletingMentorId(null)
                                    loadData()
                                  }}
                                  style={{ fontSize: 12, padding: '4px 10px', background: '#E24B4A', color: '#ffffff', border: 'none' }}
                                >
                                  Confirm delete
                                </button>
                                <button
                                  onClick={() => setDeletingMentorId(null)}
                                  style={{ fontSize: 12, padding: '4px 10px' }}
                                >
                                  Never mind
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => setDeletingMentorId(mentor.id)}
                                style={{ fontSize: 12, padding: '4px 10px', color: '#791F1F', borderColor: '#F09595' }}
                              >
                                Delete
                              </button>
                            )}
                          </div>
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
             <p style={{ fontSize: 13, color: '#888780', margin: '0 0 16px' }}>
                  {bookings.filter(b => !b.cancelled_at && new Date((b.appointment_slots as any)?.start_time) >= new Date()).length} active ·{' '}
                  {bookings.filter(b => !b.cancelled_at && new Date((b.appointment_slots as any)?.start_time) < new Date()).length} completed ·{' '}
                  {bookings.filter(b => b.cancelled_at).length} cancelled
                </p>

       {/* Filters */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12, alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {(['all', 'active', 'completed', 'cancelled', 'available'] as const).map(f => (
                      <button
                        key={f}
                        onClick={() => setBookingFilter(f)}
                        style={{
                          fontSize: 12, padding: '4px 12px', borderRadius: 20,
                          background: bookingFilter === f ? '#534AB7' : '#ffffff',
                          color: bookingFilter === f ? '#ffffff' : '#5F5E5A',
                          border: `0.5px solid ${bookingFilter === f ? '#534AB7' : '#D3D1C7'}`,
                        }}
                      >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <select
                      value={mentorFilter}
                      onChange={e => setMentorFilter(e.target.value)}
                      style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20, height: 28, width: 'auto' }}
                    >
                      <option value="all">All mentors</option>
                      {mentors.filter(m => m.full_name !== process.env.PROGRAM_ACCOUNT_EMAIL).map(m => (
                        <option key={m.id} value={m.full_name}>{m.full_name}</option>
                      ))}
                    </select>
                    <select
                      value={bookingSort}
                      onChange={e => setBookingSort(e.target.value as any)}
                      style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20, height: 28, width: 'auto' }}
                    >
                      <option value="booked_at">Most recent booking</option>
                      <option value="start_time_asc">Appointment date ↑</option>
                      <option value="start_time_desc">Appointment date ↓</option>
                      <option value="student_name">Student name</option>
                    </select>
                  </div>
                </div>

               {bookingFilter !== 'available' && <div style={{ background: '#ffffff', border: '0.5px solid #e8e6de', borderRadius: 12, padding: '.75rem 1rem' }}>
              {bookings.filter(booking => {
                    const startTime = (booking.appointment_slots as any)?.start_time
                    const isPast = startTime ? new Date(startTime) < new Date() : false
                    const mentorName = (booking.appointment_slots as any)?.mentor_profiles?.full_name ?? ''

                    if (bookingFilter === 'active' && (booking.cancelled_at || isPast)) return false
                    if (bookingFilter === 'completed' && (booking.cancelled_at || !isPast)) return false
                    if (bookingFilter === 'cancelled' && !booking.cancelled_at) return false
                    if (mentorFilter !== 'all' && mentorName !== mentorFilter) return false
               return true
                  }).sort((a, b) => {
                    if (bookingSort === 'student_name') return a.student_name.localeCompare(b.student_name)
                    if (bookingSort === 'start_time_asc') {
                      const aTime = (a.appointment_slots as any)?.start_time ?? ''
                      const bTime = (b.appointment_slots as any)?.start_time ?? ''
                      return aTime.localeCompare(bTime)
                    }
                    if (bookingSort === 'start_time_desc') {
                      const aTime = (a.appointment_slots as any)?.start_time ?? ''
                      const bTime = (b.appointment_slots as any)?.start_time ?? ''
                      return bTime.localeCompare(aTime)
                    }
                return new Date(b.booked_at).getTime() - new Date(a.booked_at).getTime()
                  }).map(booking => {
                    const startTime = (booking.appointment_slots as any)?.start_time
                    const isPast = startTime ? new Date(startTime) < new Date() : false

                    return (
                   <div key={booking.id} style={{
                      padding: '10px 0', borderBottom: '0.5px solid #e8e6de',
                    }}>
                      {/* Top row: name + status badge */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 2 }}>
                        <a href={`/mentor/students/${encodeURIComponent((booking as any).student_email)}`} style={{ fontWeight: 500, fontSize: 13, color: '#534AB7', textDecoration: 'none' }}>{booking.student_name}</a>
                        <span style={{
                          fontSize: 11, padding: '2px 8px', borderRadius: 20, flexShrink: 0,
                          background: booking.cancelled_at ? '#F1EFE8' : (isPast ? '#EEEDFE' : '#E1F5EE'),
                          color: booking.cancelled_at ? '#5F5E5A' : (isPast ? '#3C3489' : '#085041'),
                        }}>
                          {booking.cancelled_at ? 'Cancelled' : (isPast ? 'Completed' : 'Active')}
                        </span>
                      </div>
                      {/* Second row: email */}
                      <p style={{ fontSize: 12, color: '#888780', margin: '0 0 1px' }}>
                        {booking.student_email}
                      </p>
                      {/* Third row: mentor · date · time */}
                      <p style={{ fontSize: 12, color: '#888780', margin: 0 }}>
                        {(booking.appointment_slots as any)?.mentor_profiles?.full_name?.split(' ')[0]} ·{' '}
                        {(booking.appointment_slots as any)?.start_time
                          ? format(parseISO((booking.appointment_slots as any).start_time), 'MMM d · h:mm a')
                          : 'No slot'}
                      </p>
                     {booking.cancelled_at && (
                        <p style={{ fontSize: 11, color: '#E24B4A', margin: '2px 0 0' }}>
                          Canceled {formatDateTimePST(booking.cancelled_at)}
                        </p>
                      )}
{booking.sms_consent ? (
                        <span style={{ fontSize: 11, padding: '1px 6px', borderRadius: 20, marginRight: 4,
                          background: booking.sms_confirmed_at ? '#E1F5EE' : (booking.sms_confirm_sent ? '#FAEEDA' : '#F1EFE8'),
                          color: booking.sms_confirmed_at ? '#085041' : (booking.sms_confirm_sent ? '#854F0B' : '#5F5E5A'),
                        }}>
                          {booking.sms_confirmed_at ? 'SMS confirmed' : (booking.sms_confirm_sent ? 'No reply' : 'No reply')}
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, padding: '1px 6px', borderRadius: 20, background: '#F1EFE8', color: '#5F5E5A', marginRight: 4 }}>
                          No SMS consent
                        </span>
                      )}
{(booking as any).survey_responses?.some((s: any) => s.additional_answers?.no_show === 'Yes') && (                        <span style={{ fontSize: 11, padding: '1px 6px', borderRadius: 20, background: '#FCEBEB', color: '#791F1F', marginRight: 4 }}>
                          No-show
                        </span>
                      )}
{(booking as any).survey_responses?.some((s: any) => s.additional_answers?.meet_issue === 'Yes') && (                        <span style={{ fontSize: 11, padding: '1px 6px', borderRadius: 20, background: '#FAEEDA', color: '#854F0B' }}>
                          Connection issue
                        </span>
                      )}

                      {!booking.cancelled_at && !isPast && (
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

                      {/* Transfer button */}
                      {!booking.cancelled_at && !isPast && (
                        transferringId === booking.id ? (
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 6 }}>
                            <select
                              value={transferMentorId}
                              onChange={e => setTransferMentorId(e.target.value)}
                              style={{ fontSize: 12, padding: '4px 8px', borderRadius: 6 }}
                            >
                              <option value="">Select new mentor</option>
                              {mentors
                                .filter(m => m.is_active && m.id !== (booking.appointment_slots as any)?.mentor_profiles?.id)
                                .map(m => (
                                  <option key={m.id} value={m.id}>{m.full_name}</option>
                                ))
                              }
                            </select>
                            <button
                              onClick={async () => {
                                if (!transferMentorId) return
                                setTransferring(true)
                                const res = await fetch('/api/admin/bookings/transfer', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ bookingId: booking.id, newMentorId: transferMentorId }),
                                })
                                const data = await res.json()
                                setTransferring(false)
                                setTransferringId(null)
                                setTransferMentorId('')
                                if (res.ok) {
                                  loadData()
                                } else {
                                  alert(data.error ?? 'Transfer failed')
                                }
                              }}
                              disabled={!transferMentorId || transferring}
                              style={{ fontSize: 12, padding: '4px 10px', background: '#534AB7', color: '#fff', border: 'none' }}
                            >
                              {transferring ? 'Transferring...' : 'Confirm'}
                            </button>
                            <button
                              onClick={() => { setTransferringId(null); setTransferMentorId('') }}
                              style={{ fontSize: 12, padding: '4px 10px' }}
                            >
                              Never mind
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setTransferringId(booking.id)}
                            style={{ fontSize: 12, padding: '4px 10px', color: '#534AB7', borderColor: '#C9C5F7' }}
                          >
                            Transfer
                          </button>
                        )
                      )}
                   </div>
                  )})}
             </div>}

                {bookingFilter === 'available' && (
                  <div style={{ background: '#ffffff', border: '0.5px solid #e8e6de', borderRadius: 12, padding: '.75rem 1rem' }}>
                    {availableSlots.length === 0 ? (
                      <p style={{ color: '#888780', fontSize: 13, padding: '10px 0' }}>No available slots.</p>
                    ) : (
                    [...availableSlots].sort((a, b) => {
                          if (bookingSort === 'start_time_desc') return new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
                          if (bookingSort === 'student_name') return 0
                          return new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
                        }).map((slot: any) => {
                        const isPast = new Date(slot.start_time) < new Date()
                        return (
                          <div key={slot.id} style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '10px 0', borderBottom: '0.5px solid #e8e6de',
                          }}>
                            <div style={{ flex: 1 }}>
                              <p style={{ fontWeight: 500, fontSize: 13, margin: '0 0 2px' }}>
                                {slot.mentor_profiles?.full_name}
                              </p>
                              <p style={{ fontSize: 12, color: '#888780', margin: 0 }}>
                                {formatDateTimePST(slot.start_time)}
                              </p>
                            </div>
                            <span style={{
                              fontSize: 11, padding: '2px 8px', borderRadius: 20,
                              background: isPast ? '#F1EFE8' : '#E1F5EE',
                              color: isPast ? '#5F5E5A' : '#085041',
                            }}>
                              {isPast ? 'Past' : 'Available'}
                            </span>
                         </div>
                        )
                   })
                    )}
                  </div>
                )}
              </div>
            )}

{/* REPORTS */}
            {activePanel === 'reports' && (
              <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <div>
                    <h1 style={{ fontSize: 20, fontWeight: 500, margin: '0 0 4px' }}>Reports</h1>
                    <p style={{ fontSize: 13, color: '#888780', margin: 0 }}>Program statistics and demographics - if not loading, refresh by pressing Command + R</p>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {reports && (
                    <button
                        onClick={() => {
                          window.location.href = '/api/admin/reports/export'
                        }}
                        style={{ fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
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
                      { label: 'Expired slots', value: reports.bookings.unbookedSlots },
                        { label: 'Total offered', value: reports.bookings.totalSlots },
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
                     {/* Mentor issues - full width, moved to top */}
                      {reports.surveys.mentorIssues?.length > 0 && (
                        <div style={{ marginBottom: 20 }}>
                          <p style={{ fontSize: 13, fontWeight: 500, margin: '0 0 8px' }}>
                            Flagged mentor issues
                          </p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 8, fontSize: 12, color: '#888780' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span style={{ width: 10, height: 10, borderRadius: 2, background: '#C9851A' }} />
                              Late
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span style={{ width: 10, height: 10, borderRadius: 2, background: '#E24B4A' }} />
                              Wouldn't work with again
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span style={{ width: 10, height: 10, borderRadius: 2, background: '#888780' }} />
                              No next steps given
                            </span>
                          </div>
                          <div style={{ background: '#ffffff', border: '0.5px solid #e8e6de', borderRadius: 12, padding: '1rem', position: 'relative', height: Math.max(reports.surveys.mentorIssues.length * 40 + 80, 160) }}>
                            <canvas id="mentor-issues-chart" role="img" aria-label="Bar chart of flagged mentor issues by type"></canvas>
                          </div>
                        </div>
                      )}

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
                        <div style={{ background: '#ffffff', border: '0.5px solid #e8e6de', borderRadius: 12, padding: '.75rem 1rem', position: 'relative', height: 240 }}>
                          <canvas id="pie-mentor-activity" role="img" aria-label="Pie chart of appointments per mentor"></canvas>
                        </div>
                      </div>
                      
                 {/* Teacher distribution */}
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 500, margin: '0 0 10px' }}>Senior English / Advisory teacher</p>
                        <div style={{ background: '#ffffff', border: '0.5px solid #e8e6de', borderRadius: 12, padding: '.75rem 1rem', position: 'relative', height: 220 }}>
                          <canvas id="pie-teachers" role="img" aria-label="Pie chart of senior English and advisory teacher distribution"></canvas>
                        </div>
                      </div>

                      {/* Private counselor */}
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 500, margin: '0 0 10px' }}>Using private counselor</p>
                        <div style={{ background: '#ffffff', border: '0.5px solid #e8e6de', borderRadius: 12, padding: '.75rem 1rem', position: 'relative', height: 200 }}>
                          <canvas id="pie-private-counselor" role="img" aria-label="Pie chart of private counselor usage responses"></canvas>
                        </div>
                      </div>

  {/* What they want help with */}
                      <div style={{ gridColumn: '1 / -1' }}>
                        <p style={{ fontSize: 14, fontWeight: 500, margin: '0 0 10px' }}>What students want help with</p>
                        <div style={{ background: '#ffffff', border: '0.5px solid #e8e6de', borderRadius: 12, padding: '1rem', position: 'relative', height: Math.max(reports.demographics.helpWith.length * 40 + 60, 160) }}>
                          <canvas id="bar-help-with" role="img" aria-label="Horizontal bar chart of what students want help with"></canvas>
                        </div>
                      </div>

                      {/* LGBTQ */}
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 500, margin: '0 0 10px' }}>LGBTQIAA+ / Gender nonconforming</p>
                        <div style={{ background: '#ffffff', border: '0.5px solid #e8e6de', borderRadius: 12, padding: '.75rem 1rem', position: 'relative', height: 200 }}>
                          <canvas id="pie-lgbtq" role="img" aria-label="Pie chart of LGBTQIAA+ and gender nonconforming responses"></canvas>
                        </div>
                      </div>

                      {/* Immigrants */}
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 500, margin: '0 0 10px' }}>Immigrant family</p>
                        <div style={{ background: '#ffffff', border: '0.5px solid #e8e6de', borderRadius: 12, padding: '.75rem 1rem', position: 'relative', height: 200 }}>
                          <canvas id="pie-immigrants" role="img" aria-label="Pie chart of immigrant family status responses"></canvas>
                        </div>
                      </div>

  {/* First gen */}
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 500, margin: '0 0 10px' }}>First in family going to college</p>
                        <div style={{ background: '#ffffff', border: '0.5px solid #e8e6de', borderRadius: 12, padding: '.75rem 1rem', position: 'relative', height: 200 }}>
                          <canvas id="pie-first-gen" role="img" aria-label="Pie chart of first generation college student responses"></canvas>
                        </div>
                      </div>

                  {/* Ethnicity - full width */}
                      <div style={{ gridColumn: '1 / -1' }}>
                          <p style={{ fontSize: 14, fontWeight: 500, margin: '0 0 10px' }}>Ethnicity</p>
                        <div style={{ background: '#ffffff', border: '0.5px solid #e8e6de', borderRadius: 12, padding: '1rem', position: 'relative', height: Math.max(reports.demographics.ethnicity.length * 40 + 60, 160) }}>
                          <canvas id="bar-ethnicity" role="img" aria-label="Horizontal bar chart of ethnicity responses, students may select multiple"></canvas>
                        </div>
                        {reports.demographics.ethnicityOther?.length > 0 && (
                          <p style={{ fontSize: 12, color: '#5F5E5A', margin: '8px 0 0' }}>
                            <strong>Other responses:</strong> {reports.demographics.ethnicityOther.join(', ')}
                          </p>
                        )}
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
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                  <div>
                    <h1 style={{ fontSize: 20, fontWeight: 500, margin: '0 0 4px' }}>QR Codes</h1>
                    <p style={{ fontSize: 13, color: '#888780', margin: 0 }}>
                      Print these for students to scan and skip typing the access code
                    </p>
                  </div>
                  <button
                    onClick={() => window.print()}
                    style={{ fontSize: 13, padding: '8px 16px', background: '#534AB7', color: '#ffffff', border: 'none', borderRadius: 8, cursor: 'pointer' }}
                  >
                    🖨️ Print QR Codes
                  </button>
                </div>

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

            {/* SCHEDULES */}
            {activePanel === 'schedules' && (
              <div>
                <h1 style={{ fontSize: 20, fontWeight: 500, margin: '0 0 4px' }}>Create mentor schedule</h1>
                <p style={{ fontSize: 13, color: '#888780', margin: '0 0 20px' }}>
                  Add availability on behalf of a mentor
                </p>

                {scheduleSuccess && (
                  <div style={{ background: '#E1F5EE', border: '0.5px solid #5DCAA5', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#085041' }}>
                    {scheduleSuccess}
                  </div>
                )}
                {scheduleError && (
                  <div style={{ background: '#FCEBEB', border: '0.5px solid #F09595', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#791F1F' }}>
                    {scheduleError}
                  </div>
                )}

                <div style={{ background: '#ffffff', border: '0.5px solid #e8e6de', borderRadius: 12, padding: '1.25rem', marginBottom: 16 }}>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#5F5E5A', marginBottom: 4 }}>Mentor</label>
                    <select value={scheduleMentorId} onChange={e => setScheduleMentorId(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }}>
                      <option value="">Select a mentor</option>
                      {mentors.filter(m => m.is_active).map(m => (
                        <option key={m.id} value={m.id}>{m.full_name}</option>
                      ))}
                    </select>
                  </div>

<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 12 }}>                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#5F5E5A', marginBottom: 4 }}>Date</label>
<input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} min="2025-01-01" max="2030-12-31" style={{ width: '100%', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#5F5E5A', marginBottom: 4 }}>Available from</label>
                      <input
                        type="time"
                        value={scheduleStart}
                        onChange={e => setScheduleStart(e.target.value)}
                        list="admin-start-times"
                        min="09:00"
                        max="21:00"
                        style={{ width: '100%', boxSizing: 'border-box' }}
                      />
                      <datalist id="admin-start-times">
                        {timeOptions.map(t => (
                          <option key={t.value} value={t.value} />
                        ))}
                      </datalist>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#5F5E5A', marginBottom: 4 }}>Available until</label>
                      <input
                        type="time"
                        value={scheduleEnd}
                        onChange={e => setScheduleEnd(e.target.value)}
                        list="admin-end-times"
                        min={scheduleStart || "09:00"}
                        max="21:00"
                        style={{ width: '100%', boxSizing: 'border-box' }}
                      />
                      <datalist id="admin-end-times">
                        {generateTimeOptions(scheduleStart).map(t => (
                          <option key={t.value} value={t.value} />
                        ))}
                      </datalist>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#5F5E5A', marginBottom: 4 }}>Break between</label>
                      <select value={scheduleBreak} onChange={e => setScheduleBreak(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }}>
                        <option value="10">10 minutes</option>
                        <option value="5">5 minutes</option>
                      </select>
                    </div>
                  </div>

<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, alignItems: 'end', marginBottom: 12 }}>                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#5F5E5A', marginBottom: 4 }}>Repeat</label>
                      <select value={scheduleRecurrence} onChange={e => setScheduleRecurrence(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }}>
                        <option value="none">One time only</option>
                        <option value="daily">Every day</option>
                        <option value="weekly">Every week</option>
                        <option value="biweekly">Every 2 weeks</option>
                      </select>
                    </div>
                    {scheduleRecurrence !== 'none' && (
                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#5F5E5A', marginBottom: 4 }}>Repeat until</label>
                        <input
                          type="date"
                          value={scheduleUntil}
                          onChange={e => setScheduleUntil(e.target.value)}
                          style={{ width: '100%', boxSizing: 'border-box' }}
                        />
                      </div>
                    )}
                    <button
                      onClick={async () => {
                        if (!scheduleMentorId) {
                          setScheduleError('Please select a mentor.')
                          return
                        }
                        if (!scheduleDate || !scheduleStart || !scheduleEnd) {
                          setScheduleError('Please fill in the date, start time, and end time.')
                          return
                        }
                        setAddingSchedule(true)
                        setScheduleError('')
                        setScheduleSuccess('')

                        const breakMinutes = parseInt(scheduleBreak)
                        const slotDuration = 20
                        const intervalMins = slotDuration + breakMinutes

                        const windowStart = new Date(`${scheduleDate}T${scheduleStart}:00`)
                        const windowEnd   = new Date(`${scheduleDate}T${scheduleEnd}:00`)

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
                          setScheduleError('No slots fit in that time window. Please check your times.')
                          setAddingSchedule(false)
                          return
                        }

                        let data: any = {}
                        try {
                          const res = await fetch('/api/admin/schedules', {
                            method:  'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body:    JSON.stringify({
                              mentorId:        scheduleMentorId,
                              slotTimes,
                              durationMinutes: 20,
                              meetingType:     scheduleType,
                              recurrenceRule:  scheduleRecurrence === 'none' ? null : scheduleRecurrence,
                              recurrenceUntil: scheduleRecurrence === 'none' ? null : scheduleUntil,
                            }),
                          })
                          data = await res.json()
                          if (!res.ok) {
                            setScheduleError(data.error ?? 'Something went wrong.')
                            setAddingSchedule(false)
                            return
                          }
                        } catch {
                          setScheduleError('Server error. Please try again.')
                          setAddingSchedule(false)
                          return
                        }

                        setAddingSchedule(false)
                        setScheduleSuccess(`${data.slotsCreated} slot${data.slotsCreated !== 1 ? 's' : ''} added! Generating Google Meet links...`)
                        setScheduleDate('')
                        setScheduleStart('')
                        setScheduleEnd('')
                        setScheduleRecurrence('none')
                        setScheduleUntil('')

                        // Auto-sync calendar after a few seconds
                        setTimeout(async () => {
                          const syncRes = await fetch('/api/slots/sync-calendar-for-mentor', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ mentorId: scheduleMentorId }),
                          })
                          if (syncRes.ok) {
                            setScheduleSuccess(`${data.slotsCreated} slot${data.slotsCreated !== 1 ? 's' : ''} added with Google Meet links!`)
                          }
                        }, 3000)
                      }}
                      disabled={addingSchedule}
                      style={{ background: '#534AB7', color: '#ffffff', border: 'none', padding: '8px 20px', whiteSpace: 'nowrap', fontSize: 13, fontWeight: 500 }}
                    >
                      {addingSchedule ? 'Saving...' : 'Save schedule'}
                    </button>
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