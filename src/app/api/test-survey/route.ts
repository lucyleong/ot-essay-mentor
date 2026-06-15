import { NextResponse } from 'next/server'

export async function GET() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/survey/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.INTERNAL_API_SECRET}`,
    },
  })
  const data = await res.json()
  return NextResponse.json(data)
}