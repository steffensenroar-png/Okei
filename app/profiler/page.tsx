'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import AuthGate, { useSession } from '@/components/AuthGate'
import { supabase } from '@/lib/supabase-browser'
import { ALLERGENS, AllergenKey, CONDITIONS, ConditionKey, DIETS, DietKey, Severity } from '@/lib/allergens'
import { FamilyProfile } from '@/lib/client'
import AllergenIcon from '@/components/AllergenIcon'
import { Animal, ANIMALS, animalFor, Avatar, Mascot } from '@/components/Art'
import { Accent, ACCENTS, getAccent, getTheme, saveTheme, Theme, THEMES } from '@/lib/theme'
import { KidGate, KidModeSetup, PhotoPicker, ShareCard, WishesEditor } from '@/components/ProfileExtras'
import type { Wishes } from '@/lib/wishes'
import { useT } from '@/components/I18n'
import DeleteAccount from '@/components/DeleteAccount'
import { hashPin } from '@/components/KidMode'
import { LANGUAGES } from '@/lib/i18n/core'

type Draft = {
  id?: string
  name: string
  birth_year: string
  allergens: Partial<Record<AllergenKey, Severity>>
  conditions: ConditionKey[]
  custom: string
  avatar: string | null
  photo: string | null
  emergency_note: string
  epipen_expiry: string
  wishes: Wishes
}

const empty = (n = 0): Draft => ({ name: '', birth_year: '', allergens: {}, conditions: [], custom: '', avatar: ANIMALS[n % ANIMALS.length].id, photo: null, emergency_note: '', epipen_expiry: '', wishes: {} })

function toDraft(p: FamilyProfile): Draft {
  return {
    id: p.id,
    name: p.name,
    birth_year: p.birth_year ? String(p.birth_year) : '',
    allergens: Object.fromEntries(p.allergens.map((a) => [a.key, a.severity])),
    conditions: withDiet(p.conditions ?? [], p.wishes as Wishes | null),
    custom: (p.custom_terms ?? []).join(', '),
    avatar: p.avatar ?? null,
    photo: p.photo ?? null,
    emergency_note: p.emergency_note ?? '',
    epipen_expiry: p.epipen_expiry ?? '',
    wishes: (() => {
      const { vegetarian: _v, vegan: _vg, ...rest } = (p.wishes ?? {}) as Wishes
      return rest
    })()
  }
}

/** Vegetar og vegansk var tidligere «ønsker». Nå er de kosthold som påvirker flagget. */
function withDiet(conditions: ConditionKey[], wishes: Wishes | null): ConditionKey[] {
  if (conditions.includes('vegan') || conditions.includes('vegetarian')) return conditions
  if (wishes?.vegan) return [...conditions, 'vegan']
  if (wishes?.vegetarian) return [...conditions, 'vegetarian']
  return conditions
}

function summary(p: FamilyProfile, t: (k: string, p?: Record<string, string>) => string) {
  const parts = p.allergens.map((a) => {
    const label = t(`allergen.${a.key}`)
    return a.severity === 'severe' ? t('prof.severeTag', { label }) : label
  })
  const conds = (p.conditions ?? []).filter((c) => c !== 'coeliac_strict').map((c) => t(`cond.${c}`))
  return [...conds, ...parts, ...(p.custom_terms ?? [])].join(' · ') || t('prof.noAllergies')
}

interface Link_ { id: string; child_email: string | null; created_at: string }

function ChildPhone({ profileId, name, isChild }: { profileId: string; name: string; isChild: boolean }) {
  const [links, setLinks] = useState<Link_[]>([])
  const [code, setCode] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const { t } = useT()
  // Barnemodus følger med koden: PIN settes her, og barnets telefon starter i barnemodus.
  const [kidAuto, setKidAuto] = useState(isChild)
  const [pin, setPin] = useState('')
  const [callName, setCallName] = useState(() => t('kidSetup.defaultCall'))
  const [phone, setPhone] = useState('')
  const [withKid, setWithKid] = useState(false)

  async function load() {
    const { data } = await supabase()
      .from('family_links')
      .select('id, child_email, created_at')
      .eq('profile_id', profileId)
      .order('created_at')
    setLinks((data ?? []) as Link_[])
  }

  useEffect(() => {
    load()
  }, [profileId])

  async function makeCode() {
    setBusy(true)
    setError('')
    let kid_mode: Record<string, string> | null = null
    if (kidAuto) {
      if (!/^\d{4,8}$/.test(pin)) {
        setBusy(false)
        return setError(t('kidSetup.pinRule'))
      }
      kid_mode = { pinHash: await hashPin(pin) }
      if (callName.trim()) kid_mode.callName = callName.trim()
      if (phone.trim()) kid_mode.phone = phone.trim()
    }
    const { data, error } = await supabase().from('family_invites').insert({ profile_id: profileId, kid_mode }).select('code').single()
    setBusy(false)
    if (error || !data) return setError(t('child.codeFail'))
    setWithKid(!!kid_mode)
    setPin('')
    setCode(data.code)
  }

  async function share() {
    if (!code) return
    const url = `${window.location.origin}/koble?kode=${code}`
    const text = t(withKid ? 'child.shareTextKid' : 'child.shareText', { code })
    try {
      if (navigator.share) return await navigator.share({ title: 'Okei', text, url })
      await navigator.clipboard.writeText(`${text} ${url}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      /* avbrutt */
    }
  }

  async function unlink(id: string) {
    if (!window.confirm(t('child.confirmUnlink'))) return
    await supabase().from('family_links').delete().eq('id', id)
    load()
  }

  return (
    <div className="card stack" style={{ gap: 12 }}>
      <h2>{t('child.title', { name })}</h2>
      <p className="small muted">
        {t('child.intro', { name })}
      </p>
      {links.map((l) => (
        <div key={l.id} className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
          <span className="small" style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>{t('child.linked', { email: l.child_email ?? t('child.unknown') })}</span>
          <button type="button" className="btn btn-small btn-danger" onClick={() => unlink(l.id)}>{t('remove')}</button>
        </div>
      ))}
      {code ? (
        <div className="stack" style={{ gap: 8 }}>
          <div className="code-box" aria-label={t('child.codeAria', { code: code.split('').join(' ') })}>{code}</div>
          <p className="tiny">{t('child.validity')}</p>
          {withKid && <p className="tiny" style={{ fontWeight: 600 }}>{t('child.kidOn')}</p>}
          <button type="button" className="btn btn-primary" onClick={share}>{copied ? t('linkCopied') : t('child.send')}</button>
        </div>
      ) : (
        <div className="stack" style={{ gap: 10 }}>
          {isChild && (
            <label className="row" style={{ alignItems: 'flex-start', gap: 10 }}>
              <input type="checkbox" checked={kidAuto} onChange={(e) => setKidAuto(e.target.checked)} style={{ width: 22, height: 22, marginTop: 1 }} />
              <span>
                <b>{t('child.kidAuto', { name })}</b>
                <br />
                <span className="tiny">{t('child.kidAutoHint')}</span>
              </span>
            </label>
          )}
          {isChild && kidAuto && (
            <>
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
            </>
          )}
          <button type="button" className={isChild ? 'btn btn-primary' : 'btn'} onClick={makeCode} disabled={busy}>{busy ? t('child.making') : t('child.make')}</button>
        </div>
      )}
      {error && <div className="alert error" role="alert">{error}</div>}
    </div>
  )
}

function Appearance() {
  const [theme, setTheme] = useState<Theme>('auto')
  const [accent, setAccent] = useState<Accent>('green')
  const { t, lang, setLang } = useT()

  useEffect(() => {
    setTheme(getTheme())
    setAccent(getAccent())
  }, [])

  function pick(th: Theme, a: Accent) {
    setTheme(th)
    setAccent(a)
    saveTheme(th, a)
  }

  return (
    <div className="card stack" style={{ gap: 14 }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div className="stack" style={{ gap: 2 }}>
          <h2>{t('look.title')}</h2>
          <p className="tiny">{t('look.device')}</p>
        </div>
        <Mascot mood="happy" size={64} />
      </div>
      <label className="field">
        {t('language')}
        <select className="input" value={lang} onChange={(e) => setLang(e.target.value as typeof lang)}>
          {LANGUAGES.map((l) => (
            <option key={l.id} value={l.id}>{l.flag} {l.label}</option>
          ))}
        </select>
      </label>
      <div className="seg" role="group" aria-label={t('look.theme')}>
        {THEMES.map((th) => (
          <button key={th.id} type="button" aria-pressed={theme === th.id} onClick={() => pick(th.id, accent)}>{t(`theme.${th.id}`)}</button>
        ))}
      </div>
      <div className="swatches" role="radiogroup" aria-label={t('look.color')}>
        {ACCENTS.map((a) => (
          <button
            key={a.id}
            type="button"
            role="radio"
            aria-checked={accent === a.id}
            aria-label={t(`accent.${a.id}`)}
            title={t(`accent.${a.id}`)}
            className="swatch"
            style={{ background: a.color }}
            onClick={() => pick(theme, a.id)}
          >
            {accent === a.id ? '✓' : ''}
          </button>
        ))}
      </div>
    </div>
  )
}

function ShareButton() {
  const [copied, setCopied] = useState(false)
  const { t } = useT()
  async function share() {
    const url = window.location.origin
    const data = { title: 'Okei', text: t('prof.shareText'), url }
    try {
      if (navigator.share) return await navigator.share(data)
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      /* avbrutt */
    }
  }
  return (
    <button className="btn" onClick={share}>
      {copied ? t('linkCopied') : t('prof.shareApp')}
    </button>
  )
}

function Profiles() {
  const [isAdmin, setIsAdmin] = useState(false)
  useEffect(() => {
    supabase().rpc('is_admin_member').then(({ data }) => setIsAdmin(!!data))
  }, [])
  const session = useSession()
  const [profiles, setProfiles] = useState<FamilyProfile[]>([])
  const [linked, setLinked] = useState<(FamilyProfile & { parent: string | null })[]>([])
  const [draft, setDraft] = useState<Draft | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const { t } = useT()

  async function load() {
    const { data } = await supabase()
      .from('family_profiles')
      .select('id, owner_id, name, birth_year, allergens, custom_terms, conditions, avatar, photo, emergency_note, epipen_expiry, wishes')
      .order('created_at')
    const all = (data ?? []) as FamilyProfile[]
    const own = all.filter((p) => p.owner_id === session.user.id)
    const others = all.filter((p) => p.owner_id !== session.user.id)
    let parents: Record<string, string | null> = {}
    if (others.length) {
      const { data: links } = await supabase().from('family_links').select('profile_id, parent_email').eq('child_id', session.user.id)
      parents = Object.fromEntries((links ?? []).map((l: { profile_id: string; parent_email: string | null }) => [l.profile_id, l.parent_email]))
    }
    setProfiles(own)
    setLinked(others.map((p) => ({ ...p, parent: parents[p.id] ?? null })))
    return { own, others }
  }

  useEffect(() => {
    load().then(({ own, others }) => {
      if ((!own.length && !others.length) || new URLSearchParams(window.location.search).has('ny')) setDraft(empty(own.length))
    })
  }, [])

  async function unlinkSelf(profileId: string, name: string) {
    if (!window.confirm(t('prof.confirmUnlinkSelf', { name }))) return
    await supabase().from('family_links').delete().eq('child_id', session.user.id).eq('profile_id', profileId)
    load()
  }

  function toggle(key: AllergenKey) {
    if (!draft) return
    const next = { ...draft.allergens }
    if (next[key]) delete next[key]
    // Sikker standard: alvorlig. Da regnes også «kan inneholde spor» som rødt til forelderen velger noe annet.
    else next[key] = 'severe'
    setDraft({ ...draft, allergens: next })
  }

  function setDiet(d: DietKey | null) {
    if (!draft) return
    const rest = draft.conditions.filter((c) => c !== 'vegetarian' && c !== 'vegan')
    setDraft({ ...draft, conditions: d ? [...rest, d] : rest })
  }

  function toggleCondition(key: ConditionKey) {
    if (!draft) return
    const has = draft.conditions.includes(key)
    const next = has ? draft.conditions.filter((c) => c !== key && !(key === 'coeliac' && c === 'coeliac_strict')) : [...draft.conditions, key]
    setDraft({ ...draft, conditions: next })
  }

  function setSeverity(key: AllergenKey, sev: Severity) {
    if (!draft) return
    setDraft({ ...draft, allergens: { ...draft.allergens, [key]: sev } })
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!draft) return
    const name = draft.name.trim()
    if (!name) return setError(t('prof.needName'))
    const year = draft.birth_year ? Number(draft.birth_year) : null
    if (year !== null && (isNaN(year) || year < 1900 || year > new Date().getFullYear())) return setError(t('prof.checkYear'))
    setSaving(true)
    setError('')
    const row = {
      owner_id: session.user.id,
      name,
      birth_year: year,
      allergens: Object.entries(draft.allergens).map(([key, severity]) => ({ key, severity })),
      conditions: draft.conditions,
      avatar: draft.avatar,
      photo: draft.photo,
      emergency_note: draft.emergency_note.trim() || null,
      epipen_expiry: draft.epipen_expiry || null,
      wishes: draft.wishes,
      custom_terms: draft.custom.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 20)
    }
    const q = draft.id
      ? supabase().from('family_profiles').update(row).eq('id', draft.id)
      : supabase().from('family_profiles').insert(row)
    const { error } = await q
    setSaving(false)
    if (error) return setError(t('err.save_failed'))
    setDraft(null)
    load()
  }

  async function remove() {
    if (!draft?.id) return
    if (!window.confirm(t('prof.confirmDelete', { name: draft.name }))) return
    await supabase().from('family_profiles').delete().eq('id', draft.id)
    setDraft(null)
    load()
  }

  if (draft) {
    const selected = ALLERGENS.filter((a) => draft.allergens[a.key])
    const isKid = !draft.birth_year || new Date().getFullYear() - Number(draft.birth_year) < 18
    return (
      <main className="page">
        <div className="row" style={{ gap: 14 }}>
          <Avatar photo={draft.photo} id={animalFor(draft.avatar, 0)} size={60} />
          <h1>{draft.id ? t('prof.edit', { name: draft.name }) : t('prof.new')}</h1>
        </div>
        <form onSubmit={save} className="stack" style={{ gap: 18 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
            <label className="field">
              {t('prof.name')}
              <input className="input" value={draft.name} maxLength={60} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </label>
            <label className="field">
              {t('prof.birthYear')}
              <input className="input" inputMode="numeric" placeholder={t('optional')} value={draft.birth_year} onChange={(e) => setDraft({ ...draft, birth_year: e.target.value })} />
            </label>
          </div>

          {draft.id && isKid && (
            <>
              <ChildPhone profileId={draft.id} name={draft.name || t('prof.theChild')} isChild />
              <KidModeSetup profiles={profiles} fixedId={draft.id} name={draft.name || t('prof.theChild')} />
            </>
          )}

          <PhotoPicker
            photo={draft.photo}
            animal={animalFor(draft.avatar, 0)}
            onChange={(photo) => setDraft({ ...draft, photo })}
            onError={setError}
          />

          <div className="stack" style={{ gap: 8 }}>
            <h2>{t('prof.pickAnimal')}</h2>
            {draft.photo && <p className="tiny" style={{ margin: 0 }}>{t('prof.animalFallback')}</p>}
            <div className="animal-grid" role="radiogroup" aria-label={t('prof.pickAnimal')}>
              {ANIMALS.map((a) => (
                <button type="button" key={a.id} role="radio" aria-checked={draft.avatar === a.id} aria-label={t(`animal.${a.id}`)} className="animal-pick" onClick={() => setDraft({ ...draft, avatar: a.id })}>
                  <Animal id={a.id} size={52} />
                </button>
              ))}
            </div>
          </div>

          <div className="stack" style={{ gap: 10 }}>
            <h2>{t('prof.diet')}</h2>
            <div className="seg" role="radiogroup" aria-label={t('prof.diet')}>
              <button type="button" role="radio" aria-checked={!draft.conditions.some((c) => c === 'vegetarian' || c === 'vegan')} aria-pressed={!draft.conditions.some((c) => c === 'vegetarian' || c === 'vegan')} onClick={() => setDiet(null)}>{t('prof.dietAll')}</button>
              {DIETS.map((d) => (
                <button key={d} type="button" role="radio" aria-checked={draft.conditions.includes(d)} aria-pressed={draft.conditions.includes(d)} onClick={() => setDiet(d)}>{t(`cond.${d}`)}</button>
              ))}
            </div>
            {DIETS.filter((d) => draft.conditions.includes(d)).map((d) => (
              <p key={d} className="tiny" style={{ margin: 0 }}>{t(`cond.${d}.hint`)}</p>
            ))}
          </div>

          <div className="stack">
            <h2>{t('prof.conditions')}</h2>
            {CONDITIONS.map((c) => (
              <button
                type="button"
                key={c.key}
                className="card row"
                aria-pressed={draft.conditions.includes(c.key)}
                onClick={() => toggleCondition(c.key)}
                style={{ textAlign: 'left', cursor: 'pointer', gap: 12, borderWidth: draft.conditions.includes(c.key) ? 2 : 1, borderColor: draft.conditions.includes(c.key) ? 'var(--brand)' : 'var(--line)' }}
              >
                <AllergenIcon k={c.key} size={36} />
                <span className="stack" style={{ gap: 2 }}>
                  <span style={{ fontWeight: 700 }}>{t(`cond.${c.key}`)}</span>
                  <span className="small muted">{t(`cond.${c.key}.hint`)}</span>
                </span>
              </button>
            ))}
            {draft.conditions.includes('coeliac') && (
              <label className="row small" style={{ gap: 10, padding: '4px 4px 0' }}>
                <input
                  type="checkbox"
                  checked={draft.conditions.includes('coeliac_strict')}
                  onChange={() => toggleCondition('coeliac_strict')}
                  style={{ width: 22, height: 22 }}
                />
                <span><b>{t('prof.strictTitle')}</b> {t('prof.strictText')}</span>
              </label>
            )}
          </div>

          <div className="stack">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <h2>{t('prof.allergies')}</h2>
              <span className="tiny">{t('prof.selected', { n: selected.length })}</span>
            </div>
            <div className="chips">
              {ALLERGENS.map((a) => (
                <button type="button" key={a.key} className="chip" aria-pressed={!!draft.allergens[a.key]} onClick={() => toggle(a.key)}>
                  <AllergenIcon k={a.key} size={30} />
                  {t(`allergen.${a.key}`)}
                </button>
              ))}
            </div>
          </div>

          {selected.length > 0 && (
            <div className="stack" style={{ gap: 12 }}>
              <h2>{t('prof.howSevere')}</h2>
              {selected.map((a) => (
                <div key={a.key} className="stack" style={{ gap: 6 }}>
                  <span className="small row" style={{ fontWeight: 700, gap: 8 }}><AllergenIcon k={a.key} size={22} />{t(`allergen.${a.key}`)}</span>
                  <div className="seg" role="group" aria-label={t('prof.severityFor', { label: t(`allergen.${a.key}`) })}>
                    {(['mild', 'moderate', 'severe'] as Severity[]).map((s) => (
                      <button type="button" key={s} aria-pressed={draft.allergens[a.key] === s} onClick={() => setSeverity(a.key, s)}>
                        {t(`sev.${s}`)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <p className="tiny">{t('prof.severeHelp')}</p>
            </div>
          )}

          <label className="field">
            {t('prof.custom')}
            <input className="input" placeholder={t('prof.customPh')} value={draft.custom} onChange={(e) => setDraft({ ...draft, custom: e.target.value })} />
          </label>

          <WishesEditor value={draft.wishes} onChange={(w) => setDraft({ ...draft, wishes: w })} />

          <div className="stack" style={{ gap: 10 }}>
            <h2>{t('prof.emergency')}</h2>
            <label className="field">
              {t('prof.emergencyQ')}
              <textarea
                className="input"
                maxLength={1000}
                value={draft.emergency_note}
                onChange={(e) => setDraft({ ...draft, emergency_note: e.target.value })}
                placeholder={t('prof.emergencyPh')}
              />
            </label>
            <label className="field">
              {t('prof.penExpiry')}
              <input className="input" type="date" value={draft.epipen_expiry} onChange={(e) => setDraft({ ...draft, epipen_expiry: e.target.value })} />
            </label>
            <p className="tiny">{t('prof.penHelp')}</p>
          </div>

          {draft.id && <ShareCard profileId={draft.id} name={draft.name || t('prof.theChild')} />}
          {draft.id && !isKid && <ChildPhone profileId={draft.id} name={draft.name || t('prof.theChild')} isChild={false} />}

          {error && <div className="alert error" role="alert">{error}</div>}
          <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? t('saving') : t('prof.save')}</button>
          <div className="row">
            {profiles.length > 0 && <button type="button" className="btn" onClick={() => setDraft(null)}>{t('cancel')}</button>}
            {draft.id && <button type="button" className="btn btn-danger" onClick={remove}>{t('delete')}</button>}
          </div>
        </form>
      </main>
    )
  }

  return (
    <main className="page">
      <div className="hero-row">
        <div className="stack" style={{ gap: 6 }}>
          <h1>{t('nav.family')}</h1>
          <p className="muted">{t('prof.intro')}</p>
        </div>
        <Mascot mood="wave" size={92} />
      </div>
      <div className="stack">
        {profiles.map((p, i) => (
          <button key={p.id} className="card row" style={{ textAlign: 'left', cursor: 'pointer', gap: 14 }} onClick={() => setDraft(toDraft(p))}>
            <Avatar photo={p.photo} id={animalFor(p.avatar, i)} size={52} />
            <span className="stack" style={{ gap: 4, flex: 1 }}>
              <span style={{ fontSize: 16, fontWeight: 700 }}>
                {p.name}
                {p.birth_year ? `, ${t('prof.age', { n: new Date().getFullYear() - p.birth_year })}` : ''}
              </span>
              <span className="small muted">{summary(p, t)}</span>
            </span>
          </button>
        ))}
        <button className="btn" onClick={() => setDraft(empty(profiles.length))}>{t('prof.add')}</button>
      </div>
      {linked.length > 0 && (
        <div className="stack">
          <h2>{t('prof.linkedTitle')}</h2>
          {linked.map((p, i) => (
            <div key={p.id} className="card row" style={{ gap: 14 }}>
              <Avatar photo={p.photo} id={animalFor(p.avatar, i)} size={52} />
              <span className="stack" style={{ gap: 4, flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 16, fontWeight: 700 }}>{p.name}</span>
                <span className="small muted">{summary(p, t)}</span>
                <span className="tiny">{t('prof.managedBy', { who: p.parent ?? t('aParent') })}</span>
              </span>
              <button className="btn btn-small" onClick={() => unlinkSelf(p.id, p.name)}>{t('prof.unlink')}</button>
            </div>
          ))}
        </div>
      )}
      <KidModeSetup profiles={profiles} />
      <Link className="linkbtn" href="/koble">{t('prof.haveCode')}</Link>
      <Appearance />
      <div className="spacer" />
      <ShareButton />
      {isAdmin && <Link className="linkbtn" href="/admin">Admin</Link>}
      <Link className="linkbtn" href="/?om=1">{t('prof.about')}</Link>
      <Link className="linkbtn" href="/abonnement">{t('sub.title')}</Link>
      <Link className="linkbtn" href="/personvern">{t('privacy')}</Link>
      <Link className="linkbtn" href="/vilkar">{t('terms.link')}</Link>
      <button className="linkbtn" onClick={() => supabase().auth.signOut()}>{t('logout')} ({session.user.email})</button>
      <DeleteAccount />
    </main>
  )
}

export default function Page() {
  return (
    <AuthGate>
      <KidGate>
        <Profiles />
      </KidGate>
    </AuthGate>
  )
}
