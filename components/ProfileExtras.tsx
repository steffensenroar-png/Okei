'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase-browser'
import { squarePhoto, type FamilyProfile } from '@/lib/client'
import type { Wishes } from '@/lib/wishes'
import { getKidMode, hashPin, PinUnlock, setKidMode } from '@/components/KidMode'
import { Animal, AnimalId, Avatar, animalFor } from '@/components/Art'
import { useT } from '@/components/I18n'

/** Ønsker: påvirker aldri flagget, bare informasjon og alternativer. */
export function WishesEditor({ value, onChange }: { value: Wishes; onChange: (w: Wishes) => void }) {
  const toggle = (k: keyof Wishes) => onChange({ ...value, [k]: !value[k] })
  const num = (k: 'lowcarb' | 'lowsugar', def: number) =>
    onChange({ ...value, [k]: value[k] == null ? def : null })
  const { t } = useT()
  return (
    <div className="stack" style={{ gap: 10 }}>
      <h2>{t('wish.heading')}</h2>
      <p className="small muted">{t('wishEd.intro')}</p>
      <div className="wish-grid">
        <button type="button" className="chip" aria-pressed={value.lowcarb != null} onClick={() => num('lowcarb', 10)}>{t('w.lowcarb')}</button>
        <button type="button" className="chip" aria-pressed={value.lowsugar != null} onClick={() => num('lowsugar', 5)}>{t('w.lowsugar')}</button>
        <button type="button" className="chip" aria-pressed={!!value.fiber} onClick={() => toggle('fiber')}>{t('w.fiber')}</button>
        <button type="button" className="chip" aria-pressed={!!value.wholegrain} onClick={() => toggle('wholegrain')}>{t('w.wholegrain')}</button>
        <button type="button" className="chip" aria-pressed={!!value.keyhole} onClick={() => toggle('keyhole')}>{t('w.keyhole')}</button>
      </div>
      {value.lowcarb != null && (
        <label className="field">
          {t('wishEd.maxCarb')}
          <input className="input" inputMode="numeric" value={value.lowcarb} onChange={(e) => onChange({ ...value, lowcarb: Math.max(0, Math.min(100, Number(e.target.value.replace(/\D/g, '')) || 0)) })} />
        </label>
      )}
      {value.lowsugar != null && (
        <label className="field">
          {t('wishEd.maxSugar')}
          <input className="input" inputMode="numeric" value={value.lowsugar} onChange={(e) => onChange({ ...value, lowsugar: Math.max(0, Math.min(100, Number(e.target.value.replace(/\D/g, '')) || 0)) })} />
        </label>
      )}
    </div>
  )
}

interface Share {
  id: string
  token: string
  created_at: string
  expires_at: string
}

/** Del et allergikort: barnehage, skole, besteforeldre og bursdagsverter kan se allergiene og skanne mot profilen. */
export function ShareCard({ profileId, name }: { profileId: string; name: string }) {
  const [shares, setShares] = useState<Share[]>([])
  const [copied, setCopied] = useState('')
  const { t, locale } = useT()

  async function load() {
    const { data } = await supabase()
      .from('share_links')
      .select('id, token, created_at, expires_at')
      .contains('profile_ids', [profileId])
      .eq('revoked', false)
      .order('created_at', { ascending: false })
    setShares((data ?? []) as Share[])
  }
  useEffect(() => {
    load()
  }, [profileId])

  async function create() {
    const { data } = await supabase().from('share_links').insert({ profile_ids: [profileId], label: name }).select('id, token, created_at, expires_at').single()
    if (data) {
      setShares((s) => [data as Share, ...s])
      send(data.token)
    }
  }
  async function send(token: string) {
    const url = `${window.location.origin}/kort/${token}`
    const text = t('share.text', { name })
    try {
      if (navigator.share) return await navigator.share({ title: t('share.title', { name }), text, url })
      await navigator.clipboard.writeText(url)
      setCopied(token)
      setTimeout(() => setCopied(''), 2500)
    } catch {
      /* avbrutt */
    }
  }
  async function revoke(id: string) {
    if (!window.confirm(t('share.confirmRevoke'))) return
    await supabase().from('share_links').update({ revoked: true }).eq('id', id)
    load()
  }

  return (
    <div className="card stack" style={{ gap: 12 }}>
      <h2>{t('share.heading', { name })}</h2>
      <p className="small muted">
        {t('share.intro', { name })}
      </p>
      {shares.map((s) => (
        <div key={s.id} className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
          <span className="small">
            {t('share.created', { date: new Date(s.created_at).toLocaleDateString(locale, { day: 'numeric', month: 'short' }) })}
          </span>
          <span className="row" style={{ gap: 6 }}>
            <button type="button" className="btn btn-small" onClick={() => send(s.token)}>{copied === s.token ? t('copied') : t('send')}</button>
            <button type="button" className="btn btn-small btn-danger" onClick={() => revoke(s.id)}>{t('share.revoke')}</button>
          </span>
        </div>
      ))}
      <button type="button" className="btn" onClick={create}>{t('share.new')}</button>
      <Link className="linkbtn" href={`/kokkekort?id=${profileId}`}>{t('share.chef')}</Link>
    </div>
  )
}

/** Barnemodus på denne telefonen. */
export function KidModeSetup({ profiles }: { profiles: FamilyProfile[] }) {
  const [open, setOpen] = useState(false)
  const [profileId, setProfileId] = useState(profiles[0]?.id ?? '')
  const [pin, setPin] = useState('')
  const [phone, setPhone] = useState('')
  const { t } = useT()
  const [callName, setCallName] = useState(() => t('kidSetup.defaultCall'))
  const [error, setError] = useState('')

  async function start(e: React.FormEvent) {
    e.preventDefault()
    if (!profileId) return setError(t('kidSetup.pickWho'))
    if (!/^\d{4,8}$/.test(pin)) return setError(t('kidSetup.pinRule'))
    setKidMode({ profileId, pinHash: await hashPin(pin), phone: phone.trim() || undefined, callName: callName.trim() || undefined })
    window.location.href = '/skann'
  }

  if (!profiles.length) return null
  return (
    <div className="card stack" style={{ gap: 12 }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2>{t('kidSetup.title')}</h2>
        {!open && <button type="button" className="btn btn-small" onClick={() => setOpen(true)}>{t('turnOn')}</button>}
      </div>
      <p className="small muted">{t('kidSetup.intro')}</p>
      {open && (
        <form className="stack" onSubmit={start}>
          <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
            {profiles.map((p, i) => (
              <button type="button" key={p.id} className="profile-pill" aria-pressed={profileId === p.id} onClick={() => setProfileId(p.id)}>
                <Avatar photo={p.photo} id={animalFor(p.avatar, i)} size={32} /> {p.name}
              </button>
            ))}
          </div>
          <label className="field">
            {t('kidSetup.pin')}
            <input className="input" inputMode="numeric" autoComplete="off" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} maxLength={8} />
          </label>
          <div className="grid2">
            <label className="field">
              {t('kidSetup.callWho')}
              <input className="input" value={callName} onChange={(e) => setCallName(e.target.value)} placeholder={t('kidSetup.defaultCall')} maxLength={20} />
            </label>
            <label className="field">
              {t('kidSetup.phone')}
              <input className="input" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t('optional')} maxLength={20} />
            </label>
          </div>
          {error && <div className="alert error" role="alert">{error}</div>}
          <button className="btn btn-primary" type="submit">{t('kidSetup.start')}</button>
        </form>
      )}
    </div>
  )
}

/** I barnemodus må en voksen låse opp før profiler kan endres. */
export function KidGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<'check' | 'locked' | 'open'>('check')
  const kid = typeof window !== 'undefined' ? getKidMode() : null
  useEffect(() => setState(getKidMode() ? 'locked' : 'open'), [])
  if (state === 'check') return null
  if (state === 'locked' && kid)
    return (
      <main className="page center">
        <PinUnlock kid={kid} onUnlock={() => setState('open')} onCancel={() => (window.location.href = '/skann')} />
      </main>
    )
  return <>{children}</>
}

/** Profilbilde fra bilder på telefonen eller kamera. Lagres lite og kvadratisk. */
export function PhotoPicker({
  photo,
  animal,
  onChange,
  onError
}: {
  photo: string | null
  animal: AnimalId
  onChange: (photo: string | null) => void
  onError: (msg: string) => void
}) {
  const { t } = useT()
  const pickRef = useRef<HTMLInputElement>(null)
  const camRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    try {
      onChange(await squarePhoto(file))
    } catch (err) {
      onError(err instanceof Error ? err.message : t('err.image'))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="stack" style={{ gap: 8 }}>
      <h2>{t('prof.photo')}</h2>
      <div className="photo-pick">
        <Avatar photo={photo} id={animal} size={72} />
        <div className="btns">
          <button type="button" className="btn btn-small" disabled={busy} onClick={() => pickRef.current?.click()}>{t('prof.photoPick')}</button>
          <button type="button" className="btn btn-small" disabled={busy} onClick={() => camRef.current?.click()}>{t('prof.photoTake')}</button>
          {photo && <button type="button" className="btn btn-small btn-danger" onClick={() => onChange(null)}>{t('prof.photoRemove')}</button>}
        </div>
      </div>
      <p className="tiny" style={{ margin: 0 }}>{t('prof.photoHint')}</p>
      <input ref={pickRef} type="file" accept="image/*" hidden onChange={onFile} />
      <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={onFile} />
    </div>
  )
}
