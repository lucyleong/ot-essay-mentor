import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function notifyMentor(bookingId: string, essayType: string, fileName?: string) {
  try {
   const { data: booking } = await supabase
      .from('student_bookings')
      .select(`
        student_name, student_email,
        appointment_slots (
          start_time,
          mentor_profiles ( full_name, email )
        )
      `)
      .eq('id', bookingId)
      .single()

    if (!booking) return
    const slot = (booking as any).appointment_slots
    const mentor = slot?.mentor_profiles
    if (!mentor?.email) return

    const apptDate = new Date(slot.start_time).toLocaleDateString('en-US', {
      timeZone: 'America/Los_Angeles',
      weekday: 'long', month: 'long', day: 'numeric',
      hour: 'numeric', minute: '2-digit',
    })

    const essayDescription = essayType === 'google_doc'
      ? 'a Google Doc link'
      : `a file (${fileName})`

    await sendEmail({
      to: mentor.email,
      subject: `${booking.student_name} shared an essay for your appointment`,
      html: `
        <p>Hi ${mentor.full_name.split(' ')[0]},</p>
        <p><strong>${booking.student_name}</strong> has shared ${essayDescription} for your upcoming appointment on ${apptDate}.</p>
<p>You can view it directly on <a href="${process.env.NEXT_PUBLIC_APP_URL}/mentor/students/${encodeURIComponent((booking as any).student_email)}">their student profile</a>.</p>      `,
      notificationType: 'essay_uploaded',
      recipientType: 'mentor',
    })
  } catch (err) {
    console.error('Mentor essay notification failed:', err)
  }
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ bookingId: string }> }
) {
  const { bookingId } = await context.params

  const { data, error } = await supabase
    .from('student_essays')
    .select('*')
    .eq('booking_id', bookingId)
    .order('uploaded_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Generate signed URLs for file uploads
  const essaysWithUrls = await Promise.all((data ?? []).map(async (essay) => {
    if (essay.essay_type === 'file_upload' && essay.file_path) {
      const { data: signed } = await supabase.storage
        .from('essays')
        .createSignedUrl(essay.file_path, 60 * 60)
      return { ...essay, signed_url: signed?.signedUrl ?? null }
    }
    return essay
  }))

  return NextResponse.json(essaysWithUrls)
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ bookingId: string }> }
) {
 const { bookingId } = await context.params
  const contentType = request.headers.get('content-type') ?? ''

  // Google Doc link
  if (contentType.includes('application/json')) {
    const body = await request.json()

  if (!body.googleDocUrl?.includes('docs.google.com/document')) {
      return NextResponse.json(
        { error: 'Please provide a valid Google Docs link.' },
        { status: 422 }
      )
    }

   // Verify the Google Doc is publicly accessible
    try {
      const checkRes = await fetch(body.googleDocUrl, {
        method: 'GET',
        redirect: 'follow',
        headers: { 'User-Agent': 'Mozilla/5.0' },
      })
    const finalUrl = checkRes.url
      const bodyText = await checkRes.text()
console.log('Google Doc check - status:', checkRes.status, 'finalUrl:', finalUrl)
      console.log('Google Doc check - body snippet:', bodyText.slice(0, 1000))     

      // Restricted docs redirect to accounts.google.com OR contain sign-in page content
     const isRestricted =
        finalUrl.includes('accounts.google.com') ||
        checkRes.status === 401 ||
        checkRes.status === 403 ||
        bodyText.includes('accounts.google.com/ServiceLogin') ||
        bodyText.includes('Sign in - Google Accounts') ||
        bodyText.includes('You need access')

      if (isRestricted) {
        return NextResponse.json(
          { error: 'This Google Doc isn\'t publicly shared. Please open your doc, click Share, change "General access" to "Anyone with the link", then try again.' },
          { status: 422 }
        )
      }
    } catch {
      // If fetch fails entirely, let it through — don't block on network issues
    }

    const { data, error } = await supabase
      .from('student_essays')
      .insert({
        booking_id:     bookingId,
        essay_type:     'google_doc',
        google_doc_url: body.googleDocUrl,
        note_to_mentor: body.noteToMentor ?? null,
      })
      .select()
      .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    await notifyMentor(bookingId, 'google_doc')
    return NextResponse.json(data)
  }

  // File upload
  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData()
    const file     = formData.get('file') as File | null
    const note     = formData.get('noteToMentor') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 422 })
    }

    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Only PDF, Word (.docx), and plain text files are accepted.' },
        { status: 422 }
      )
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File must be under 10 MB.' },
        { status: 422 }
      )
    }

    const ext      = file.name.split('.').pop()?.toLowerCase() ?? 'bin'
    const safeName = `${Date.now()}.${ext}`
    const path     = `essays/${bookingId}/${safeName}`

    const arrayBuffer = await file.arrayBuffer()

    const { error: storageError } = await supabase.storage
      .from('essays')
      .upload(path, new Uint8Array(arrayBuffer), {
        contentType: file.type,
        upsert:      false,
      })

    if (storageError) {
      return NextResponse.json({ error: storageError.message }, { status: 500 })
    }

    const { data, error } = await supabase
      .from('student_essays')
      .insert({
        booking_id:      bookingId,
        essay_type:      'file_upload',
        file_path:       path,
        file_name:       file.name,
        file_size_bytes: file.size,
        file_mime_type:  file.type,
        note_to_mentor:  note ?? null,
      })
      .select()
      .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    await notifyMentor(bookingId, 'file_upload', file.name)
    return NextResponse.json(data)
  }

  return NextResponse.json({ error: 'Unsupported content type.' }, { status: 415 })
}