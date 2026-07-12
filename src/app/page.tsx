'use client'
import Link from 'next/link'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()

 useEffect(() => {
    const hash = window.location.hash
    // Handle password recovery flow
    if (hash.includes('type=recovery')) {
      router.push(`/reset-password${hash}`)
    }
    // Handle invite flow — redirect to reset password page to set initial password
    if (hash.includes('type=invite')) {
      router.push(`/reset-password${hash}`)
    }
    // Handle PKCE code-based recovery flow
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    if (code) {
      router.push(`/reset-password?code=${code}`)
    }
  }, [])

  return (
    <main style={{ background: '#f5f4f0', minHeight: '100vh' }}>

      {/* Header */}
      <div className="no-wrap-row" style={{
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
        <div style={{ flexShrink: 0 }}>
          <Link href="/login" style={{
            background: 'transparent', color: '#EEEDFE',
            textDecoration: 'none', fontSize: 13,
            padding: '8px 18px', borderRadius: 8,
            border: '0.5px solid #EEEDFE',
          }}>
            Login
          </Link>
        </div>
      </div>

      {/* Hero */}
      <div style={{
        background: '#ffffff',
        borderBottom: '0.5px solid #e8e6de',
        padding: '48px 32px',
        textAlign: 'center',
      }}>
       <h2 style={{ fontSize: 'clamp(20px, 5vw, 28px)', fontWeight: 500, margin: '0 0 16px', color: '#2C2C2A' }}>
          Free College Essay Support for Oakland Tech Seniors
        </h2>
        <p style={{ fontSize: 16, color: '#5F5E5A', lineHeight: 1.7, maxWidth: 600, margin: '0 auto 28px' }}>
          Appointments are free, available first-come first-served, and nearly every day of the week through the end of the year.
        </p>
        <Link href="/verify" style={{
          display: 'inline-block',
          background: '#534AB7', color: '#ffffff',
          textDecoration: 'none', fontSize: 15, fontWeight: 500,
          padding: '12px 28px', borderRadius: 8,
        }}>
          Sign up for an appointment →
        </Link>
      </div>

      {/* Main content */}
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '48px 32px' }}>

        {/* About */}
        <div style={{
          background: '#ffffff', border: '0.5px solid #e8e6de',
          borderRadius: 12, padding: '2rem', marginBottom: 20,
        }}>
          <h3 style={{ fontSize: 18, fontWeight: 500, margin: '0 0 14px', color: '#2C2C2A' }}>
            About the program
          </h3>
          <p style={{ fontSize: 15, color: '#5F5E5A', lineHeight: 1.8, margin: '0 0 14px' }}>
            The Oakland Tech College Essay Mentor Program provides no-cost support to our seniors as they prepare their college applications. Helping Oakland Tech seniors for a decade, Essay Mentors are a group of working writers, editors, journalists, educators and others who specialize in supporting students with their Common App Essays and UC PIQs. {' '}
<a href="/mentors" style={{ color: '#534AB7' }}>Read about the team here.</a>
          </p>
          <p style={{ fontSize: 15, color: '#5F5E5A', lineHeight: 1.8, margin: '0 0 14px' }}>
            We work with students from their earliest brainstorming sessions to the final polishing of their work for submission.
          </p>
          <p style={{ fontSize: 15, color: '#5F5E5A', lineHeight: 1.8, margin: 0 }}>
            The Oakland Tech College Essay Mentor program is an equity program that has beenserving college-bound seniors since 2016. We help students set themselves apart by telling the authentic story only they can tell.
          </p>
        </div>

        {/* How it works */}
        <div style={{
          background: '#ffffff', border: '0.5px solid #e8e6de',
          borderRadius: 12, padding: '2rem', marginBottom: 20,
        }}>
          <h3 style={{ fontSize: 18, fontWeight: 500, margin: '0 0 14px', color: '#2C2C2A' }}>
            How it works
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[
              { num: '1', title: 'Sign up online', desc: 'Browse available appointment slots and book the one that works for you. First come, first served. A personal Gmail address is required.' },
              { num: '2', title: 'Meet your mentor', desc: 'Appointments are available virtually and in person at the College and Career Center on Friday afternoons.' },
              { num: '3', title: 'Work on your essay', desc: 'From brainstorming to final polish — we support Common App Essays, UC PIQs, and other college essays.' },
              { num: '4', title: 'Start early', desc: 'Writing the college essay is an iterative process. The earlier you start, the more time you have to revise.' },
            ].map(item => (
              <div key={item.num} style={{ display: 'flex', gap: 12 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: '#EEEDFE', color: '#534AB7',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 500, flexShrink: 0,
                }}>
                  {item.num}
                </div>
                <div>
                  <p style={{ fontWeight: 500, fontSize: 14, margin: '0 0 4px', color: '#2C2C2A' }}>{item.title}</p>
                  <p style={{ fontSize: 13, color: '#5F5E5A', lineHeight: 1.6, margin: 0 }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Important info */}
        <div style={{
          background: '#ffffff', border: '0.5px solid #e8e6de',
          borderRadius: 12, padding: '2rem', marginBottom: 20,
        }}>
          <h3 style={{ fontSize: 18, fontWeight: 500, margin: '0 0 14px', color: '#2C2C2A' }}>
            Good to know
          </h3>
          <ul style={{ margin: 0, padding: '0 0 0 18px', fontSize: 15, color: '#5F5E5A', lineHeight: 2 }}>
            <li>Appointments are <strong>free</strong> for all Oakland Tech seniors</li>
            <li>Available <strong>first-come, first-served</strong> through the end of the year</li>
            <li>Virtual appointments available nearly every day of the week</li>
            <li>In-person appointments at the <strong>College and Career Center</strong> on Friday afternoons</li>
            <li>Additional hours available — visit the CCC for information</li>
            <li>One active appointment at a time — start early and make it count!</li>
            <li>Skills learned here will support you in college and beyond</li>
          </ul>
        </div>

        {/* CTA */}
        <div style={{
          background: '#534AB7', borderRadius: 12,
          padding: '2rem', textAlign: 'center',
        }}>
          <h3 style={{ color: '#ffffff', fontSize: 18, fontWeight: 500, margin: '0 0 8px' }}>
            Ready to get started?
          </h3>
          <p style={{ color: '#EEEDFE', fontSize: 14, margin: '0 0 20px', lineHeight: 1.6 }}>
            Browse available appointments and sign up today. Spots fill up quickly!
          </p>
          <Link href="/verify" style={{
            display: 'inline-block',
            background: '#ffffff', color: '#534AB7',
            textDecoration: 'none', fontSize: 14, fontWeight: 500,
            padding: '10px 24px', borderRadius: 8,
          }}>
            Book an appointment →
          </Link>
        </div>

      </div>

      {/* Footer */}
      <div style={{
        borderTop: '0.5px solid #e8e6de',
        padding: '20px 32px',
        textAlign: 'center',
        fontSize: 12,
        color: '#888780',
      }}>
        Oakland Tech College Essay Mentor Program · Questions? Contact{' '}
        <a href="mailto:admin@otessaymentors.org" style={{ color: '#534AB7' }}>
          admin@otessaymentors.org
        </a>
        {' · '}
        <a href="/terms" style={{ color: '#534AB7' }}>
          Terms & Privacy Policy
        </a>
      </div>

    </main>
  )
}