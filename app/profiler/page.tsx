'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import AuthGate, { useSession } from '@/components/AuthGate'
import { supabase } from '@/lib/supabase-browser'
import { ALLERGENS, ALLERGEN_BY_KEY, AllergenKey, Severity, SEVERITY_LABEL } from '@/lib/allergens'
import { avatarStyle, FamilyProfile } from '@/lib/client'

type Draft = {
  id?: string
  name: string
  birth_year: string
  allergens: Partial<Record<AllergenKey, Severity>>
  custom: string
}

const empty = (): Draft => ({ name: '', birth_year: '', allergens: {}, custom: '' })

function toDraft(p: FamilyProfile): Draft {
  return {
    id: p.id,
    name: p.name,
    birth_year: p.birth_year ? String(p.birth_year) : '',
    allergens: Object.fromEntries(p.allergens.map((a) => [a.key, a.severity])),
    custom: (p.custom_terms ?? []).join(', ')
  }
}

function summary(p: FamilyProfile) {
  const parts = p.allergens.map((a) => {
    const label = ALLERGEN_BY_KEY[a.key]?.label ?? a.key
    return a.severity === 'severe' ? `${label} (alvorlig)` : label
  })
  return [...parts, ...(p.custom_terms ?? [])].join(' · ') || 'Ingen allergier registrert'
}

function Profiles() {
  const session = useSession()
  const [profiles, setProfiles] = useState<FamilyProfile[]>([])
  const [draft, setDraft] = useState<Draft | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)

  async function load() {
    const { data } = await supabase()
      .from('family_profiles')
      .select('id, name, birth_year, allergens, custom_terms')
      .order('created_at')
    setProfiles((data ?? []) as FamilyProfile[])
    return (data ?? []) as FamilyProfile[]
  }

  useEffect(() => {
    supabase().rpc('is_admin').then(({ data }) => setIsAdmin(!!data))
    load().then((list) => {
      if (!list.length || new URLSearchParams(window.location.search).has('ny')) setDraft(empty())
    })
  }, [])

  function toggle(key: AllergenKey) {
    if (!draft) return
    const next = { ...draft.allergens }
    if (next[key]) delete next[key]
    else next[key] = 'moderate'
    setDraft({ ...draft, allergens: next })
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
        <h1>{draft.id ? `Endre ${draft.name}` : 'Ny profil'}</h1>
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

          <div className="stack">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <h2>Allergier</h2>
              <span className="tiny">{selected.length} valgt</span>
            </div>
            <div className="chips">
              {ALLERGENS.map((a) => (
                <button type="button" key={a.key} className="chip" aria-pressed={!!draft.allergens[a.key]} onClick={() => toggle(a.key)}>
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
                  <span className="small" style={{ fontWeight: 600 }}>{a.label}</span>
                  <div className="seg" role="group" aria-label={`Alvorlighetsgrad for ${a.label}`}>
                    {(['mild', 'moderate', 'severe'] as Severity[]).map((s) => (
                      <button type="button" key={s} aria-pressed={draft.allergens[a.key] === s} onClick={() => setSeverity(a.key, s)}>
                        {SEVERITY_LABEL[s]}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <p className="tiny">Alvorlig (anafylaksi): også «kan inneholde spor» gir rødt flagg.</p>
            </div>
          )}

          <label className="field">
            Andre ingredienser å unngå
            <input className="input" placeholder="F.eks. kiwi, erter (skill med komma)" value={draft.custom} onChange={(e) => setDraft({ ...draft, custom: e.target.value })} />
          </label>

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
      <h1>Profiler</h1>
      <p className="muted">Én profil per person du sjekker mat for.</p>
      <div className="stack">
        {profiles.map((p, i) => (
          <button key={p.id} className="card row" style={{ textAlign: 'left', cursor: 'pointer', gap: 14 }} onClick={() => setDraft(toDraft(p))}>
            <span className="avatar" style={{ ...avatarStyle(i), width: 46, height: 46, borderRadius: 23, fontSize: 18 }}>{p.name.charAt(0).toUpperCase()}</span>
            <span className="stack" style={{ gap: 4, flex: 1 }}>
              <span style={{ fontSize: 16, fontWeight: 700 }}>
                {p.name}
                {p.birth_year ? `, ${new Date().getFullYear() - p.birth_year} år` : ''}
              </span>
              <span className="small muted">{summary(p)}</span>
            </span>
          </button>
        ))}
        <button className="btn" onClick={() => setDraft(empty())}>+ Legg til profil</button>
      </div>
      <div className="spacer" />
      {isAdmin && <Link className="btn" href="/admin">Inviter testere</Link>}
      <Link className="linkbtn" href="/personvern">Personvern</Link>
      <button className="linkbtn" onClick={() => supabase().auth.signOut()}>Logg ut ({session.user.email})</button>
    </main>
  )
}

export default function Page() {
  return (
    <AuthGate>
      <Profiles />
    </AuthGate>
  )
}
