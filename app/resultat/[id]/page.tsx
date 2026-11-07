'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import AuthGate from '@/components/AuthGate'
import { FlagIcon } from '@/components/Icons'
import { supabase } from '@/lib/supabase-browser'
import type { Evaluation, Finding, Flag } from '@/lib/rules'

interface Scan {
  id: string
  mode: 'barcode' | 'label' | 'food'
  profile_name: string | null
  product_name: string | null
  ean: string | null
  source: string | null
  flag: Flag
  headline: string
  feedback: string | null
  created_at: string
  result: {
    evaluation: Evaluation
    product: { brand?: string | null; ingredientsText?: string | null; tracesText?: string | null; confidence?: string | null }
  }
}

const EYEBROW: Record<Flag, string> = { red: 'RØDT FLAGG', yellow: 'GULT FLAGG', green: 'GRØNT FLAGG' }
const MODE_LABEL = { barcode: 'Strekkode', label: 'Foto av ingrediensliste', food: 'Gjetning fra bilde' }
const CONFIDENCE: Record<string, string> = { low: 'lav', medium: 'middels', high: 'høy' }

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function Highlighted({ text, red, amber }: { text: string; red: string[]; amber: string[] }) {
  const parts = useMemo(() => {
    const words = [...red, ...amber].filter((w) => w && w.length > 1)
    if (!words.length) return [text]
    const re = new RegExp(`(${words.sort((a, b) => b.length - a.length).map(escapeRe).join('|')})`, 'gi')
    return text.split(re)
  }, [text, red, amber])
  const lowerRed = red.map((w) => w.toLowerCase())
  const lowerAmber = amber.map((w) => w.toLowerCase())
  return (
    <>
      {parts.map((p, i) => {
        const l = p.toLowerCase()
        if (lowerRed.includes(l)) return <mark key={i} className="hit">{p}</mark>
        if (lowerAmber.includes(l)) return <mark key={i} className="hit-amber">{p}</mark>
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

function Result() {
  const params = useParams<{ id: string }>()
  const [scan, setScan] = useState<Scan | null | undefined>(undefined)
  const [feedback, setFeedback] = useState('')
  const [sent, setSent] = useState(false)
  const [open, setOpen] = useState(false)

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

  const ev = scan.result.evaluation
  const product = scan.result.product ?? {}
  const red = ev.findings.filter((f) => f.status === 'contains').flatMap((f) => f.evidence)
  const amber = ev.findings.filter((f) => f.status === 'traces' || f.status === 'ambiguous').flatMap((f) => f.evidence)
  const ingredients = [product.ingredientsText, product.tracesText].filter(Boolean).join(' ')

  return (
    <main style={{ display: 'flex', flexDirection: 'column', paddingBottom: 104 }}>
      <div className={`flag-head ${scan.flag}`}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <Link href="/skann" aria-label="Tilbake til skanning" style={{ color: 'inherit', display: 'flex', width: 44, height: 44, alignItems: 'center' }}>
            <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
              <path d="M14 4l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          {scan.profile_name && <span className="tag">For {scan.profile_name}</span>}
        </div>
        <div className="row" style={{ gap: 14 }}>
          <span className="flag-icon"><FlagIcon flag={scan.flag} /></span>
          <div className="stack" style={{ gap: 2 }}>
            <span className="eyebrow">{EYEBROW[scan.flag]}</span>
            <h1 style={{ fontSize: 26 }}>{scan.headline}</h1>
          </div>
        </div>
        {ev.reasons[0] && <p style={{ fontSize: 15 }}>{ev.reasons[0]}</p>}
      </div>

      <div className="page" style={{ paddingBottom: 24 }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
          <h2>{scan.product_name || (scan.mode === 'barcode' ? `Strekkode ${scan.ean}` : 'Ukjent produkt')}</h2>
          <span className="tiny" style={{ textAlign: 'right' }}>{MODE_LABEL[scan.mode]}</span>
        </div>

        {scan.mode !== 'food' && ingredients && (
          <div className="card ingredients">
            <Highlighted text={ingredients} red={red} amber={amber} />
          </div>
        )}
        {scan.mode === 'food' && product.confidence && (
          <p className="small muted">Sikkerhet i gjenkjenningen: {CONFIDENCE[product.confidence] ?? product.confidence}</p>
        )}

        {ev.findings.length > 0 && (
          <div className="stack" style={{ gap: 8 }}>
            {ev.findings.map((f) => {
              const s = statusText(f)
              return (
                <div key={f.key} className="finding">
                  <span className={`dot ${s.dot}`} />
                  <span><b>{f.label}:</b> {s.text}</span>
                </div>
              )
            })}
          </div>
        )}

        {ev.reasons.length > 1 && (
          <div className="alert info">
            {ev.reasons.slice(1).map((r, i) => <p key={i}>{r}</p>)}
          </div>
        )}

        <p className="tiny">
          Kilde: {scan.source}. Okei erstatter ikke lege, sjekk alltid etiketten. Ved alvorlig reaksjon: ring 113.
        </p>

        <Link className="btn btn-primary" href="/skann">Skann en til</Link>

        {sent ? (
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
