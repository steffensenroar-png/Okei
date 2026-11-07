'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FlagIcon } from '@/components/Icons'
import { useT } from '@/components/I18n'

/** Oversett nøkkel, eller bruk lagret tekst hvis nøkkelen mangler. */
export const tOr = (t: (k: string) => string, key: string, fallback: string) => {
  const v = t(key)
  return v === key ? fallback : v
}
import { supabase } from '@/lib/supabase-browser'
import { ingredientsHash } from '@/lib/hash'
import type { Flag, Insight, MenuDishResult, Nutrition } from '@/lib/rules'
import type { WishNote } from '@/lib/wishes'

/** «Godt å vite»: forklaringer som bygger kunnskap hos familien, med kilde. */
export function Insights({ items }: { items?: Insight[] }) {
  const { t } = useT()
  if (!items?.length) return null
  return (
    <section className="stack" style={{ gap: 10 }} aria-label={t('ins.heading')}>
      <h2 className="row" style={{ gap: 8 }}><span aria-hidden="true">💡</span> {t('ins.heading')}</h2>
      {items.map((i) => (
        <div key={i.id} className="insight">
          <strong>{tOr(t, `ins.${i.id}.title`, i.title)}</strong>
          <p>{tOr(t, `ins.${i.id}.text`, i.text)}</p>
          <a className="tiny" href={i.source.url} target="_blank" rel="noreferrer">{t('ins.source')}: {i.source.label}</a>
        </div>
      ))}
    </section>
  )
}


export function MenuDishes({ dishes }: { dishes: MenuDishResult[] }) {
  const { t, f } = useT()
  const many = (dishes[0]?.people.length ?? 0) > 1
  return (
    <div className="stack" style={{ gap: 10 }}>
      {dishes.map((d, idx) => (
        <div key={idx} className={`person-card ${d.flag}`}>
          <span className={`person-badge ${d.flag}`} aria-hidden="true" style={{ flex: 'none' }}><FlagIcon flag={d.flag} size={18} /></span>
          <div className="stack" style={{ gap: 4, flex: 1, minWidth: 0 }}>
            <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontWeight: 800, fontSize: 16 }}>{d.name}</span>
              <span className={`person-word ${d.flag}`}>{t(`word.${d.flag}`)}</span>
            </div>
            {d.description && <span className="small muted">{d.description}</span>}
            {many ? (
              <div className="stack" style={{ gap: 2 }}>
                {d.people.map((p) => (
                  <span key={p.name} className="small row" style={{ gap: 6 }}>
                    <FlagIcon flag={p.flag} size={14} /> <b>{p.name}:</b> {f(p.headlineMsg, p.headline)}
                  </span>
                ))}
              </div>
            ) : (
              <span className="small" style={{ fontWeight: 600 }}>{f(d.headlineMsg, d.headline)}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

const NUTRI: { key: keyof Nutrition; unit: string }[] = [
  { key: 'energy_kcal', unit: 'kcal' },
  { key: 'carbohydrates_g', unit: 'g' },
  { key: 'sugars_g', unit: 'g' },
  { key: 'fiber_g', unit: 'g' },
  { key: 'protein_g', unit: 'g' },
  { key: 'fat_g', unit: 'g' },
  { key: 'salt_g', unit: 'g' }
]

export function NutritionBox({ n, grain, keyhole }: { n?: Nutrition | null; grain?: string | null; keyhole?: boolean }) {
  const { t } = useT()
  const rows = NUTRI.filter((r) => n?.[r.key] != null)
  if (!rows.length && !grain && !keyhole) return null
  return (
    <details className="card nutrition">
      <summary>{t('nut.title')}{keyhole ? ` · ${t('w.keyhole')}` : ''}</summary>
      {rows.length > 0 && (
        <table>
          <caption className="tiny" style={{ textAlign: 'left' }}>{t('nut.per100')}</caption>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key}>
                <th scope="row" style={{ paddingLeft: r.key === 'sugars_g' ? 14 : 0 }}>{t(`nut.${r.key}`)}</th>
                <td>{String(Math.round((n![r.key] as number) * 10) / 10).replace('.', ',')} {r.unit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {grain && <p className="small"><b>{t('nut.grain')}:</b> {grain}</p>}
      {keyhole && <p className="small"><b>{t('w.keyhole')}:</b> {t('yes')}</p>}
    </details>
  )
}

export function WishNotes({ notes, name }: { notes?: WishNote[]; name?: string }) {
  const { t, f } = useT()
  if (!notes?.length) return null
  return (
    <div className="stack" style={{ gap: 4 }}>
      <span className="small" style={{ fontWeight: 700 }}>{name ? t('wish.headingFor', { name }) : t('wish.heading')}</span>
      {notes.map((w) => (
        <span key={w.key} className="small row" style={{ gap: 6, alignItems: 'flex-start' }}>
          <span aria-hidden="true">{w.ok === true ? '✅' : w.ok === false ? '➖' : '❔'}</span>
          <span><b>{t(`w.${w.key}`)}:</b> {w.msg ? f(w.msg) : w.text}</span>
        </span>
      ))}
    </div>
  )
}

export function ChangedWarning({ changed }: { changed?: { savedAt: string; oldText: string | null } | null }) {
  const { t, locale } = useT()
  if (!changed) return null
  return (
    <div className="recall" role="alert">
      <span className="recall-icon" aria-hidden="true">!</span>
      <div className="stack" style={{ gap: 4 }}>
        <strong>{t('changed.title')}</strong>
        <span className="small">
          {t('changed.text', { date: new Date(changed.savedAt).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' }) })}
        </span>
        {changed.oldText && (
          <details className="small">
            <summary>{t('changed.old')}</summary>
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
  const { t } = useT()
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
        ⭐ <Link href="/trygge">{t('safe.saved')}</Link>
      </p>
    )
  return (
    <button className="btn" onClick={save} disabled={state === 'saving'}>
      {state === 'error' ? t('safe.error') : `⭐ ${t('safe.save')}`}
    </button>
  )
}

/** Kildeteksten er lagret på norsk; vis den på valgt språk. */
export function sourceText(t: (k: string) => string, source: string | null): string {
  const s = source ?? ''
  if (/kassalapp/i.test(s)) return t('src.kassalapp')
  if (/open food facts/i.test(s)) return t('src.off')
  if (/produktets/i.test(s)) return t('src.product')
  if (/ingrediensliste/i.test(s)) return t('src.label')
  if (/bildegjenkjenning/i.test(s)) return t('src.food')
  if (/meny/i.test(s)) return t('src.menu')
  if (/kassal/i.test(s)) return t('src.kassalapp')
  if (/ingen treff/i.test(s)) return t('src.none')
  return s
}
