'use client'
import { useEffect, useState, use } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import { format, parseISO } from 'date-fns'

type BookingWithAnswers = {
  id: string
  student_name: string
  student_email: string
  student_phone: string | null
  booked_at: string
  appointment_slots: {
    start_time: string
    end_time: string
    meeting_type: string
    google_meet_link: string | null
  }
  booking_question_answers: {
    answer_text: string
    intake_questions: {
      question_text: string
      sort_order: number
    }
  }[]
  student_essays: {
    id: string
    essay_type: string
    google_doc_url: string | null
    file_name: string | null
    file_path: string | null
    note_to_mentor: string | null
    uploaded_at: string
    signed_url?: string | null
  }[]
}



function shortenLabel(label: string) {
  return label.split(' (')[0]
}

export default function StudentProfilePage({

export default function StudentProfilePage({
  params,
}: {
  params: Promise<{ email: string }>
}) {
  const { email: emailParam } = use(params)
  const [bookings,  setBookings]  = useState<BookingWithAnswers[]>([])
  const [loading,   setLoading]   = useState(true)
  const [notes,     setNotes]     = useState<any[]>([])
  const [newNote,   setNewNote]   = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [mentorId,  setMentorId]  = useState<string | null>(null)
const [showAllEssays, setShowAllEssays] = useState(false)
  const router   = useRouter()
  const supabase = createClient()
const email = decodeURIComponent(emailParam)
  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: mentor } = await supabase
      .from('mentor_profiles')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (!mentor) { router.push('/login'); return }
    setMentorId(mentor.id)

    // Get all bookings for this student
    const res = await fetch(`/api/mentor/students/${encodeURIComponent(email)}`)
    const data = await res.json()
    setBookings(data.bookings ?? [])
    setNotes(data.notes ?? [])
    setMentorId(data.mentorId)
    setLoading(false)
  }

  async function saveNote() {
    if (!newNote.trim() || !mentorId) return
    setSaving(true)

    const { data } = await supabase
      .from('mentor_student_notes')
      .insert({
        mentor_id:     mentorId,
        student_email: email,
        body:          newNote.trim(),
        is_private:    isPrivate,
      })
      .select('id, body, is_private, created_at, mentor_id, mentor_profiles(full_name)')
      .single()

    if (data) {
      setNotes(prev => [data, ...prev])
      setNewNote('')
      setIsPrivate(false)
    }
    setSaving(false)
  }

  async function deleteNote(noteId: string) {
    await supabase.from('mentor_student_notes').delete().eq('id', noteId)
    setNotes(prev => prev.filter(n => n.id !== noteId))
  }

 if (loading) return <p style={{ padding: '2rem', color: '#888780' }}>Loading...</p>

  const student      = bookings[0]
  const firstBooking = bookings[bookings.length - 1]

  const allEssays = bookings.flatMap(b => b.student_essays.map(e => ({ ...e, bookingDate: b.appointment_slots.start_time })))
    .sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime())

  const now = new Date()
  const upcomingBookings = bookings.filter(b => new Date(b.appointment_slots.start_time) >= now)
  const pastBookings     = bookings.filter(b => new Date(b.appointment_slots.start_time) < now)

  function renderBookingRow(booking: any) {
    const helpWith = booking.booking_question_answers?.find((a: any) => a.intake_questions.question_text === 'I Want Help With')?.answer_text
    const privateCounselor = booking.booking_question_answers?.find((a: any) => a.intake_questions.question_text === 'I am also working with a private counselor hired by my family')?.answer_text
    const mentorName = (booking.appointment_slots as any)?.mentor_profiles?.full_name

    return (
      <div key={booking.id} style={{ padding: '10px 0', borderBottom: '0.5px solid #e8e6de' }}>
        <p style={{ fontWeight: 500, fontSize: 14, margin: '0 0 2px' }}>
          {format(parseISO(booking.appointment_slots.start_time), 'MMMM d, yyyy')}
        </p>
        <p style={{ fontSize: 13, color: '#888780', margin: 0 }}>
          {mentorName ? `With ${mentorName} · ` : ''}
          {format(parseISO(booking.appointment_slots.start_time), 'h:mm a')} –{' '}
          {format(parseISO(booking.appointment_slots.end_time), 'h:mm a')} ·{' '}
          {booking.appointment_slots.meeting_type === 'in_person' ? 'In person' : 'Virtual'}
        </p>
        {(helpWith || privateCounselor) && (
          <p style={{ fontSize: 13, color: '#2C2C2A', margin: '6px 0 0' }}>
            {helpWith && `Help with: ${helpWith}`}
            {helpWith && privateCounselor && '  ·  '}
            {privateCounselor && `Private counselor: ${privateCounselor}`}
          </p>
        )}
      </div>
    )
  }

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '2rem 1rem' }}>

      {/* Back button */}
      <button
        onClick={() => router.back()}
        style={{ fontSize: 13, color: '#888780', background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 20px', display: 'block' }}
      >
        ← Back to dashboard
      </button>

      {/* Student header */}
      {student && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            background: '#E6F1FB', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 16, fontWeight: 500,
            color: '#0C447C', flexShrink: 0,
          }}>
            {student.student_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 500, margin: '0 0 2px' }}>
              {student.student_name}
            </h1>
            <p style={{ fontSize: 13, color: '#888780', margin: 0 }}>
              {student.student_email}
              {student.student_phone ? ` · ${student.student_phone}` : ''}
            </p>
          </div>
        </div>
      )}

      {upcomingBookings.length > 0 && (
        <div style={{
          background: '#ffffff',
          border: '0.5px solid #e8e6de',
          borderRadius: 12,
          padding: '1.25rem',
          marginBottom: 16,
        }}>
          <h2 style={{ fontSize: 15, fontWeight: 500, margin: '0 0 4px' }}>Upcoming appointment</h2>
          {upcomingBookings.map(renderBookingRow)}
        </div>
      )}

      {/* Intake info - demographic questions only asked on first booking */}
      {firstBooking && firstBooking.booking_question_answers?.length > 0 && (
        <div style={{
          background: '#ffffff',
          border: '0.5px solid #e8e6de',
          borderRadius: 12,
          padding: '1.25rem',
          marginBottom: 16,
        }}>
          <h2 style={{ fontSize: 15, fontWeight: 500, margin: '0 0 12px' }}>Intake info</h2>
       {[...firstBooking.booking_question_answers]
            .filter((a: any) => !['I Want Help With', 'I am also working with a private counselor hired by my family'].includes(a.intake_questions.question_text))
            .sort((a: any, b: any) => a.intake_questions.sort_order - b.intake_questions.sort_order)
            .map((answer, i) => (
              <div key={i} style={{
                display: 'flex', gap: 12,
                padding: '7px 0',
                borderBottom: '0.5px solid #e8e6de',
              }}>
                <p style={{ fontSize: 12, color: '#888780', margin: 0, width: 200, flexShrink: 0 }}>
                  {answer.intake_questions.question_text}
                </p>
               <p style={{ fontSize: 13, color: '#2C2C2A', margin: 0 }}>
                  {shortenLabel(answer.answer_text)}
                </p>
              </div>
            ))}
        </div>
      )}

      {/* Essays - all sessions, most recent 3 shown, expandable */}
      {allEssays.length > 0 && (
        <div style={{
          background: '#ffffff',
          border: '0.5px solid #e8e6de',
          borderRadius: 12,
          padding: '1.25rem',
          marginBottom: 16,
        }}>
          <h2 style={{ fontSize: 15, fontWeight: 500, margin: '0 0 12px' }}>
            Essays shared ({allEssays.length})
          </h2>
          {(showAllEssays ? allEssays : allEssays.slice(0, 3)).map(essay => (
            <div key={essay.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 0', borderBottom: '0.5px solid #e8e6de',
            }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 500, margin: '0 0 2px' }}>
                  {essay.essay_type === 'google_doc' ? 'Google Doc' : essay.file_name}
                  <span style={{ fontSize: 11, color: '#888780', fontWeight: 400, marginLeft: 8 }}>
                    {new Date(essay.uploaded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </p>
                {essay.note_to_mentor && (
                  <p style={{ fontSize: 12, color: '#888780', fontStyle: 'italic', margin: '2px 0 0' }}>
                    "{essay.note_to_mentor}"
                  </p>
                )}
              </div>
              {(essay.essay_type === 'google_doc' ? essay.google_doc_url : essay.signed_url) && (
                <a
                  href={essay.essay_type === 'google_doc' ? essay.google_doc_url ?? '' : essay.signed_url ?? ''}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 12, color: '#534AB7', textDecoration: 'none' }}
                >
                  Open
                </a>
              )}
            </div>
          ))}
          {allEssays.length > 3 && (
            <button
              onClick={() => setShowAllEssays(!showAllEssays)}
              style={{ fontSize: 12, marginTop: 8 }}
            >
              {showAllEssays ? 'Show less' : `Show all ${allEssays.length} essays`}
            </button>
          )}
        </div>
      )}

    <div style={{
        background: '#ffffff',
        border: '0.5px solid #e8e6de',
        borderRadius: 12,
        padding: '1.25rem',
        marginBottom: 16,
      }}>
        <h2 style={{ fontSize: 15, fontWeight: 500, margin: '0 0 4px' }}>Appointment history</h2>
        {pastBookings.length > 0 ? (
          pastBookings.map(renderBookingRow)
        ) : (
          <p style={{ fontSize: 13, color: '#888780', margin: 0 }}>No prior appointments.</p>
        )}
      </div>

      {/* Notes section */}
      <div style={{
        background: '#ffffff',
        border: '0.5px solid #e8e6de',
        borderRadius: 12,
        padding: '1.25rem',
        marginTop: 8,
      }}>
        <h2 style={{ fontSize: 15, fontWeight: 500, margin: '0 0 4px' }}>Notes</h2>
        <p style={{ fontSize: 12, color: '#888780', margin: '0 0 16px' }}>
          Shared notes are visible to all mentors who have worked with this student.
          Private notes are only visible to you.
        </p>

        {/* Existing notes */}
        {notes.map(note => (
          <div key={note.id} style={{
            background: note.is_private ? '#FAEEDA' : '#f5f4f0',
            borderRadius: 8,
            padding: '10px 12px',
            marginBottom: 8,
            position: 'relative',
          }}>
            <p style={{ fontSize: 13, lineHeight: 1.6, margin: '0 0 6px' }}>{note.body}</p>
            <p style={{ fontSize: 11, color: '#888780', margin: 0 }}>
              {note.mentor_profiles?.full_name ?? 'Mentor'} ·{' '}
              {format(parseISO(note.created_at), 'MMM d, yyyy')} ·{' '}
              {note.is_private ? '🔒 Private' : 'Shared'}
            </p>
            {note.mentor_id === mentorId && (
              <button
                onClick={() => deleteNote(note.id)}
                style={{
                  position: 'absolute', top: 10, right: 10,
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#888780', fontSize: 12, padding: 0,
                }}
              >
                Delete
              </button>
            )}
          </div>
        ))}

        {/* Add note */}
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: '#5F5E5A', marginBottom: 4 }}>
            Add a note
          </div>
          <textarea
            value={newNote}
            onChange={e => setNewNote(e.target.value)}
            rows={3}
            placeholder="Add a note about this student..."
            style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', marginBottom: 8 }}
          />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
           <button
              onClick={saveNote}
              disabled={saving || !newNote.trim()}
              style={{
                fontSize: 12,
                background: newNote.trim() ? '#534AB7' : undefined,
                color: newNote.trim() ? '#ffffff' : undefined,
                border: newNote.trim() ? 'none' : undefined,
              }}
            >
              {saving ? 'Saving...' : 'Save note'}
            </button>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#5F5E5A', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={e => setIsPrivate(e.target.checked)}
                style={{ width: 'auto' }}
              />
              Make this note private
            </label>
          </div>
        </div>
      </div>

    </main>
  )
}