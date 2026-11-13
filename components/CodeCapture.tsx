'use client'

import { useEffect } from 'react'

export const CODE_KEY = 'okei.code'

/** Husker influencer-koden fra lenker som okei.no/?kode=NORA20 i 30 dager. */
export default function CodeCapture() {
  useEffect(() => {
    try {
      const code = new URLSearchParams(window.location.search).get('kode')
      if (code && /^[A-Za-z0-9-]{3,30}$/.test(code)) {
        localStorage.setItem(CODE_KEY, JSON.stringify({ code: code.toUpperCase(), at: Date.now() }))
      }
    } catch {
      /* lagring kan være av */
    }
  }, [])
  return null
}

export function storedCode(): string {
  try {
    const raw = localStorage.getItem(CODE_KEY)
    if (!raw) return ''
    const { code, at } = JSON.parse(raw) as { code: string; at: number }
    return Date.now() - at < 30 * 864e5 ? code : ''
  } catch {
    return ''
  }
}
