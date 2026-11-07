'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import AuthGate, { useSession } from '@/components/AuthGate'
import { supabase } from '@/lib/supabase-browser'
import { ALLERGENS, ALLERGEN_BY_KEY, AllergenKey, CONDITIONS, ConditionKey, Severity, SEVERITY_LABEL } from '@/lib/allergens'
import { FamilyProfile } from '@/lib/client'
import AllergenIcon from '@/components/AllergenIcon'
import { Animal, ANIMALS, animalFor, Mascot } from '@/components/Art'
import { Accent, ACCENTS, getAccent, getTheme, saveTheme, Theme, THEMES } from '@/lib/theme'
import { KidGate, KidModeSetup, ShareCard, WishesEditor } from '@/components/ProfileExtras'
import type { Wishes } from '@/lib/wishes'

type Draft = {
  id?: string
  name: string
  birth_year: string
  allergens: Partial<Record<AllergenKey, Severity>>
  conditions: ConditionKey[]
  custom: string
  avatar: string | null
  emergency_note: string
  epipen_expiry: string
  wishes: Wishes
}

const empty = (n = 0): Draft => ({ name: '', birth_year: '', allergens: {}, conditions: [], custom: '', avatar: ANIMALS[n % ANIMALS.length].id, emergency_note: '', epipen_expiry: '', wishes: {} })

function toDraft(p: FamilyProfile): Draft {
  return {
    id: p.id,
    name: p.name,
    birth_year: p.birth_year ? String(p.birth_year) : '',
    allergens: Object.fromEntries(p.allergens.map((a) => [a.key, a.severity])),
    conditions: p.conditions ?? [],
    custom: (p.custom_terms ?? []).join(', '),
    avatar: p.avatar ?? null,
    emergency_note: p.emergency_note ?? '',
    epipen_expiry: p.epipen_expiry ?? '',
    wishes: (p.wishes ?? {}) as Wishes
  }
}

function summary(p: FamilyProfile) {
  const parts = p.allergens.map((a) => {
    const label = ALLERGEN_BY_KEY[a.key]?.label ?? a.key
    return a.severity === 'severe' ? `${label} (alvorlig)` : label
  })
  const conds = (p.conditions ?? []).map((c) => CONDITIONS.find((x) => x.key === c)?.label ?? c)
  return [...conds, ...parts, ...(p.custom_terms ?? [])].join(' · ') || 'Ingen allergier registrert'
}

interface Link_ { id: string; child_email: string | null; created_at: string }

function ChildPhone({ profileId, name }: { profileId: string; name: string }) {
  const [links, setLinks] = useState<Link_[]>([])
  const [code, setCode] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

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
    const { data, error } = await supabase().from('family_invites').insert({ profile_id: profileId }).select('code').single()
    setBusy(false)
    if (error || !data) return setError('Kunne ikke lage kode. Prøv igjen.')
    setCode(data.code)
  }

  async function share() {
    if (!code) return
    const url = `${window.location.origin}/koble?kode=${code}`
    const text = `Åpne lenken på telefonen din og logg inn for å koble deg til familien i Okei. Koden er ${code}.`
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
    if (!window.confirm('Fjerne koblingen? Du ser ikke lenger skannene fra den telefonen.')) return
    await supabase().from('family_links').delete().eq('id', id)
    load()
  }

  return (
    <div className="card stack" style={{ gap: 12 }}>
      <h2>{name} sin egen telefon</h2>
      <p className="small muted">
        Lag en kode og send den til {name}. Når {name} logger inn med egen konto og bruker koden, sjekker telefonen mat mot denne profilen, og du ser alt som skannes i historikken din.
      </p>
      {links.map((l) => (
        <div key={l.id} className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
          <span className="small" style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>Koblet: {l.child_email ?? 'ukjent konto'}</span>
          <button type="button" className="btn btn-small btn-danger" onClick={() => unlink(l.id)}>Fjern</button>
        </div>
      ))}
      {code ? (
        <div className="stack" style={{ gap: 8 }}>
          <div className="code-box" aria-label={`Kode ${code.split('').join(' ')}`}>{code}</div>
          <p className="tiny">Gjelder i 7 dager og kan brukes én gang.</p>
          <button type="button" className="btn btn-primary" onClick={share}>{copied ? 'Lenken er kopiert' : 'Send koden'}</button>
        </div>
      ) : (
        <button type="button" className="btn" onClick={makeCode} disabled={busy}>{busy ? 'Lager kode…' : 'Lag koblingskode'}</button>
      )}
      {error && <div className="alert error" role="alert">{error}</div>}
    </div>
  )
}

function Appearance() {
  const [theme, setTheme] = useState<Theme>('auto')
  const [accent, setAccent] = useState<Accent>('green')

  useEffect(() => {
    setTheme(getTheme())
    setAccent(getAccent())
  }, [])

  function pick(t: Theme, a: Accent) {
    setTheme(t)
    setAccent(a)
    saveTheme(t, a)
  }

  return (
    <div className="card stack" style={{ gap: 14 }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div className="stack" style={{ gap: 2 }}>
          <h2>Utseende</h2>
          <p className="tiny">Gjelder bare denne telefonen.</p>
        </div>
        <Mascot mood="happy" size={64} />
      </div>
      <div className="seg" role="group" aria-label="Tema">
        {THEMES.map((t) => (
          <button key={t.id} type="button" aria-pressed={theme === t.id} onClick={() => pick(t.id, accent)}>{t.label}</button>
        ))}
      </div>
      <div className="swatches" role="radiogroup" aria-label="Farge">
        {ACCENTS.map((a) => (
          <button
            key={a.id}
            type="button"
            role="radio"
            aria-checked={accent === a.id}
            aria-label={a.label}
            title={a.label}
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
  async function share() {
    const url = window.location.origin
    const data = { title: 'Okei', text: 'Sjekk mat mot allergiene i familien med Okei (beta).', url }
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
      {copied ? 'Lenken er kopiert' : 'Del Okei med andre'}
    </button>
  )
}

function Profiles() {
  const session = useSession()
  const [profiles, setProfiles] = useState<FamilyProfile[]>([])
  const [linked, setLinked] = useState<(FamilyProfile & { parent: string | null })[]>([])
  const [draft, setDraft] = useState<Draft | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    const { data } = await supabase()
      .from('family_profiles')
      .select('id, owner_id, name, birth_year, allergens, custom_terms, conditions, avatar, emergency_note, epipen_expiry, wishes')
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
    if (!window.confirm(`Koble fra ${name}? Du kan ikke lenger sjekke mat mot denne profilen.`)) return
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
    if (!name) return setError('Skriv inn et navn.')
    const year = draft.birth_year ? Number(draft.birth_year) : null
    if (year !== null && (isNaN(year) || year < 1900 || year > new Date().getFullYear())) return setError('Sjekk fødselsåret.')
    setSaving(true)
    setError('')
    const row = {
      owner_id: session.user.id,
      name,
      birth_year: year,
      allergens: Object.entries(draft.allergens).map(([key, severity]) => ({ key, severity })),
      conditions: draft.conditions,
      avatar: draft.avatar,
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
    if (error) return setError('Kunne ikke lagre. Prøv igjen.')
    setDraft(null)
    load()
  }

  async function remove() {
    if (!draft?.id) return
    if (!window.confirm(`Slette profilen «${draft.name}»? Historikken beholdes uten profilkobling.`)) return
    await supabase().from('family_profiles').delete().eq('id', draft.id)
    setDraft(null)
    load()
  }

  if (draft) {
    const selected = ALLERGENS.filter((a) => draft.allergens[a.key])
    return (
      <main className="page">
        <div className="row" style={{ gap: 14 }}>
          {draft.avatar && <Animal id={animalFor(draft.avatar, 0)} size={60} />}
          <h1>{draft.id ? `Endre ${draft.name}` : 'Ny profil'}</h1>
        </div>
        <form onSubmit={save} className="stack" style={{ gap: 18 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
            <label className="field">
              Navn
              <input className="input" value={draft.name} maxLength={60} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </label>
            <label className="field">
              Fødselsår
              <input className="input" inputMode="numeric" placeholder="valgfritt" value={draft.birth_year} onChange={(e) => setDraft({ ...draft, birth_year: e.target.value })} />
            </label>
          </div>

          <div className="stack" style={{ gap: 8 }}>
            <h2>Velg et dyr</h2>
            <div className="animal-grid" role="radiogroup" aria-label="Velg et dyr">
              {ANIMALS.map((a) => (
                <button type="button" key={a.id} role="radio" aria-checked={draft.avatar === a.id} aria-label={a.label} className="animal-pick" onClick={() => setDraft({ ...draft, avatar: a.id })}>
                  <Animal id={a.id} size={52} />
                </button>
              ))}
            </div>
          </div>

          <div className="stack">
            <h2>Sykdommer og intoleranser</h2>
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
                  <span style={{ fontWeight: 700 }}>{c.label}</span>
                  <span className="small muted">{c.hint}</span>
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
                <span><b>Svært sensitiv for gluten.</b> «Kan inneholde spor» gir rødt i stedet for gult.</span>
              </label>
            )}
          </div>

          <div className="stack">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <h2>Allergier</h2>
              <span className="tiny">{selected.length} valgt</span>
            </div>
            <div className="chips">
              {ALLERGENS.map((a) => (
                <button type="button" key={a.key} className="chip" aria-pressed={!!draft.allergens[a.key]} onClick={() => toggle(a.key)}>
                  <AllergenIcon k={a.key} size={30} />
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          {selected.length > 0 && (
            <div className="stack" style={{ gap: 12 }}>
              <h2>Hvor alvorlig?</h2>
              {selected.map((a) => (
                <div key={a.key} className="stack" style={{ gap: 6 }}>
                  <span className="small row" style={{ fontWeight: 700, gap: 8 }}><AllergenIcon k={a.key} size={22} />{a.label}</span>
                  <div className="seg" role="group" aria-label={`Alvorlighetsgrad for ${a.label}`}>
                    {(['mild', 'moderate', 'severe'] as Severity[]).map((s) => (
                      <button type="button" key={s} aria-pressed={draft.allergens[a.key] === s} onClick={() => setSeverity(a.key, s)}>
                        {SEVERITY_LABEL[s]}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <p className="tiny">Står som <b>Alvorlig</b> til du endrer det. Velg Alvorlig hvis personen har adrenalinpenn eller har hatt en alvorlig reaksjon. Da gir også «kan inneholde spor» rødt flagg.</p>
            </div>
          )}

          <label className="field">
            Andre ingredienser å unngå
            <input className="input" placeholder="F.eks. kiwi, erter (skill med komma)" value={draft.custom} onChange={(e) => setDraft({ ...draft, custom: e.target.value })} />
          </label>

          <WishesEditor value={draft.wishes} onChange={(w) => setDraft({ ...draft, wishes: w })} />

          <div className="stack" style={{ gap: 10 }}>
            <h2>Nødinfo</h2>
            <label className="field">
              Hva skal andre gjøre ved en reaksjon?
              <textarea
                className="input"
                maxLength={1000}
                value={draft.emergency_note}
                onChange={(e) => setDraft({ ...draft, emergency_note: e.target.value })}
                placeholder="F.eks. «Adrenalinpenn i sekken. Sett den i låret og ring 113. Ring mamma 99 99 99 99.»"
              />
            </label>
            <label className="field">
              Adrenalinpennen går ut (valgfritt)
              <input className="input" type="date" value={draft.epipen_expiry} onChange={(e) => setDraft({ ...draft, epipen_expiry: e.target.value })} />
            </label>
            <p className="tiny">Vises på allergikortet du deler. Okei minner deg på pennen 30 dager før den går ut.</p>
          </div>

          {draft.id && <ShareCard profileId={draft.id} name={draft.name || 'barnet'} />}
          {draft.id && <ChildPhone profileId={draft.id} name={draft.name || 'barnet'} />}

          {error && <div className="alert error" role="alert">{error}</div>}
          <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Lagrer…' : 'Lagre profil'}</button>
          <div className="row">
            {profiles.length > 0 && <button type="button" className="btn" onClick={() => setDraft(null)}>Avbryt</button>}
            {draft.id && <button type="button" className="btn btn-danger" onClick={remove}>Slett</button>}
          </div>
        </form>
      </main>
    )
  }

  return (
    <main className="page">
      <div className="hero-row">
        <div className="stack" style={{ gap: 6 }}>
          <h1>Familien</h1>
          <p className="muted">Én profil per person du sjekker mat for. Barna kan velge sitt eget dyr.</p>
        </div>
        <Mascot mood="wave" size={92} />
      </div>
      <div className="stack">
        {profiles.map((p, i) => (
          <button key={p.id} className="card row" style={{ textAlign: 'left', cursor: 'pointer', gap: 14 }} onClick={() => setDraft(toDraft(p))}>
            <Animal id={animalFor(p.avatar, i)} size={52} />
            <span className="stack" style={{ gap: 4, flex: 1 }}>
              <span style={{ fontSize: 16, fontWeight: 700 }}>
                {p.name}
                {p.birth_year ? `, ${new Date().getFullYear() - p.birth_year} år` : ''}
              </span>
              <span className="small muted">{summary(p)}</span>
            </span>
          </button>
        ))}
        <button className="btn" onClick={() => setDraft(empty(profiles.length))}>+ Legg til profil</button>
      </div>
      {linked.length > 0 && (
        <div className="stack">
          <h2>Koblet til familien</h2>
          {linked.map((p, i) => (
            <div key={p.id} className="card row" style={{ gap: 14 }}>
              <Animal id={animalFor(p.avatar, i)} size={52} />
              <span className="stack" style={{ gap: 4, flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 16, fontWeight: 700 }}>{p.name}</span>
                <span className="small muted">{summary(p)}</span>
                <span className="tiny">Styres av {p.parent ?? 'en forelder'}, som ser det du skanner.</span>
              </span>
              <button className="btn btn-small" onClick={() => unlinkSelf(p.id, p.name)}>Koble fra</button>
            </div>
          ))}
        </div>
      )}
      <Link className="linkbtn" href="/koble">Har du fått en kode? Koble til en familie</Link>
      <KidModeSetup profiles={profiles} />
      <Appearance />
      <div className="spacer" />
      <ShareButton />
      <Link className="linkbtn" href="/?om=1">Om Okei</Link>
      <Link className="linkbtn" href="/personvern">Personvern</Link>
      <button className="linkbtn" onClick={() => supabase().auth.signOut()}>Logg ut ({session.user.email})</button>
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
