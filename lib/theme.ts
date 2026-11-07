'use client'

// Tema (lys/mørk) og aksentfarge. Lagres per enhet, så barnets telefon kan ha sine egne farger.

export type Theme = 'auto' | 'light' | 'dark'
export type Accent = 'green' | 'blue' | 'pink' | 'purple' | 'orange'

export const ACCENTS: { id: Accent; label: string; color: string }[] = [
  { id: 'green', label: 'Grønn', color: '#0e6b57' },
  { id: 'blue', label: 'Blå', color: '#1f5fbf' },
  { id: 'pink', label: 'Rosa', color: '#c13a72' },
  { id: 'purple', label: 'Lilla', color: '#6b46c1' },
  { id: 'orange', label: 'Oransje', color: '#b85410' }
]

export const THEMES: { id: Theme; label: string }[] = [
  { id: 'auto', label: 'Som telefonen' },
  { id: 'light', label: 'Lyst' },
  { id: 'dark', label: 'Mørkt' }
]

function read(key: string, fallback: string) {
  try {
    return localStorage.getItem(key) || fallback
  } catch {
    return fallback
  }
}

export function getTheme(): Theme {
  return read('okei.theme', 'auto') as Theme
}

export function getAccent(): Accent {
  return read('okei.accent', 'green') as Accent
}

export function applyTheme(theme: Theme = getTheme(), accent: Accent = getAccent()) {
  const dark = theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  const h = document.documentElement
  h.dataset.theme = dark ? 'dark' : 'light'
  h.dataset.accent = accent
}

export function saveTheme(theme: Theme, accent: Accent) {
  try {
    localStorage.setItem('okei.theme', theme)
    localStorage.setItem('okei.accent', accent)
  } catch {
    /* privat modus */
  }
  applyTheme(theme, accent)
}
