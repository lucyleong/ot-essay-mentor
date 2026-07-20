'use client'
import { useState, useEffect, use } from 'react'

export default function EssayUploadPage({
  params,
}: {
  params: Promise<{ bookingId: string }>
}) {
  const { bookingId } = use(params)
 const [gdocUrl,    setGdocUrl]    = useState('')
  const [gdocNote,   setGdocNote]   = useState('')
  const [gdocError,  setGdocError]  = useState('')
  const [file,       setFile]       = useState<File | null>(null)
  const [fileNote,   setFileNote]   = useState('')
  const [fileError,  setFileError]  = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted,  setSubmitted]  = useState<string[]>([])
  const [mentorName, setMentorName] = useState<string | null>(null)
  const [mentorEmail, setMentorEmail] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/bookings/${bookingId}/mentor`)
      .then(r => r.json())
      .then(data => {
        if (data.mentorName) setMentorName(data.mentorName)
        if (data.mentorEmail) setMentorEmail(data.mentorEmail)
      })
      .catch(() => {})
  }, [bookingId])

  async function submitGdoc() {
    if (!gdocUrl.includes('docs.google.com/document')) {
      setGdocError('Please paste a valid Google Docs link.')
      return
    }
    setGdocError('')
    setSubmitting(true)

   const res = await fetch(`/api/bookings/${bookingId}/essays`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        googleDocUrl:  gdocUrl,
        noteToMentor:  gdocNote,
      }),
    })

    setSubmitting(false)
    if (res.ok) {
      setSubmitted(s => [...s, `Google Doc shared successfully`])
      setGdocUrl('')
      setGdocNote('')
    } else {
      const data = await res.json()
      setGdocError(data.error ?? 'Something went wrong. Please try again.')
    }
  }

  async function submitFile() {
    if (!file) return
    setFileError('')
    setSubmitting(true)

    const form = new FormData()
    form.append('file', file)
    form.append('noteToMentor', fileNote)

const res = await fetch(`/api/bookings/${bookingId}/essays`, {
        method: 'POST',
      body:   form,
    })

    const data = await res.json()
    setSubmitting(false)

    if (res.ok) {
      setSubmitted(s => [...s, `${file.name} uploaded successfully`])
      setFile(null)
      setFileNote('')
    } else {
      setFileError(data.error ?? 'Something went wrong. Please try again.')
    }
  }

  return (
   <main style={{ maxWidth: 560, margin: '0 auto', padding: '2rem 1rem' }}>

      <p style={{ fontSize: 11, fontWeight: 500, color: '#888780', letterSpacing: '.06em', textTransform: 'uppercase', margin: '0 0 4px' }}>
        Oakland Tech
      </p>
      <h1 style={{ fontSize: 22, fontWeight: 500, color: '#2C2C2A', margin: '0 0 20px' }}>
        College Essay Mentor Program
      </h1>

      <p style={{ fontSize: 15, color: '#2C2C2A', margin: '0 0 16px', lineHeight: 1.6 }}>
        Please share your essay via a Google Doc link before your appointment.
      </p>

     <div style={{ background: '#FFF8E6', border: '0.5px solid #F4C842', borderRadius: 10, padding: '12px 16px', marginBottom: 24 }}>
       <p style={{ fontSize: 13, color: '#7A5500', margin: 0, lineHeight: 1.6 }}>
          ⚠️ Make sure to set sharing to <strong>"Anyone with the link can comment"</strong> so your mentor can leave feedback directly in your doc.
          {mentorEmail && (
            <> If you'd rather keep this private, you can choose to just share commenter access with your mentor
            {mentorName ? ` (${mentorName})` : ''} at <a href={`mailto:${mentorEmail}`} style={{ color: '#534AB7' }}>{mentorEmail}</a>.</>
          )}
        </p>
      </div>

      {/* Success messages */}
      {submitted.length > 0 && (
        <div style={{
          background: '#E1F5EE',
          border: '0.5px solid #5DCAA5',
          borderRadius: 8,
          padding: '10px 14px',
          marginBottom: 16,
          fontSize: 13,
          color: '#085041',
        }}>
          {submitted.map((s, i) => <div key={i}>✓ {s}</div>)}
        </div>
      )}

      {/* Google Doc section */}
      <div style={{
        background: '#ffffff',
        border: '0.5px solid #e8e6de',
        borderRadius: 12,
        padding: '1.25rem',
        marginBottom: 12,
      }}>
        <p style={{ fontWeight: 500, fontSize: 14, margin: '0 0 12px' }}>
          Share a Google Doc
        </p>

        <div style={{ marginBottom: 10 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#5F5E5A', marginBottom: 4 }}>
            Google Doc link
          </label>
          <input
            type="url"
            value={gdocUrl}
            onChange={e => { setGdocUrl(e.target.value); setGdocError('') }}
            placeholder="https://docs.google.com/document/d/..."
            style={{ width: '100%', boxSizing: 'border-box' }}
          />
          {gdocError && (
            <p style={{ fontSize: 12, color: '#E24B4A', margin: '4px 0 0' }}>{gdocError}</p>
          )}
<p style={{ fontSize: 11, color: '#B4B2A9', margin: '4px 0 0' }}>
            Paste your Google Doc link above.
          </p>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#5F5E5A', marginBottom: 4 }}>
            Note to mentor (optional)
          </label>
          <textarea
            value={gdocNote}
            onChange={e => setGdocNote(e.target.value)}
            rows={2}
            placeholder="e.g. This is my UC personal insight draft — I'm struggling with question 1..."
            style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical' }}
          />
        </div>

        <button
          onClick={submitGdoc}
          disabled={submitting || !gdocUrl}
          style={{
            width: '100%',
            background: gdocUrl ? '#534AB7' : undefined,
            color: gdocUrl ? '#ffffff' : undefined,
            border: gdocUrl ? 'none' : undefined,
          }}
        >
          {submitting ? 'Sharing...' : 'Share Google Doc'}
        </button>
          </div>

    </main>
  )
}
