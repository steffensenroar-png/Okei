'use client'

import { supabase } from './supabase-browser'
import { isLang, Lang, tr } from './i18n/core'
import type { AllergenKey, ConditionKey, Severity } from './allergens'

export interface FamilyProfile {
  id: string
  owner_id?: string
  name: string
  birth_year: number | null
  allergens: { key: AllergenKey; severity: Severity }[]
  custom_terms: string[]
  conditions: ConditionKey[]
  avatar?: string | null
  emergency_note?: string | null
  epipen_expiry?: string | null
  wishes?: Record<string, unknown> | null
}

export const AVATAR_COLORS = [
  ['#F3D9C9', '#6B3A1F'],
  ['#D6E4F5', '#1F3F6B'],
  ['#DCEBDD', '#24502A'],
  ['#EADCF2', '#4B2A66'],
  ['#F5E6C4', '#5E4310']
]

export function avatarStyle(i: number) {
  const [bg, fg] = AVATAR_COLORS[i % AVATAR_COLORS.length]
  return { background: bg, color: fg }
}

export async function postScan(body: Record<string, unknown>): Promise<{ id: string; flag: string }> {
  return apiPost('/api/scan', body)
}

export async function apiPost<T = any>(path: string, body: Record<string, unknown>): Promise<T> {
  const { data } = await supabase().auth.getSession()
  const token = data.session?.access_token
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body)
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(errorText(json))
  return json
}

/** Skaler ned og komprimer bildet før opplasting (maks 1600 px, JPEG). */
export async function compressImage(file: File, max = 1600): Promise<{ data: string; mediaType: 'image/jpeg' }> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = () => reject(new Error(tr(currentLang(), 'err.image')))
      i.src = url
    })
    const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight))
    const w = Math.round(img.naturalWidth * scale)
    const h = Math.round(img.naturalHeight * scale)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    return { data: dataUrl.split(',')[1], mediaType: 'image/jpeg' }
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Sjekk kontrollsiffer i EAN-8, EAN-13, UPC-A og GTIN-14. */
export function validGtin(code: string): boolean {
  const d = code.replace(/\D/g, '')
  if (![8, 12, 13, 14].includes(d.length)) return false
  const digits = d.split('').map(Number)
  const check = digits.pop()!
  const sum = digits.reverse().reduce((acc, n, i) => acc + n * (i % 2 === 0 ? 3 : 1), 0)
  return (10 - (sum % 10)) % 10 === check
}

export function storeGet(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function storeSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* privat modus o.l. */
  }
}

/** Koblingskode som venter på at barnet logger inn. */
export const PENDING_KEY = 'okei.pendingCode'

/** Språket som er valgt på denne enheten (for kode utenfor React). */
export function currentLang(): Lang {
  try {
    const l = localStorage.getItem('okei.lang')
    if (isLang(l)) return l
  } catch {
    /* privat modus */
  }
  return 'no'
}

/** Feilmeldinger fra serveren har en kode som oversettes. Ukjente koder viser serverens tekst. */
export function errorText(json: { error?: string; code?: string; params?: Record<string, string | number> }): string {
  const lang = currentLang()
  if (json.code) {
    const v = tr(lang, `err.${json.code}`, json.params)
    if (v !== `err.${json.code}`) return v
  }
  return json.error || tr(lang, 'err.generic')
}
