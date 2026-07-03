import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function MentorsPage() {
  const { data: mentors } = await supabase
    .from('mentor_profiles')
    .select('id, full_name, bio')
    .eq('is_active', true)
.neq('email', process.env.PROGRAM_ACCOUNT_EMAIL!)
    .order('full_name', { ascending: true })

  return (
    <main style={{ background: '#f5f4f0', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{
        background: '#534AB7',
        padding: '24px 32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <p style={{ color: '#EEEDFE', fontSize: 11, fontWeight: 500, letterSpacing: '.06em', textTransform: 'uppercase', margin: '0 0 4px' }}>
            Oakland Tech
          </p>
          <h1 style={{ color: '#ffffff', fontSize: 20, fontWeight: 500, margin: 0 }}>
            College Essay Mentor Program
          </h1>
        </div>
        <Link href="/" style={{
          background: 'transparent', color: '#EEEDFE',
          textDecoration: 'none', fontSize: 13,
          padding: '8px 18px', borderRadius: 8,
          border: '0.5px solid #EEEDFE',
        }}>
          ← Back to home
        </Link>
      </div>

     {/* Content */}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px' }}>
        <h2 style={{ fontSize: 24, fontWeight: 500, margin: '0 0 8px', color: '#2C2C2A' }}>
          Meet our mentors
        </h2>
        <p style={{ fontSize: 15, color: '#5F5E5A', margin: '0 0 24px', lineHeight: 1.7 }}>
          OT's Essay Mentors are a group of working writers, editors, journalists, educators and others who specialize in supporting students with their college essays.
        </p>

       {/* Quick-jump name links - 2 column grid */}
        <div style={{
          background: '#ffffff',
          border: '0.5px solid #e8e6de',
          borderRadius: 12,
          padding: '1rem 1.25rem',
          marginBottom: 32,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 4,
        }}>
          {(mentors ?? []).map(mentor => (
            
              key={mentor.id}
              href={`#mentor-${mentor.id}`}
              style={{
                fontSize: 14, color: '#534AB7',
                textDecoration: 'none',
                padding: '6px 8px',
                borderRadius: 6,
              }}
            >
              {mentor.full_name}
            </a>
          ))}
        </div>

        {/* Single column mentor cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
       {(mentors ?? []).map(mentor => (
            <div
              key={mentor.id}
              id={`mentor-${mentor.id}`}
              style={{
                background: '#ffffff',
                border: '0.5px solid #e8e6de',
                borderRadius: 12,
                padding: '1.5rem',
                scrollMarginTop: 24,
              }}
            >
            
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: '#EEEDFE', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: 16, fontWeight: 500,
                  color: '#3C3489', flexShrink: 0,
                }}>
                  {mentor.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                </div>
                <p style={{ fontWeight: 500, fontSize: 17, margin: 0, color: '#2C2C2A' }}>
                  {mentor.full_name}
                </p>
              </div>
              {mentor.bio ? (
                <p style={{ fontSize: 14, color: '#5F5E5A', lineHeight: 1.7, margin: 0 }}>
                  {mentor.bio}
                </p>
             ) : (
                <p style={{ fontSize: 14, color: '#B4B2A9', fontStyle: 'italic', margin: 0 }}>
                  Bio coming soon
                </p>
             )}
           </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <Link href="/book" style={{
            display: 'inline-block',
            background: '#534AB7', color: '#ffffff',
            textDecoration: 'none', fontSize: 14, fontWeight: 500,
            padding: '12px 28px', borderRadius: 8,
          }}>
            Book an appointment →
          </Link>
        </div>
      </div>

    </main>
  )
}