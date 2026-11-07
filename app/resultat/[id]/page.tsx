'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import AuthGate, { useSession } from '@/components/AuthGate'
import { Animal, animalFor, Mascot } from '@/components/Art'
import { FlagIcon } from '@/components/Icons'
import AllergenIcon, { StatusIcon } from '@/components/AllergenIcon'
import { supabase } from '@/lib/supabase-browser'
import { apiPost } from '@/lib/client'
import type { Evaluation, Finding, Flag, Insight, MenuDishResult, Nutrition, PersonResult } from '@/lib/rules'
import type { WishNote } from '@/lib/wishes'
import { ChangedWarning, Insights, MenuDishes, NutritionBox, SaveSafe, WishNotes } from '@/components/ResultParts'
import { CallButton, getKidMode, KidMode, speak } from '@/components/KidMode'

interface Scan {
  id: string
  mode: 'barcode' | 'label' | 'food' | 'menu' | 'product'
  profile_ids?: string[] | null
  profile_name: string | null
  product_name: string | null
  ean: string | null
  source: string | null
  flag: Flag
  headline: string
  feedback: string | null
  owner_id: string
  created_at: string
  result: {
    family?: boolean
    people?: (PersonResult & { wishes?: WishNote[] })[]
    evaluation: Evaluation
    insights?: Insight[]
    changed?: { savedAt: string; oldText: string | null } | null
    fetchedAt?: string
    menu?: boolean
    dishes?: MenuDishResult[]
    place?: string | null
    product: {
      brand?: string | null
      ean?: string | null
      image?: string | null
      ingredientsText?: string | null
      tracesText?: string | null
      confidence?: string | null
      nutrition?: Nutrition | null
      grainInfo?: string | null
      keyhole?: boolean
    }
  }
}

interface Alternative {
  name: string
  brand: string | null
  ean: string | null
  image: string | null
  price: number | null
  notes?: string[]
}

const EYEBROW: Record<Flag, string> = { red: 'NEI · RØDT FLAGG', yellow: 'USIKKERT · GULT FLAGG', green: 'OK · GRØNT FLAGG' }
const ACTION: Record<Flag, string> = {
  red: 'Ikke spis.',
  yellow: 'Ikke spis før du har sjekket.',
  green: 'Sjekk etiketten før du spiser.'
}
const PERSON_WORD: Record<Flag, string> = { red: 'Ikke spis', yellow: 'Usikkert', green: 'OK' }
const MODE_LABEL = { barcode: 'Strekkode', label: 'Foto av ingrediensliste', food: 'Gjetning fra bilde', menu: 'Foto av meny', product: 'Foto av produkt' }
const CONFIDENCE: Record<string, string> = { low: 'lav', medium: 'middels', high: 'høy' }
const RANK: Record<Flag, number> = { red: 0, yellow: 1, green: 2 }

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function Highlighted({ text, red, amber, who }: { text: string; red: string[]; amber: string[]; who?: Record<string, string> }) {
  const parts = useMemo(() => {
    const words = [...red, ...amber].filter((w) => w && w.length > 1)
    if (!words.length) return [text]
    // Bare hele ord: «hvete» skal ikke markeres inne i «hvetestivelse».
    const L = 'a-zA-Z0-9æøåÆØÅäöüÄÖÜéè'
    const re = new RegExp(`(?<![${L}])(${[...new Set(words)].sort((a, b) => b.length - a.length).map(escapeRe).join('|')})(?![${L}])`, 'gi')
    return text.split(re)
  }, [text, red, amber])
  const lowerRed = red.map((w) => w.toLowerCase())
  const lowerAmber = amber.map((w) => w.toLowerCase())
  return (
    <>
      {parts.map((p, i) => {
        const l = p.toLowerCase()
        const sup = who?.[l] ? <sup className="who" aria-label={`gjelder ${who[l]}`}>{who[l]}</sup> : null
        if (lowerRed.includes(l)) return <span key={i}><mark className="hit">{p}</mark>{sup}</span>
        if (lowerAmber.includes(l)) return <span key={i}><mark className="hit-amber">{p}</mark>{sup}</span>
        return <span key={i}>{p}</span>
      })}
    </>
  )
}

function statusText(f: Finding): { dot: string; text: string } {
  switch (f.status) {
    case 'contains':
      return { dot: 'red', text: f.evidence.join(', ') }
    case 'traces':
      return { dot: f.severity === 'severe' ? 'red' : 'yellow', text: `kan inneholde spor (${f.evidence.join(', ')})` }
    case 'ambiguous':
      return { dot: 'yellow', text: `usikker: ${f.evidence.join(', ')}` }
    case 'likely':
      return { dot: 'yellow', text: 'vanligvis med i slik mat' }
    case 'unknown':
      return { dot: 'grey', text: 'mangler data' }
    default:
      return { dot: 'green', text: 'ikke funnet' }
  }
}

function Findings({ findings, onlyProblems }: { findings: Finding[]; onlyProblems?: boolean }) {
  const list = onlyProblems ? findings.filter((f) => f.status !== 'none') : findings
  if (!list.length) return null
  return (
    <div className="stack" style={{ gap: 6 }}>
      {list.map((f) => {
        const s = statusText(f)
        return (
          <div key={f.key} className="finding" style={{ alignItems: 'center' }}>
            <StatusIcon status={s.dot as 'red' | 'yellow' | 'green' | 'grey'} />
            <AllergenIcon k={f.key} size={24} />
            <span><b>{f.label}:</b> {s.text}</span>
          </div>
        )
      })}
    </div>
  )
}

function PersonCard({ person, avatar }: { person: PersonResult; avatar: { id: string | null; i: number } | undefined }) {
  const flag = person.evaluation.flag
  return (
    <div className={`person-card ${flag}`}>
      <span className="person-avatar" aria-hidden="true">
        <Animal id={animalFor(avatar?.id, avatar?.i ?? 0)} size={48} />
        <span className={`person-badge ${flag}`}><FlagIcon flag={flag} size={16} /></span>
      </span>
      <div className="stack" style={{ gap: 4, flex: 1, minWidth: 0 }}>
        <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
          <span style={{ fontWeight: 800, fontSize: 17 }}>{person.name}</span>
          <span className={`person-word ${flag}`}>{PERSON_WORD[flag]}</span>
        </div>
        <span className="small" style={{ fontWeight: 600 }}>{person.evaluation.headline}</span>
        <Findings findings={person.evaluation.findings} onlyProblems />
        <WishNotes notes={(person as PersonResult & { wishes?: WishNote[] }).wishes} />
      </div>
    </div>
  )
}

function Alternatives({ scanId, many }: { scanId: string; many: boolean }) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [items, setItems] = useState<Alternative[]>([])
  const [error, setError] = useState('')

  async function load() {
    setState('loading')
    try {
      const res = await apiPost<{ items: Alternative[] }>('/api/alternatives', { scanId })
      setItems(res.items)
      setState('done')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Noe gikk galt.')
      setState('error')
    }
  }

  if (state === 'idle') {
    return (
      <button className="btn" onClick={load}>
        {many ? 'Finn alternativ som passer alle' : 'Finn alternativ'}
      </button>
    )
  }
  if (state === 'loading') {
    return <div className="row small muted"><div className="spinner" style={{ width: 20, height: 20 }} /> Leter i norske butikker…</div>
  }
  if (state === 'error') return <div className="alert error">{error}</div>
  if (!items.length) return <p className="small muted">Fant ingen lignende varer som passer. Prøv å skanne en annen variant i butikken.</p>
  return (
    <div className="stack">
      <h2>Kan passe {many ? 'alle' : ''}</h2>
      {items.map((a) => (
        <div key={a.ean ?? a.name} className="card row" style={{ gap: 12 }}>
          {a.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={a.image} alt="" width={52} height={52} style={{ objectFit: 'contain', borderRadius: 8, background: '#fff', flex: 'none' }} />
          ) : (
            <span className="person-badge green" aria-hidden="true"><FlagIcon flag="green" /></span>
          )}
          <span className="stack" style={{ gap: 2, flex: 1, minWidth: 0 }}>
            <span style={{ fontWeight: 700 }}>{a.name}</span>
            <span className="small muted">{[a.brand, a.price ? `ca. ${Math.round(a.price)} kr` : null].filter(Boolean).join(' · ')}</span>
            {!!a.notes?.length && <span className="small" style={{ color: 'var(--green)', fontWeight: 600 }}>✓ {a.notes.join(', ')}</span>}
          </span>
        </div>
      ))}
      <p className="tiny">Basert på ingredienslister i Kassalapp. Sjekk alltid etiketten før du kjøper.</p>
    </div>
  )
}

function Result() {
  const session = useSession()
  const params = useParams<{ id: string }>()
  const [scan, setScan] = useState<Scan | null | undefined>(undefined)
  const [avatars, setAvatars] = useState<Record<string, { id: string | null; i: number }>>({})
  const [feedback, setFeedback] = useState('')
  const [sent, setSent] = useState(false)
  const [open, setOpen] = useState(false)
  const [kid, setKid] = useState<KidMode | null>(null)
  useEffect(() => setKid(getKidMode()), [])

  useEffect(() => {
    supabase()
      .from('family_profiles')
      .select('id, avatar')
      .order('created_at')
      .then(({ data }) => {
        const map: Record<string, { id: string | null; i: number }> = {}
        ;(data ?? []).forEach((r: { id: string; avatar: string | null }, i: number) => (map[r.id] = { id: r.avatar, i }))
        setAvatars(map)
      })
  }, [])

  useEffect(() => {
    supabase()
      .from('scans')
      .select('*')
      .eq('id', params.id)
      .maybeSingle()
      .then(({ data }) => {
        setScan((data as Scan) ?? null)
        if (data?.feedback) setSent(true)
      })
  }, [params.id])

  async function sendFeedback(e: React.FormEvent) {
    e.preventDefault()
    if (!feedback.trim() || !scan) return
    const { error } = await supabase()
      .from('scans')
      .update({ feedback: feedback.trim(), feedback_at: new Date().toISOString() })
      .eq('id', scan.id)
    if (!error) setSent(true)
  }

  if (scan === undefined) {
    return (
      <main className="page center" style={{ alignItems: 'center' }}>
        <div className="spinner" role="status" aria-label="Laster" />
      </main>
    )
  }
  if (scan === null) {
    return (
      <main className="page center">
        <h1>Fant ikke resultatet</h1>
        <Link className="btn btn-primary" href="/skann">Skann noe</Link>
      </main>
    )
  }

  if (scan.result.menu) {
    return (
      <main style={{ display: 'flex', flexDirection: 'column', paddingBottom: 104 }}>
        <div className={`flag-head ${scan.flag}`}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <Link href="/skann" aria-label="Tilbake til skanning" style={{ color: 'inherit', display: 'flex', width: 44, height: 44, alignItems: 'center' }}>
              <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
                <path d="M14 4l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <span className="tag">For {scan.profile_name}</span>
          </div>
          <div className="row" style={{ gap: 10, alignItems: 'flex-end' }}>
            <div className="stack" style={{ gap: 8, flex: 1, minWidth: 0 }}>
              <span className="flag-word">{scan.result.place ? `MENY · ${scan.result.place.toUpperCase()}` : 'MENY'}</span>
              <h1 style={{ fontSize: 26 }}>{scan.headline}</h1>
            </div>
            <span className="flag-mascot"><Mascot mood={scan.flag === 'green' ? 'happy' : scan.flag === 'red' ? 'stop' : 'unsure'} size={96} /></span>
          </div>
          <p className="flag-action">Si fra om allergien når du bestiller.</p>
        </div>
        <div className="page" style={{ paddingBottom: 24 }}>
          <MenuDishes dishes={scan.result.dishes ?? []} />
          <Insights items={scan.result.insights} />
          <p className="tiny">Kilde: {scan.source}. Rettene er lest av AI og kan inneholde feil. Ved alvorlig reaksjon: ring <b>113</b>.</p>
          <Link className="btn btn-dark" href="/skann">Skann en til</Link>
        </div>
      </main>
    )
  }

  const people: PersonResult[] = scan.result.people?.length
    ? scan.result.people
    : [{ profileId: '', name: scan.profile_name ?? '', evaluation: scan.result.evaluation }]
  const many = people.length > 1
  const sorted = [...people].sort((a, b) => RANK[a.evaluation.flag] - RANK[b.evaluation.flag])
  const allFindings = people.flatMap((p) => p.evaluation.findings)
  const red = allFindings.filter((f) => f.status === 'contains').flatMap((f) => f.evidence)
  const amber = allFindings.filter((f) => f.status === 'traces' || f.status === 'ambiguous').flatMap((f) => f.evidence)
  const reasons = [...new Set(people.flatMap((p) => p.evaluation.reasons))]
  const othersAll = people.map((p) => p.evaluation.others ?? [])
  // For familien: vis bare allergener som ingen av profilene har på listen.
  const others = (othersAll[0] ?? []).filter((o) => othersAll.every((list) => list.some((x) => x.label === o.label)))
  const product = scan.result.product ?? {}
  const ingredients = [product.ingredientsText, product.tracesText].filter(Boolean).join(' ')
  const wishMiss = people.some((p) => ((p as PersonResult & { wishes?: WishNote[] }).wishes ?? []).some((w) => w.ok === false))
  const canSuggest = (scan.flag !== 'green' || wishMiss) && !!scan.product_name && scan.mode !== 'food' && scan.mode !== 'product' && !kid
  // Initialer ved hvert treff når flere personer er med.
  const who: Record<string, string> = {}
  if (many) {
    const short = (n: string) => n.trim().charAt(0).toUpperCase()
    for (const p of people)
      for (const f of p.evaluation.findings)
        if (f.status === 'contains' || f.status === 'traces' || f.status === 'ambiguous')
          for (const w of f.evidence) {
            const k = w.toLowerCase()
            const cur = who[k] ? who[k].split('·') : []
            if (!cur.includes(short(p.name))) who[k] = [...cur, short(p.name)].join('·')
          }
  }
  const fetched = scan.result.fetchedAt ?? scan.created_at
  const fetchedText = new Date(fetched).toLocaleString('nb-NO', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  const sayIt = () =>
    speak(
      `${scan.flag === 'red' ? 'Nei.' : scan.flag === 'yellow' ? 'Usikkert.' : 'OK.'} ${many ? scan.headline : people[0].evaluation.headline}. ${ACTION[scan.flag]}`
    )

  return (
    <main style={{ display: 'flex', flexDirection: 'column', paddingBottom: 104 }}>
      <div className={`flag-head ${scan.flag}`}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <Link href="/skann" aria-label="Tilbake til skanning" style={{ color: 'inherit', display: 'flex', width: 44, height: 44, alignItems: 'center' }}>
            <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
              <path d="M14 4l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <span className="tag">{many ? `For ${people.length} personer` : `For ${people[0].name}`}</span>
        </div>
        <div className="row" style={{ gap: 10, alignItems: 'flex-end' }}>
          <div className="stack" style={{ gap: 8, flex: 1, minWidth: 0 }}>
            <span className="row" style={{ gap: 8 }}>
              <span className="flag-icon"><FlagIcon flag={scan.flag} size={30} /></span>
              <span className="flag-word">{EYEBROW[scan.flag]}</span>
            </span>
            <h1 style={{ fontSize: 26 }}>{many ? scan.headline : `${people[0].name}: ${scan.headline.charAt(0).toLowerCase()}${scan.headline.slice(1)}`}</h1>
          </div>
          <span className="flag-mascot"><Mascot mood={scan.flag === 'green' ? 'happy' : scan.flag === 'red' ? 'stop' : 'unsure'} size={104} /></span>
        </div>
        <p className="flag-action">{ACTION[scan.flag]}</p>
        {!many && reasons[0] && <p style={{ fontSize: 15 }}>{reasons[0]}</p>}
      </div>

      <div className="page" style={{ paddingBottom: 24 }}>
        {kid && (
          <div className="stack" style={{ gap: 10 }}>
            <button className="btn btn-primary" onClick={sayIt}>🔊 Les opp svaret</button>
            <CallButton kid={kid} />
          </div>
        )}
        <ChangedWarning changed={scan.result.changed} />
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
          <h2>{scan.product_name || (scan.mode === 'barcode' ? `Strekkode ${scan.ean}` : 'Ukjent produkt')}</h2>
          <span className="tiny" style={{ textAlign: 'right' }}>{MODE_LABEL[scan.mode]}</span>
        </div>

        {many && (
          <div className="stack" style={{ gap: 10 }}>
            {sorted.map((p) => <PersonCard key={p.profileId || p.name} person={p} avatar={p.profileId ? avatars[p.profileId] : undefined} />)}
          </div>
        )}

        {scan.mode !== 'food' && ingredients && (
          <div className="card ingredients">
            <Highlighted text={ingredients} red={red} amber={amber} who={many ? who : undefined} />
          </div>
        )}
        {scan.mode === 'food' && product.confidence && (
          <p className="small muted">Sikkerhet i gjenkjenningen: {CONFIDENCE[product.confidence] ?? product.confidence}</p>
        )}

        {!many && <Findings findings={people[0].evaluation.findings} />}
        {!many && <WishNotes notes={(people[0] as PersonResult & { wishes?: WishNote[] }).wishes} />}
        <NutritionBox n={product.nutrition} grain={product.grainInfo} keyhole={product.keyhole} />

        {others.length > 0 && (
          <div className="stack" style={{ gap: 6 }}>
            <span className="small" style={{ fontWeight: 700 }}>Også i produktet, men ikke på {many ? 'noen av listene' : 'listen'}:</span>
            {others.map((o) => (
              <div key={o.label + o.kind} className="finding small muted" style={{ alignItems: 'center' }}>
                <StatusIcon status="grey" size={16} />
                <span>{o.label}{o.kind === 'traces' ? ' (kan inneholde spor)' : ''}</span>
              </div>
            ))}
          </div>
        )}

        {(many ? reasons : reasons.slice(1)).length > 0 && (
          <div className="alert info">
            {(many ? reasons : reasons.slice(1)).map((r, i) => <p key={i}>{r}</p>)}
          </div>
        )}

        <Insights items={scan.result.insights ?? [...new Map(people.flatMap((p) => p.evaluation.insights ?? []).map((i) => [i.id, i])).values()]} />

        {canSuggest && <Alternatives scanId={scan.id} many={many} />}
        {scan.flag === 'green' && scan.ean && scan.owner_id === session.user.id && !kid && (
          <SaveSafe
            ean={scan.ean}
            name={scan.product_name}
            brand={product.brand}
            image={product.image}
            ingredients={product.ingredientsText}
            profileIds={scan.profile_ids ?? people.map((p) => p.profileId).filter(Boolean)}
          />
        )}

        <p className="tiny">
          Kilde: {scan.source}, hentet {fetchedText}. Okei erstatter ikke lege, sjekk alltid etiketten. Ved alvorlig reaksjon: ring <b>113</b>.
        </p>

        <Link className="btn btn-dark" href="/skann">Skann en til</Link>

        {scan.owner_id !== session.user.id ? (
          <p className="kid-badge" style={{ alignSelf: 'flex-start' }}>Skannet av {scan.profile_name ?? 'barnet'} på egen telefon</p>
        ) : sent ? (
          <p className="small muted">Takk! Tilbakemeldingen er lagret.</p>
        ) : open ? (
          <form onSubmit={sendFeedback} className="stack">
            <label className="field">
              Hva var feil?
              <textarea className="input" value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="F.eks. «Varen inneholder melk, men fikk grønt»" maxLength={2000} />
            </label>
            <button className="btn" type="submit">Send tilbakemelding</button>
          </form>
        ) : (
          <button className="linkbtn" onClick={() => setOpen(true)}>Var svaret feil? Si fra</button>
        )}
      </div>
    </main>
  )
}

export default function Page() {
  return (
    <AuthGate>
      <Result />
    </AuthGate>
  )
}
