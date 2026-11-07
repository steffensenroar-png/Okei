'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FlagIcon } from '@/components/Icons'
import { supabase } from '@/lib/supabase-browser'
import { ingredientsHash } from '@/lib/hash'
import type { Flag, Insight, MenuDishResult, Nutrition } from '@/lib/rules'
import type { WishNote } from '@/lib/wishes'

/** «Godt å vite»: forklaringer som bygger kunnskap hos familien, med kilde. */
export function Insights({ items }: { items?: Insight[] }) {
  if (!items?.length) return null
  return (
    <section className="stack" style={{ gap: 10 }} aria-label="Godt å vite">
      <h2 className="row" style={{ gap: 8 }}><span aria-hidden="true">💡</span> Godt å vite</h2>
      {items.map((i) => (
        <div key={i.id} className="insight">
          <strong>{i.title}</strong>
          <p>{i.text}</p>
          <a className="tiny" href={i.source.url} target="_blank" rel="noreferrer">Kilde: {i.source.label}</a>
        </div>
      ))}
    </section>
  )
}

const PERSON_WORD: Record<Flag, string> = { red: 'Nei', yellow: 'Usikkert', green: 'OK' }

export function MenuDishes({ dishes }: { dishes: MenuDishResult[] }) {
  const many = (dishes[0]?.people.length ?? 0) > 1
  return (
    <div className="stack" style={{ gap: 10 }}>
      {dishes.map((d, idx) => (
        <div key={idx} className={`person-card ${d.flag}`}>
          <span className={`person-badge ${d.flag}`} aria-hidden="true" style={{ flex: 'none' }}><FlagIcon flag={d.flag} size={18} /></span>
          <div className="stack" style={{ gap: 4, flex: 1, minWidth: 0 }}>
            <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontWeight: 800, fontSize: 16 }}>{d.name}</span>
              <span className={`person-word ${d.flag}`}>{PERSON_WORD[d.flag]}</span>
            </div>
            {d.description && <span className="small muted">{d.description}</span>}
            {many ? (
              <div className="stack" style={{ gap: 2 }}>
                {d.people.map((p) => (
                  <span key={p.name} className="small row" style={{ gap: 6 }}>
                    <FlagIcon flag={p.flag} size={14} /> <b>{p.name}:</b> {p.headline}
                  </span>
                ))}
              </div>
            ) : (
              <span className="small" style={{ fontWeight: 600 }}>{d.headline}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

const NUTRI: { key: keyof Nutrition; label: string; unit: string }[] = [
  { key: 'energy_kcal', label: 'Energi', unit: 'kcal' },
  { key: 'carbohydrates_g', label: 'Karbohydrater', unit: 'g' },
  { key: 'sugars_g', label: 'herav sukker', unit: 'g' },
  { key: 'fiber_g', label: 'Fiber', unit: 'g' },
  { key: 'protein_g', label: 'Protein', unit: 'g' },
  { key: 'fat_g', label: 'Fett', unit: 'g' },
  { key: 'salt_g', label: 'Salt', unit: 'g' }
]

export function NutritionBox({ n, grain, keyhole }: { n?: Nutrition | null; grain?: string | null; keyhole?: boolean }) {
  const rows = NUTRI.filter((r) => n?.[r.key] != null)
  if (!rows.length && !grain && !keyhole) return null
  return (
    <details className="card nutrition">
      <summary>Næringsinnhold og korn{keyhole ? ' · Nøkkelhullet' : ''}</summary>
      {rows.length > 0 && (
        <table>
          <caption className="tiny" style={{ textAlign: 'left' }}>Per 100 g</caption>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key}>
                <th scope="row" style={{ paddingLeft: r.key === 'sugars_g' ? 14 : 0 }}>{r.label}</th>
                <td>{String(Math.round((n![r.key] as number) * 10) / 10).replace('.', ',')} {r.unit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {grain && <p className="small"><b>Korn:</b> {grain}</p>}
      {keyhole && <p className="small"><b>Nøkkelhullet:</b> ja</p>}
    </details>
  )
}

export function WishNotes({ notes, name }: { notes?: WishNote[]; name?: string }) {
  if (!notes?.length) return null
  return (
    <div className="stack" style={{ gap: 4 }}>
      <span className="small" style={{ fontWeight: 700 }}>Ønsker{name ? ` for ${name}` : ''} (påvirker ikke flagget):</span>
      {notes.map((w) => (
        <span key={w.key} className="small row" style={{ gap: 6, alignItems: 'flex-start' }}>
          <span aria-hidden="true">{w.ok === true ? '✅' : w.ok === false ? '➖' : '❔'}</span>
          <span><b>{w.label}:</b> {w.text}</span>
        </span>
      ))}
    </div>
  )
}

export function ChangedWarning({ changed }: { changed?: { savedAt: string; oldText: string | null } | null }) {
  if (!changed) return null
  return (
    <div className="recall" role="alert">
      <span className="recall-icon" aria-hidden="true">!</span>
      <div className="stack" style={{ gap: 4 }}>
        <strong>Ingredienslisten er endret</strong>
        <span className="small">
          Du lagret denne som trygg vare {new Date(changed.savedAt).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short', year: 'numeric' })}. Listen er annerledes nå, så les den på nytt.
        </span>
        {changed.oldText && (
          <details className="small">
            <summary>Se den gamle listen</summary>
            <p className="muted">{changed.oldText}</p>
          </details>
        )}
      </div>
    </div>
  )
}

export function SaveSafe({
  ean,
  name,
  brand,
  image,
  ingredients,
  profileIds
}: {
  ean: string
  name: string | null
  brand?: string | null
  image?: string | null
  ingredients?: string | null
  profileIds: string[]
}) {
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  async function save() {
    setState('saving')
    const { error } = await supabase()
      .from('safe_products')
      .upsert(
        {
          ean,
          name,
          brand: brand ?? null,
          image: image ?? null,
          ingredients_text: ingredients ?? null,
          ingredients_hash: ingredientsHash(ingredients),
          profile_ids: profileIds,
          created_at: new Date().toISOString()
        },
        { onConflict: 'owner_id,ean' }
      )
    setState(error ? 'error' : 'saved')
  }
  if (state === 'saved')
    return (
      <p className="small">
        ⭐ Lagret i <Link href="/trygge">trygge varer</Link>. Du får beskjed hvis ingredienslisten endres.
      </p>
    )
  return (
    <button className="btn" onClick={save} disabled={state === 'saving'}>
      {state === 'error' ? 'Kunne ikke lagre. Prøv igjen' : '⭐ Lagre som trygg vare'}
    </button>
  )
}
