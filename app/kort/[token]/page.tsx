'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase-browser'
import { AllergenKey, ConditionKey, Severity } from '@/lib/allergens'
import { compressImage, errorText } from '@/lib/client'
import { useT } from '@/components/I18n'
import type { Msg } from '@/lib/i18n/core'
import AllergenIcon from '@/components/AllergenIcon'
import { Animal, animalFor, Mascot, ModeArt } from '@/components/Art'
import { CameraIcon, FlagIcon, Logo } from '@/components/Icons'
import BarcodeScanner from '@/components/BarcodeScanner'
import { Insights, sourceText } from '@/components/ResultParts'
import type { Flag, Insight } from '@/lib/rules'

interface CardProfile {
  id: string
  name: string
  avatar: string | null
  allergens: { key: AllergenKey; severity: Severity }[]
  conditions: ConditionKey[]
  custom_terms: string[]
  emergency_note: string | null
}
interface GuestResult {
  flag: Flag
  headline: string
  headlineMsg?: Msg
  insights: Insight[]
  people: { name: string; flag: Flag; headline: string; headlineMsg?: Msg }[]
  product: { name: string | null; ingredientsText: string | null; translatedText?: string | null; source: string }
}


export default function SharedCard() {
  const { token } = useParams<{ token: string }>()
  const [profiles, setProfiles] = useState<CardProfile[] | null | undefined>(undefined)
  const [mode, setMode] = useState<'barcode' | 'label'>('barcode')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<GuestResult | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const { t, f, lang } = useT()

  useEffect(() => {
    supabase()
      .rpc('get_shared_card', { p_token: token })
      .then(({ data }) => setProfiles(data ? ((data as { profiles: CardProfile[] }).profiles ?? []) : null))
  }, [token])

  async function run(body: Record<string, unknown>) {
    setBusy(true)
    setError('')
    setResult(null)
    try {
      const res = await fetch('/api/guest/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, token, mode, lang })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(errorText(json))
      setResult(json)
      setTimeout(() => document.getElementById('guest-result')?.scrollIntoView({ behavior: 'smooth' }), 50)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('err.generic'))
    } finally {
      setBusy(false)
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const img = await compressImage(file)
    await run({ image: img.data, mediaType: img.mediaType })
  }

  if (profiles === undefined)
    return (
      <main className="page center" style={{ alignItems: 'center' }}>
        <div className="spinner" role="status" aria-label={t('loading')} />
      </main>
    )
  if (profiles === null || !profiles.length)
    return (
      <main className="page center">
        <Logo />
        <Mascot mood="unsure" size={120} />
        <h1>{t('card.gone')}</h1>
        <p className="muted">{t('card.goneText')}</p>
      </main>
    )

  const names = profiles.map((p) => p.name)

  return (
    <main className="page card-page">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <Logo />
        <span className="tag">{t('card.tag')}</span>
      </div>

      {profiles.map((p, i) => (
        <section key={p.id} className="card stack" style={{ gap: 12 }}>
          <div className="row" style={{ gap: 12 }}>
            <Animal id={animalFor(p.avatar, i)} size={60} />
            <h1 style={{ fontSize: 28 }}>{p.name}</h1>
          </div>
          {(p.conditions ?? []).filter((c) => c !== 'coeliac_strict').map((c) => (
            <div key={c} className="finding" style={{ alignItems: 'center' }}>
              <AllergenIcon k={c} size={28} />
              <span>
                <b>{t(`cond.${c}`)}</b>
                {c === 'coeliac' && p.conditions.includes('coeliac_strict') ? ` ${t('card.strict')}` : ''}
              </span>
            </div>
          ))}
          {p.allergens.map((a) => (
            <div key={a.key} className="finding" style={{ alignItems: 'center' }}>
              <AllergenIcon k={a.key} size={28} />
              <span>
                <b>{t(`allergen.${a.key}`)}</b> – {t(`sev.${a.severity}`).toLowerCase()}
                {a.severity === 'severe' ? t('card.alsoTraces') : ''}
              </span>
            </div>
          ))}
          {!!p.custom_terms?.length && <p className="small"><b>{t('card.avoidAlso')}</b> {p.custom_terms.join(', ')}</p>}
          {p.emergency_note && (
            <div className="emergency">
              <strong>{t('card.onReaction')}</strong>
              <p>{p.emergency_note}</p>
            </div>
          )}
        </section>
      ))}
      <p className="small" style={{ fontWeight: 700 }}>{t('card.call')}</p>

      <section className="stack" style={{ gap: 12 }}>
        <h2>{t('card.checkFor', { names })}</h2>
        <div className="mode-tiles kid-tiles">
          <button className="mode-tile barcode" aria-pressed={mode === 'barcode'} onClick={() => setMode('barcode')}>
            <ModeArt mode="barcode" size={44} />
            <span>{t('mode.barcode')}</span>
          </button>
          <button className="mode-tile label" aria-pressed={mode === 'label'} onClick={() => setMode('label')}>
            <ModeArt mode="label" size={44} />
            <span>{t('mode.label')}</span>
          </button>
        </div>
        {busy ? (
          <div className="row small muted"><div className="spinner" style={{ width: 20, height: 20 }} /> {t('card.checking')}</div>
        ) : mode === 'barcode' ? (
          <BarcodeScanner onCode={(ean) => run({ ean })} paused={busy} />
        ) : (
          <>
            <button className="photo-drop label" onClick={() => fileRef.current?.click()}>
              <span className="photo-cta"><CameraIcon /></span>
              {t('card.photo')}
            </button>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={onFile} />
          </>
        )}
        {error && <div className="alert error" role="alert">{error}</div>}
      </section>

      {result && (
        <section id="guest-result" className={`guest-result ${result.flag}`}>
          <div className="row" style={{ gap: 10 }}>
            <span className="flag-icon"><FlagIcon flag={result.flag} size={28} /></span>
            <div className="stack" style={{ gap: 2 }}>
              <span className="small">{result.product.name ?? t('card.theProduct')}</span>
              <strong style={{ fontSize: 20 }}>{t(`word.${result.flag}`)}: {f(result.headlineMsg, result.headline)}</strong>
            </div>
          </div>
          <p style={{ fontWeight: 600 }}>{t(`card.action.${result.flag}`)}</p>
          {result.people.length > 1 && result.people.map((p) => (
            <span key={p.name} className="small row" style={{ gap: 6 }}><FlagIcon flag={p.flag} size={14} /> <b>{p.name}:</b> {f(p.headlineMsg, p.headline)}</span>
          ))}
          {result.product.ingredientsText && <p className="small muted">{result.product.ingredientsText}</p>}
          {result.product.translatedText && (
            <details className="translated">
              <summary>{t('res.translated')}</summary>
              <p className="small">{result.product.translatedText}</p>
            </details>
          )}
          <p className="tiny">{t('card.source', { source: sourceText(t, result.product.source) })}</p>
        </section>
      )}
      {result && <Insights items={result.insights} />}

      <p className="tiny" style={{ textAlign: 'center' }}>
        {t('card.footer')} <Link href="/">{t('card.more')}</Link>
      </p>
    </main>
  )
}
