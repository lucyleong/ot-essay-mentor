import type { Metadata } from 'next'
import LoginClient from './LoginClient'

export const metadata: Metadata = {
  title: 'Mentor Login | Oakland Tech College Essay Mentor Program',
}

export default function LoginPage() {
  return <LoginClient />
}
