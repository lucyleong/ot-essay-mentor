'use client'
import { useState } from 'react'

export default function EssayUploadPage({
  params,
}: {
  params: { bookingId: string }
}) {
  const [gdocUrl,    setGdocUrl]    = useState('')
  const [gdocNote,   setGdocNote]   = useState('')
  const [gdocError,  setGdocError]  = useState('')
  const [file,       setFile]       = useState<File | null>(null)
  const [fileNote,   setFileNote]   = useState('')
  const [fileError,  setFileError]  = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted,  setSubmitted]  = useState<string[]>([])

  async function submitGdoc() {
    if (!gdocUrl.includes('docs.google.com/document')) {
      setGdocError('Please paste a valid Google Docs link.')
      return
    }
    setGdocError('')
    setSubmitting(true)

    const res = await fetch(`/api/bookings/${params.bookingId}/essays`, {
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

    const res = await fetch(`/api/bookings/${params.bookingId}/essays`, {
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

      <h1 style={{ fontSize: 22, fontWeight: 500, margin: '0 0 4px' }}>
        Share your essay
      </h1>
      <p style={{ fontSize: 14, color: '#888780', margin: '0 0 24px', lineHeight: 1.6 }}>
        Please share your essay with your mentor before your appointment so they
        can review it ahead of time. You can share a Google Doc link, upload a
        file, or both.
      </p>

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
            Make sure your doc is set to "Anyone with the link can view" before sharing.
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
          style={{ width: '100%' }}
        >
          {submitting ? 'Sharing...' : 'Share Google Doc'}
        </button>
      </div>

      {/* Divider */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        margin: '16px 0', color: '#B4B2A9', fontSize: 12,
      }}>
        <div style={{ flex: 1, height: 0.5, background: '#e8e6de' }} />
        or upload a file
        <div style={{ flex: 1, height: 0.5, background: '#e8e6de' }} />
      </div>

      {/* File upload section */}
      <div style={{
        background: '#ffffff',
        border: '0.5px solid #e8e6de',
        borderRadius: 12,
        padding: '1.25rem',
      }}>
        <p style={{ fontWeight: 500, fontSize: 14, margin: '0 0 12px' }}>
          Upload a file
        </p>

        <label style={{
          display: 'block',
          border: '1.5px dashed #D3D1C7',
          borderRadius: 8,
          padding: 24,
          textAlign: 'center',
          cursor: 'pointer',
          marginBottom: 10,
        }}>
          <input
            type="file"
            accept=".pdf,.docx,.doc,.txt"
            style={{ display: 'none' }}
            onChange={e => {
              setFile(e.target.files?.[0] ?? null)
              setFileError('')
            }}
          />
          {file ? (
            <p style={{ margin: 0, fontSize: 13, fontWeight: 500 }}>{file.name}</p>
          ) : (
            <>
              <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 500 }}>
                Click to choose a file
              </p>
              <p style={{ margin: 0, fontSize: 12, color: '#888780' }}>
                PDF, Word (.docx), or plain text · max 10 MB
              </p>
            </>
          )}
        </label>

        {fileError && (
          <p style={{ fontSize: 12, color: '#E24B4A', margin: '0 0 10px' }}>{fileError}</p>
        )}

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#5F5E5A', marginBottom: 4 }}>
            Note to mentor (optional)
          </label>
          <textarea
            value={fileNote}
            onChange={e => setFileNote(e.target.value)}
            rows={2}
            placeholder="Any context you'd like your mentor to know..."
            style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical' }}
          />
        </div>

        <button
          onClick={submitFile}
          disabled={submitting || !file}
          style={{ width: '100%' }}
        >
          {submitting ? 'Uploading...' : 'Upload essay'}
        </button>
      </div>

    </main>
  )
}