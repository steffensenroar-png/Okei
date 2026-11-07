'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ClockIcon, PeopleIcon, ScanIcon } from './Icons'
import { useT } from './I18n'

const ITEMS = [
  { href: '/skann', label: 'nav.scan', icon: <ScanIcon /> },
  { href: '/profiler', label: 'nav.profiles', icon: <PeopleIcon /> },
  { href: '/historikk', label: 'nav.history', icon: <ClockIcon /> }
]

export default function Nav() {
  const path = usePathname()
  const { t } = useT()
  return (
    <nav className="nav" aria-label={t('nav.menu')}>
      <div className="nav-inner">
        {ITEMS.map((i) => (
          <Link key={i.href} href={i.href} aria-current={path.startsWith(i.href) ? 'page' : undefined}>
            {i.icon}
            {t(i.label)}
          </Link>
        ))}
      </div>
    </nav>
  )
}
