import { normalize } from './allergens'

/** Fingeravtrykk av en ingrediensliste. Ignorerer mellomrom og tegnsetting, så små skrivemåter ikke gir falsk alarm. */
export function ingredientsHash(text: string | null | undefined): string | null {
  const t = normalize(text ?? '').replace(/[^a-z0-9æøåäöü]/g, '')
  if (!t) return null
  let h = 0x811c9dc5
  for (let i = 0; i < t.length; i++) {
    h ^= t.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h.toString(16).padStart(8, '0')
}
