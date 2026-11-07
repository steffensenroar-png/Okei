'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ClockIcon, PeopleIcon, ScanIcon } from './Icons'

const ITEMS = [
  { href: '/skann', label: 'Skann', icon: <ScanIcon /> },
  { href: '/profiler', label: 'Profiler', icon: <PeopleIcon /> },
  { href: '/historikk', label: 'Historikk', icon: <ClockIcon /> }
]

export default function Nav() {
  const path = usePathname()
  return (
    <nav className="nav" aria-label="Hovedmeny">
      <div className="nav-inner">
        {ITEMS.map((i) => (
          <Link key={i.href} href={i.href} aria-current={path.startsWith(i.href) ? 'page' : undefined}>
            {i.icon}
            {i.label}
          </Link>
        ))}
      </div>
    </nav>
  )
}
