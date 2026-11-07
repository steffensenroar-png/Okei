import type { Metadata } from 'next'
import Privacy from '@/components/Privacy'

export const metadata: Metadata = { title: 'Personvern – Okei' }

export default function Page() {
  return <Privacy />
}
