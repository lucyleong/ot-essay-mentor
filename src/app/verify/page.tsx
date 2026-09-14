import type { Metadata } from 'next'
import VerifyClient from './VerifyClient'

export const metadata: Metadata = {
  title: 'Book an Appointment | Oakland Tech College Essay Mentor Program',
}

export default function VerifyPage() {
  return <VerifyClient />
}
