export function LogoMark({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" aria-hidden="true">
      <circle className="logo-dot" cx="18" cy="18" r="16" fill="#0E6B57" />
      <path className="logo-check" d="M11 18.5l4.5 4.5L25 13.5" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function Logo() {
  return (
    <span className="logo">
      <LogoMark />
      Okei
    </span>
  )
}

export function FlagIcon({ flag, size = 26 }: { flag: 'red' | 'yellow' | 'green'; size?: number }) {
  if (flag === 'red')
    return (
      <svg width={size} height={size} viewBox="0 0 26 26" aria-hidden="true">
        <path d="M7 7l12 12M19 7L7 19" stroke="#B42318" strokeWidth="3.2" strokeLinecap="round" />
      </svg>
    )
  if (flag === 'yellow')
    return (
      <svg width={size} height={size} viewBox="0 0 26 26" aria-hidden="true">
        <path d="M13 6v9" stroke="#FFE3A3" strokeWidth="3.2" strokeLinecap="round" />
        <circle cx="13" cy="20" r="2" fill="#FFE3A3" />
      </svg>
    )
  return (
    <svg width={size} height={size} viewBox="0 0 26 26" aria-hidden="true">
      <path d="M6 13.5l4.5 4.5L20 8.5" fill="none" stroke="#18794E" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  )
}

export function ScanIcon({ color = 'currentColor' }: { color?: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
      <path d="M3 7V4.5A1.5 1.5 0 0 1 4.5 3H7M15 3h2.5A1.5 1.5 0 0 1 19 4.5V7M19 15v2.5a1.5 1.5 0 0 1-1.5 1.5H15M7 19H4.5A1.5 1.5 0 0 1 3 17.5V15" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <circle cx="11" cy="11" r="3.5" fill="none" stroke={color} strokeWidth="2" />
    </svg>
  )
}

export function PeopleIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
      <circle cx="8" cy="8" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M2.5 18c.6-3 2.8-4.6 5.5-4.6s4.9 1.6 5.5 4.6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="15.5" cy="7.5" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M15 12.6c2.3 0 4 1.3 4.5 3.9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export function ClockIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
      <circle cx="11" cy="11" r="8" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M11 6.5V11l3 2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export function CameraIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="6" width="18" height="14" rx="3" fill="none" stroke="#fff" strokeWidth="1.6" />
      <circle cx="12" cy="13" r="3.5" fill="none" stroke="#fff" strokeWidth="1.6" />
      <path d="M8.5 6l1.5-2.5h4L15.5 6" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  )
}
