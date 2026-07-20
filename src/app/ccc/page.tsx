'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import { formatLocaleTimePST } from '@/lib/utils'

export default function CCCPage() {
  const supabase = createClient()
  const router = useRouter()
  const [queue, setQueue] = useState<any[]>([])
  const [mentors, setMentors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [assigningId, setAssigningId] = useState<string | null>(null)
  const [selectedMentor, setSelectedMentor] = useState<Record<string, string>>({})

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || user.app_metadata?.role !== 'ccc') {
        router.push('/login')
        return
      }
      loadData()
    }
    init()
  }, [])

  async function loadData() {
    const [queueRes, mentorsRes] = await Promise.all([
      fetch('/api/ccc/queue'),
      fetch('/api/ccc/mentors'),
    ])
    const queueData = await queueRes.json()
    const mentorsData = await mentorsRes.json()
    setQueue(queueData.queue ?? [])
    setMentors(mentorsData.mentors ?? [])
    setLoading(false)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>

  return (
    <main style={{ background: '#f5f4f0', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{
        background: '#534AB7', padding: '16px 24px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <p style={{ color: '#EEEDFE', fontSize: 11, fontWeight: 500, letterSpacing: '.06em', textTransform: 'uppercase', margin: '0 0 2px' }}>Oakland Tech</p>
          <h1 style={{ color: '#ffffff', fontSize: 18, fontWeight: 500, margin: 0 }}>College Essay Mentor Program — CCC Queue</h1>
        </div>
        <button onClick={handleSignOut} style={{ fontSize: 13, color: '#EEEDFE', background: 'none', border: '0.5px solid #EEEDFE', borderRadius: 8, padding: '6px 14px', cursor: 'pointer' }}>
          Sign out
        </button>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px' }}>
        <h2 style={{ fontSize: 18, fontWeight: 500, margin: '0 0 4px' }}>Walk-in Queue</h2>
        <p style={{ fontSize: 13, color: '#888780', margin: '0 0 20px' }}>
          {queue.filter(e => e.status === 'waiting').length} waiting · {queue.filter(e => e.status === 'helped').length} helped · {queue.filter(e => e.status === 'walked_out').length} walked out
        </p>

        {queue.length === 0 ? (
          <div style={{ background: '#ffffff', border: '0.5px solid #e8e6de', borderRadius: 12, padding: '2rem', textAlign: 'center' }}>
            <p style={{ color: '#888780', margin: 0 }}>No students checked in today.</p>
          </div>
        ) : (
          queue.map(entry => (
            <div key={entry.id} style={{
              background: '#ffffff', border: '0.5px solid #e8e6de',
              borderRadius: 12, padding: '16px 20px', marginBottom: 10,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <p style={{ fontWeight: 500, fontSize: 15, margin: 0 }}>{entry.student_name}</p>
                    {entry.status === 'helped' && (
                      <span style={{ fontSize: 11, padding: '1px 6px', borderRadius: 20, background: '#E1F5EE', color: '#085041' }}>
                        Helped by {entry.mentor_profiles?.full_name?.split(' ')[0] ?? 'a mentor'}
                      </span>
                    )}
                    {entry.status === 'walked_out' && (
                      <span style={{ fontSize: 11, padding: '1px 6px', borderRadius: 20, background: '#F1EFE8', color: '#5F5E5A' }}>
                        Walked out
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 12, color: '#888780', margin: '0 0 4px' }}>
                    Checked in {formatLocaleTimePST(entry.checked_in_at)}
                  </p>
                  {(() => {
                    const answers = entry.walkin_queue_answers ?? []
                    const helpWith = answers.find((a: any) => a.intake_questions?.question_text === 'I Want Help With')?.answer_text
                    const counselor = answers.find((a: any) => a.intake_questions?.question_text === 'I am also working with a private counselor hired by my family')?.answer_text
                    return (helpWith || counselor) ? (
                      <p style={{ fontSize: 12, color: '#2C2C2A', margin: 0 }}>
                        {helpWith && `Help: ${helpWith}`}
                        {helpWith && counselor && ' · '}
                        {counselor && `Private counselor: ${counselor}`}
                      </p>
                    ) : null
                  })()}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 180 }}>
                  {entry.status === 'waiting' && (
                    <>
                      <select
                        value={selectedMentor[entry.id] ?? ''}
                        onChange={e => setSelectedMentor(prev => ({ ...prev, [entry.id]: e.target.value }))}
                        style={{ fontSize: 12, padding: '4px 8px', width: '100%', borderRadius: 6 }}
                      >
                        <option value="">Assign to mentor...</option>
                        {mentors.map((m: any) => (
                          <option key={m.id} value={m.id}>{m.full_name}</option>
                        ))}
                      </select>
                      <button
                        onClick={async () => {
                          if (!selectedMentor[entry.id]) return
                          setAssigningId(entry.id)
                          await fetch(`/api/ccc/assign`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ queueId: entry.id, mentorId: selectedMentor[entry.id] }),
                          })
                          setAssigningId(null)
                          loadData()
                        }}
                        disabled={!selectedMentor[entry.id] || assigningId === entry.id}
                        style={{ fontSize: 12, padding: '5px 14px', background: selectedMentor[entry.id] ? '#534AB7' : undefined, color: selectedMentor[entry.id] ? '#ffffff' : undefined, border: selectedMentor[entry.id] ? 'none' : undefined }}
                      >
                        {assigningId === entry.id ? 'Assigning...' : 'Assign'}
                      </button>
                      <button
                        onClick={async () => {
                          await fetch(`/api/mentor/walkin-queue/${entry.id}/walkout`, { method: 'POST' })
                          loadData()
                        }}
                        style={{ fontSize: 12, padding: '5px 14px', color: '#791F1F', borderColor: '#F09595' }}
                      >
                        Walked out
                      </button>
                    </>
                  )}
                  {entry.status === 'helped' && (
                    <button
                      onClick={async () => {
                        await fetch(`/api/mentor/walkin-queue/${entry.id}/walkout`, { method: 'POST' })
                        loadData()
                      }}
                      style={{ fontSize: 12, padding: '5px 14px', color: '#791F1F', borderColor: '#F09595' }}
                    >
                      Walked out
                    </button>
                  )}
                  {entry.status === 'walked_out' && (
                    <select
                      value={selectedMentor[entry.id] ?? ''}
                      onChange={e => setSelectedMentor(prev => ({ ...prev, [entry.id]: e.target.value }))}
                      style={{ fontSize: 12, padding: '4px 8px', width: '100%', borderRadius: 6 }}
                    >
                      <option value="">Re-assign to mentor...</option>
                      {mentors.map((m: any) => (
                        <option key={m.id} value={m.id}>{m.full_name}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  )
}