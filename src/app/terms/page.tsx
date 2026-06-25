import Link from 'next/link'

export default function TermsPage() {
  return (
    <main style={{ maxWidth: 700, margin: '0 auto', padding: '3rem 2rem' }}>
      <Link href="/" style={{ fontSize: 13, color: '#888780', textDecoration: 'none', display: 'block', marginBottom: 20 }}>
        ← Back to home
      </Link>
      <h1 style={{ fontSize: 24, fontWeight: 500, margin: '0 0 8px' }}>Terms, Conditions & Privacy Policy</h1>
      <p style={{ fontSize: 13, color: '#888780', margin: '0 0 40px' }}>
        Oakland Tech College Essay Mentor Program · Last updated: June 2026
      </p>

      <h2 style={{ fontSize: 18, fontWeight: 500, margin: '0 0 16px', color: '#534AB7' }}>Terms & Conditions</h2>

      <h3 style={{ fontSize: 15, fontWeight: 500, margin: '0 0 8px' }}>Program eligibility</h3>
      <p style={{ fontSize: 15, color: '#5F5E5A', lineHeight: 1.8, margin: '0 0 20px' }}>
        The OT College Essay Mentor Program is available to all current Oakland Tech seniors who are preparing college applications. Student can reserve as many appointments as needed but must only hold one appointment at a time. Appointments are available on a first-come, first-served basis.
      </p>

      <h3 style={{ fontSize: 15, fontWeight: 500, margin: '0 0 8px' }}>Appointments</h3>
      <p style={{ fontSize: 15, color: '#5F5E5A', lineHeight: 1.8, margin: '0 0 20px' }}>
        Appointments are free of charge. By booking an appointment you agree to attend at the scheduled time. If you need to cancel, please do so at least 24 hours in advance by clicking the cancel button on the confirmation email. Last-minute cancellations prevent other students from using the slot.
      </p>

      <h3 style={{ fontSize: 15, fontWeight: 500, margin: '0 0 8px' }}>Gmail requirement</h3>
      <p style={{ fontSize: 15, color: '#5F5E5A', lineHeight: 1.8, margin: '0 0 20px' }}>
        A Gmail address is required to book an appointment. This enables the use of Google Meet and sharing documents via Google Docs. You will not be let into the appointment if you are not logged in with the Gmail address that was provided during sign up.
      </p>

      <h3 style={{ fontSize: 15, fontWeight: 500, margin: '0 0 8px' }}>Text message consent</h3>
      <p style={{ fontSize: 15, color: '#5F5E5A', lineHeight: 1.8, margin: '0 0 20px' }}>
        By providing your phone number and checking the SMS consent box, you agree to receive one appointment reminder text message from the OT College Essay Mentor Program. If you cancel an appointment, you will also receive a confirmation of that cancellation. If you have not canceled your appointment and have not logged in, you may receive a text to help troubleshoot any log in issues. Message frequency may vary. Message and data rates may apply. Reply HELP for help or STOP to opt-out at any time. Carriers are not liable for any delayed or undelivered messages.
      </p>

      <h3 style={{ fontSize: 15, fontWeight: 500, margin: '0 0 8px' }}> Conduct</h3>
      <p style={{ fontSize: 15, color: '#5F5E5A', lineHeight: 1.8, margin: '0 0 20px' }}>
        Our mentors are volunteers who donate their time to support Oakland Tech students. Please treat them with respect. Mentors reserve the right to end appointments that are disrespectful or unproductive. Students may report any issues with mentors by contacting the Administrator at the listed email below.
      </p>

      <h3 style={{ fontSize: 15, fontWeight: 500, margin: '0 0 8px' }}>Limitation of liability</h3>
      <p style={{ fontSize: 15, color: '#5F5E5A', lineHeight: 1.8, margin: '0 0 40px' }}>
        The OT College Essay Mentor Program is a volunteer program. We make no guarantees regarding college admission outcomes. Mentors provide brainstorming, writing and editing support only.
      </p>

      <hr style={{ border: 'none', borderTop: '0.5px solid #e8e6de', margin: '0 0 16px' }} />

      <h2 style={{ fontSize: 18, fontWeight: 500, margin: '0 0 16px', color: '#534AB7' }}>Privacy Policy</h2>

      <h3 style={{ fontSize: 15, fontWeight: 500, margin: '0 0 8px' }}>Information we collect</h3>
      <p style={{ fontSize: 15, color: '#5F5E5A', lineHeight: 1.8, margin: '0 0 20px' }}>
        When you book an appointment, we collect your name, Gmail address, phone number, school information, and responses to our intake questions. This information is used solely to coordinate your mentoring appointment and analyze anonymous statistics.
      </p>

      <h3 style={{ fontSize: 15, fontWeight: 500, margin: '0 0 8px' }}>How we use your information</h3>
      <p style={{ fontSize: 15, color: '#5F5E5A', lineHeight: 1.8, margin: '0 0 20px' }}>
        We use your information to schedule and confirm appointments, send appointment reminders, and compile anonymous statistics about who we are helping. Your personal information is never sold or shared with third parties.
      </p>

      <h3 style={{ fontSize: 15, fontWeight: 500, margin: '0 0 8px' }}>Text messages</h3>
      <p style={{ fontSize: 15, color: '#5F5E5A', lineHeight: 1.8, margin: '0 0 20px' }}>
        If you provide your phone number and consent to SMS, we will send you one appointment reminder text message. If you cancel an appointment, you will also receive a confirmation of that cancellation. If you have not canceled your appointment and have not logged in, you may receive a text to help troubleshoot any log in issues.  Message frequency varies. Message and data rates may apply. You can reply HELP for help or STOP to opt-out at any time. No mobile information will be shared with third party / affiliates for marketing or promotional purposes.
      </p>

      <h3 style={{ fontSize: 15, fontWeight: 500, margin: '0 0 8px' }}>Data retention</h3>
      <p style={{ fontSize: 15, color: '#5F5E5A', lineHeight: 1.8, margin: '0 0 20px' }}>
        Your information is retained for the duration of the program year, then anonymized and archived at the end of each semester. Essays you share are deleted at the end of each program session.
      </p>

      <h3 style={{ fontSize: 15, fontWeight: 500, margin: '0 0 8px' }}>Contact</h3>
      <p style={{ fontSize: 15, color: '#5F5E5A', lineHeight: 1.8, margin: 0 }}>
        Questions? Contact us at{' '}
        <a href="mailto:otessaymentors@gmail.com" style={{ color: '#534AB7' }}>
          otessaymentors@gmail.com
        </a>
      </p>
    </main>
  )
}