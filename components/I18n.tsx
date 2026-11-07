'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { fmt, isLang, Lang, LANGUAGES, LOCALE, Msg, tr } from '@/lib/i18n/core'

interface Ctx {
  lang: Lang
  locale: string
  setLang: (l: Lang) => void
  t: (key: string, params?: Msg['p']) => string
  f: (m: Msg | null | undefined, fallback?: string) => string
}

const I18nContext = createContext<Ctx | null>(null)

function detect(): Lang {
  try {
    const saved = localStorage.getItem('okei.lang')
    if (isLang(saved)) return saved
  } catch {
    /* privat modus */
  }
  const nav = (typeof navigator !== 'undefined' ? navigator.languages?.[0] ?? navigator.language : 'nb').toLowerCase()
  if (/^(nb|nn|no)/.test(nav)) return 'no'
  const two = nav.slice(0, 2)
  return isLang(two) ? two : 'en'
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('no')

  useEffect(() => {
    setLangState(detect())
  }, [])

  useEffect(() => {
    document.documentElement.lang = lang === 'no' ? 'nb' : lang
  }, [lang])

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    try {
      localStorage.setItem('okei.lang', l)
    } catch {
      /* privat modus */
    }
    window.dispatchEvent(new CustomEvent('okei:lang', { detail: l }))
  }, [])

  const value = useMemo<Ctx>(
    () => ({
      lang,
      locale: LOCALE[lang],
      setLang,
      t: (key, params) => tr(lang, key, params),
      f: (m, fallback) => fmt(lang, m, fallback)
    }),
    [lang, setLang]
  )
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useT(): Ctx {
  const c = useContext(I18nContext)
  if (!c) throw new Error('useT utenfor I18nProvider')
  return c
}

/** Liten språkvelger (forside og innlogging). */
export function LangPicker() {
  const { lang, setLang, t } = useT()
  return (
    <select className="lang-pick" aria-label={t('language')} value={lang} onChange={(e) => setLang(e.target.value as Lang)}>
      {LANGUAGES.map((l) => (
        <option key={l.id} value={l.id}>{l.flag} {l.label}</option>
      ))}
    </select>
  )
}
