import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
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
    return NextResponse.json(data)
  }

  return NextResponse.json({ error: 'Unsupported content type.' }, { status: 415 })
}