'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import AuthGate from '@/components/AuthGate'
import { supabase } from '@/lib/supabase-browser'
import { FamilyProfile, storeGet, storeSet } from '@/lib/client'
import { Animal, animalFor } from '@/components/Art'
import { buildChefCard, Lang, LANGS } from '@/lib/chefcard'

function ChefCardPage() {
  const [profiles, setProfiles] = useState<FamilyProfile[]>([])
  const [id, setId] = useState('')
  const [lang, setLang] = useState<Lang>('en')

  useEffect(() => {
    const want = new URLSearchParams(window.location.search).get('id')
    const savedLang = storeGet('okei.chefLang') as Lang | null
    if (savedLang && LANGS.some((l) => l.id === savedLang)) setLang(savedLang)
    supabase()
      .from('family_profiles')
      .select('id, name, birth_year, allergens, custom_terms, conditions, avatar')
      .order('created_at')
      .then(({ data }) => {
        const list = (data ?? []) as FamilyProfile[]
        setProfiles(list)
        setId(want && list.some((p) => p.id === want) ? want : list[0]?.id ?? '')
      })
  }, [])

  const p = profiles.find((x) => x.id === id)
  const card = p ? buildChefCard(lang, p) : null
  const text = card ? [card.title, '', card.intro, ...card.items.map((i) => `• ${i}`), '', ...card.notes, '', card.thanks].join('\n') : ''

  async function share() {
    try {
      if (navigator.share) return await navigator.share({ title: card?.title, text })
      await navigator.clipboard.writeText(text)
    } catch {
      /* avbrutt */
    }
  }

  return (
    <main className="page">
      <h1 className="no-print">Kokkekort</h1>
      <p className="muted no-print">Vis kortet til den som lager maten på restaurant, i kantina eller på reise. Oversettelsene er faste og ikke laget av AI.</p>
      <div className="row no-print" style={{ flexWrap: 'wrap', gap: 8 }}>
        {profiles.map((x, i) => (
          <button key={x.id} className="profile-pill" aria-pressed={x.id === id} onClick={() => setId(x.id)}>
            <Animal id={animalFor(x.avatar, i)} size={32} /> {x.name}
          </button>
        ))}
      </div>
      <div className="lang-row no-print" role="group" aria-label="Språk">
        {LANGS.map((l) => (
          <button key={l.id} className="chip" aria-pressed={l.id === lang} onClick={() => { setLang(l.id); storeSet('okei.chefLang', l.id) }}>{l.label}</button>
        ))}
      </div>
      {card && (
        <article className="chef-card" lang={lang}>
          <h2>{card.title}</h2>
          <p style={{ fontWeight: 700 }}>{card.intro}</p>
          {card.items.length > 0 && (
            <ul>
              {card.items.map((i) => <li key={i}>{i}</li>)}
            </ul>
          )}
          {card.notes.map((n) => <p key={n}>{n}</p>)}
          <p style={{ fontWeight: 700 }}>{card.thanks}</p>
        </article>
      )}
      <div className="row no-print" style={{ gap: 10 }}>
        <button className="btn btn-primary" onClick={share}>Del eller kopier</button>
        <button className="btn" onClick={() => window.print()}>Skriv ut</button>
      </div>
      <Link className="linkbtn no-print" href="/profiler">Tilbake til familien</Link>
    </main>
  )
}

export default function Page() {
  return (
    <AuthGate>
      <ChefCardPage />
    </AuthGate>
  )
}
