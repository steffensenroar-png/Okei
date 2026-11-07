// Språkkjerne uten React: brukes både av regelmotoren (server) og appen.

import no from './no'
import en from './en'
import sv from './sv'
import da from './da'
import fi from './fi'
import de from './de'
import es from './es'
import fr from './fr'
import it from './it'

export type Lang = 'no' | 'en' | 'sv' | 'da' | 'fi' | 'de' | 'es' | 'fr' | 'it'
export type Dict = Record<string, string>

export const LANGUAGES: { id: Lang; label: string; flag: string }[] = [
  { id: 'no', label: 'Norsk', flag: '🇳🇴' },
  { id: 'en', label: 'English', flag: '🇬🇧' },
  { id: 'sv', label: 'Svenska', flag: '🇸🇪' },
  { id: 'da', label: 'Dansk', flag: '🇩🇰' },
  { id: 'fi', label: 'Suomi', flag: '🇫🇮' },
  { id: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { id: 'es', label: 'Español', flag: '🇪🇸' },
  { id: 'fr', label: 'Français', flag: '🇫🇷' },
  { id: 'it', label: 'Italiano', flag: '🇮🇹' }
]

export const DICTS: Record<Lang, Dict> = { no, en, sv, da, fi, de, es, fr, it }
export const LANG_IDS = LANGUAGES.map((l) => l.id)
export const LOCALE: Record<Lang, string> = {
  no: 'nb-NO', en: 'en-GB', sv: 'sv-SE', da: 'da-DK', fi: 'fi-FI', de: 'de-DE', es: 'es-ES', fr: 'fr-FR', it: 'it-IT'
}

export function isLang(x: unknown): x is Lang {
  return typeof x === 'string' && (LANG_IDS as string[]).includes(x)
}

/** En melding regelmotoren kan sende i stedet for ferdig tekst. */
export interface Msg {
  k: string
  p?: Record<string, string | number | string[]>
}

function raw(lang: Lang, key: string): string | undefined {
  return DICTS[lang]?.[key] ?? DICTS.en[key] ?? DICTS.no[key]
}

/** «A, B og C» på riktig språk. */
export function joinList(lang: Lang, items: string[]): string {
  if (items.length <= 1) return items.join('')
  return items.slice(0, -1).join(', ') + ` ${raw(lang, 'and') ?? 'og'} ` + items[items.length - 1]
}

/** Genitiv der språket bruker det i maler ({nameGen}). */
export function genitive(lang: Lang, name: string): string {
  const n = name.trim()
  if (!n) return n
  if (lang === 'en') return /s$/i.test(n) ? `${n}'` : `${n}'s`
  if (lang === 'no' || lang === 'da' || lang === 'sv' || lang === 'de') return /[sxzß]$/i.test(n) ? `${n}'` : `${n}s`
  return n
}

/** Elementer som starter med @ er nøkler (f.eks. @allergen.milk), resten er tekst fra etiketten. */
function item(lang: Lang, x: string, lower: boolean): string {
  const v = x.startsWith('@') ? raw(lang, x.slice(1)) ?? x.slice(1) : x
  return lower && lang !== 'de' ? v.charAt(0).toLowerCase() + v.slice(1) : v
}

export function tr(lang: Lang, key: string, params?: Msg['p']): string {
  let s = raw(lang, key)
  if (s === undefined) return key
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      let val: string
      if (Array.isArray(v)) val = joinList(lang, v.map((x) => item(lang, x, k === 'items')))
      else val = typeof v === 'string' && v.startsWith('@') ? item(lang, v, false) : String(v)
      s = s.split(`{${k}}`).join(val)
    }
    if (typeof params.name === 'string') s = s.split('{nameGen}').join(genitive(lang, params.name))
  }
  return s
}

export function fmt(lang: Lang, m: Msg | null | undefined, fallback = ''): string {
  if (!m) return fallback
  const out = tr(lang, m.k, m.p)
  return out.charAt(0).toUpperCase() + out.slice(1)
}
