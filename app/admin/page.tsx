'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import AdminMfa from '@/components/AdminMfa'
import AuthGate, { useSession } from '@/components/AuthGate'
import { supabase } from '@/lib/supabase-browser'
import { apiPost } from '@/lib/client'
import { Logo } from '@/components/Icons'

// ---------- Typer ----------
interface Overview {
  users_total: number
  users_new: number
  users_active: number
  profiles_total: number
  scans_total: number
  scans_period: number
  scans_by_mode: Record<string, number>
  flags: Record<string, number>
  ai_period: number
  ai_with_tokens: number
  tokens_in: number
  tokens_out: number
  share_links: number
  subs_active: number
  mrr: number
  revenue_period: number
  revenue_total: number
  commission_earned: number
  commission_paid: number
  costs_period: number
  daily: { day: string; signups: number; scans: number; ai: number; revenue: number }[]
}
interface UserRow {
  id: string
  email: string
  name: string | null
  provider: string
  created_at: string
  last_sign_in_at: string | null
  profiles: number
  scans: number
  last_scan: string | null
  ai_scans: number
  subscription_status: string | null
  plan: string | null
  is_admin: boolean
}
interface Influencer {
  id: string
  name: string
  email: string | null
  channel: string | null
  commission_type: 'percent' | 'fixed'
  commission_value: number
  commission_payments: number | null
  notes: string | null
  active: boolean
}
interface InfStats {
  influencer_id: string
  codes: string | null
  customers: number
  active_customers: number
  payments: number
  revenue_nok: number
  commission_earned: number
  commission_paid: number
}
interface Code {
  id: string
  code: string
  influencer_id: string | null
  discount_type: 'none' | 'percent' | 'amount' | 'free'
  discount_value: number
  discount_months: number | null
  max_redemptions: number | null
  expires_at: string | null
  active: boolean
  stripe_promotion_code_id: string | null
  created_at: string
}
interface Payment {
  id: string
  amount_nok: number
  amount_ex_vat_nok: number
  commission_nok: number
  refunded: boolean
  paid_at: string
  user_id: string | null
  promo_code_id: string | null
  influencer_id: string | null
}
interface Payout {
  id: string
  influencer_id: string
  amount_nok: number
  paid_at: string
  note: string | null
}
interface Cost {
  id: string
  month: string
  category: string
  description: string | null
  amount_nok: number
  monthly: boolean
}
interface Status {
  stripe: boolean
  stripeLive: boolean
  webhook: boolean
  serviceRole: boolean
  model: string
}

type Tab = 'oversikt' | 'brukere' | 'salg' | 'influencere' | 'kostnader' | 'oppsett'
const TABS: { id: Tab; label: string }[] = [
  { id: 'oversikt', label: 'Oversikt' },
  { id: 'brukere', label: 'Brukere' },
  { id: 'salg', label: 'Salg' },
  { id: 'influencere', label: 'Influencere' },
  { id: 'kostnader', label: 'Kostnader' },
  { id: 'oppsett', label: 'Oppsett' }
]

const nok = (n: number) => `${new Intl.NumberFormat('nb-NO', { maximumFractionDigits: n < 100 ? 2 : 0 }).format(n)} kr`
const num = (n: number) => new Intl.NumberFormat('nb-NO').format(n)
const date = (s: string | null) => (s ? new Date(s).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short', year: 'numeric' }) : '–')
const MODE: Record<string, string> = { barcode: 'Strekkode', label: 'Etikett', food: 'Mat', menu: 'Meny', product: 'Medisin og hud' }

function discountText(c: Code) {
  const months = c.discount_months == null ? 'for alltid' : c.discount_months === 1 ? 'første betaling' : `${c.discount_months} mnd`
  if (c.discount_type === 'none') return 'Bare sporing'
  if (c.discount_type === 'free') return `Gratis, ${months}`
  if (c.discount_type === 'percent') return `${c.discount_value} % rabatt, ${months}`
  return `${nok(c.discount_value)} rabatt, ${months}`
}
function commissionText(i: Influencer) {
  const v = i.commission_type === 'percent' ? `${i.commission_value} %` : nok(i.commission_value)
  const n = i.commission_payments == null ? 'alle betalinger' : i.commission_payments === 1 ? 'første betaling' : `første ${i.commission_payments} betalinger`
  return `${v} av ${n}`
}

// ---------- Små byggeklosser ----------
function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="kpi">
      <span className="kpi-label">{label}</span>
      <span className="kpi-value">{value}</span>
      {sub && <span className="kpi-sub">{sub}</span>}
    </div>
  )
}

function Bars({ data, field, label, money }: { data: Overview['daily']; field: 'signups' | 'scans' | 'ai' | 'revenue'; label: string; money?: boolean }) {
  const max = Math.max(1, ...data.map((d) => d[field]))
  const total = data.reduce((s, d) => s + d[field], 0)
  const w = 640
  const h = 120
  const bw = w / Math.max(1, data.length)
  return (
    <div className="card admin-chart">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h3>{label}</h3>
        <span className="small muted">Totalt {money ? nok(total) : num(total)}</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h + 18}`} role="img" aria-label={`${label} per dag`} style={{ width: '100%', height: 'auto' }}>
        <line x1="0" x2={w} y1={h} y2={h} stroke="var(--line)" />
        {data.map((d, i) => {
          const bh = (d[field] / max) * (h - 8)
          return (
            <g key={d.day}>
              <title>{`${date(d.day)}: ${money ? nok(d[field]) : d[field]}`}</title>
              <rect x={i * bw + 1} y={h - bh} width={Math.max(1, bw - 2)} height={bh} rx="2" fill="var(--brand)" />
            </g>
          )
        })}
        <text x="0" y={h + 14} fontSize="11" fill="var(--muted)">{date(data[0]?.day ?? null)}</text>
        <text x={w} y={h + 14} fontSize="11" fill="var(--muted)" textAnchor="end">{date(data.at(-1)?.day ?? null)}</text>
      </svg>
    </div>
  )
}

// ---------- Siden ----------
function Admin() {
  const session = useSession()
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [tab, setTab] = useState<Tab>('oversikt')
  const [days, setDays] = useState(30)
  const [ov, setOv] = useState<Overview | null>(null)
  const [users, setUsers] = useState<UserRow[]>([])
  const [settings, setSettings] = useState<Record<string, number>>({})
  const [influencers, setInfluencers] = useState<Influencer[]>([])
  const [stats, setStats] = useState<InfStats[]>([])
  const [codes, setCodes] = useState<Code[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [costs, setCosts] = useState<Cost[]>([])
  const [admins, setAdmins] = useState<{ email: string; added_at: string }[]>([])
  const [status, setStatus] = useState<Status | null>(null)
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    const db = supabase()
    const [o, u, st, inf, s, c, p, po, co, ad] = await Promise.all([
      db.rpc('admin_overview', { p_days: days }),
      db.rpc('admin_users'),
      db.from('app_settings').select('key, value'),
      db.from('influencers').select('*').order('created_at'),
      db.rpc('admin_influencer_stats'),
      db.from('promo_codes').select('*').order('created_at', { ascending: false }),
      db.from('payments').select('*').order('paid_at', { ascending: false }).limit(500),
      db.from('commission_payouts').select('*').order('paid_at', { ascending: false }),
      db.from('costs').select('*').order('month', { ascending: false }),
      db.from('beta_admins').select('email, added_at').order('added_at')
    ])
    setOv((o.data as Overview) ?? null)
    setUsers((u.data ?? []) as UserRow[])
    setSettings(Object.fromEntries(((st.data ?? []) as { key: string; value: number }[]).map((r) => [r.key, Number(r.value)])))
    setInfluencers((inf.data ?? []) as Influencer[])
    setStats((s.data ?? []) as InfStats[])
    setCodes((c.data ?? []) as Code[])
    setPayments((p.data ?? []) as Payment[])
    setPayouts((po.data ?? []) as Payout[])
    setCosts((co.data ?? []) as Cost[])
    setAdmins((ad.data ?? []) as { email: string; added_at: string }[])
  }, [days])

  // Admin krever tofaktor: først sjekkes admin-listen, så om innloggingen er bekreftet med kode (aal2).
  const [needMfa, setNeedMfa] = useState(false)
  useEffect(() => {
    ;(async () => {
      const sb = supabase()
      const { data: member } = await sb.rpc('is_admin_member')
      if (!member) return setIsAdmin(false)
      const { data: aal } = await sb.auth.mfa.getAuthenticatorAssuranceLevel()
      if (aal?.currentLevel === 'aal2') return setIsAdmin(true)
      setNeedMfa(true)
      setIsAdmin(false)
    })()
  }, [])

  useEffect(() => {
    if (!isAdmin) return
    load()
    supabase()
      .auth.getSession()
      .then(({ data }) =>
        fetch('/api/admin/status', { headers: { Authorization: `Bearer ${data.session?.access_token}` } })
          .then((r) => (r.ok ? r.json() : null))
          .then(setStatus)
      )
  }, [isAdmin, load])

  // AI-kostnad: tokens × pris. Kall uten tokentall (eldre skann) anslås med snittet.
  const ai = useMemo(() => {
    if (!ov) return { cost: 0, perScan: 0, estimated: false }
    const usd = settings.usd_nok ?? 10.5
    const tokCost = ((ov.tokens_in * (settings.ai_usd_per_mtok_in ?? 3) + ov.tokens_out * (settings.ai_usd_per_mtok_out ?? 15)) / 1e6) * usd
    if (!ov.ai_with_tokens) return { cost: 0, perScan: 0, estimated: true }
    const perScan = tokCost / ov.ai_with_tokens
    return { cost: perScan * Math.max(ov.ai_period, ov.ai_with_tokens), perScan, estimated: ov.ai_period > ov.ai_with_tokens }
  }, [ov, settings])

  if (needMfa) return <AdminMfa onDone={() => { setNeedMfa(false); setIsAdmin(true) }} />
  if (isAdmin === null) return <main className="page center" style={{ alignItems: 'center' }}><div className="spinner" /></main>
  if (!isAdmin) {
    return (
      <main className="page">
        <h1>Ingen tilgang</h1>
        <p className="muted">Denne siden er bare for administratorer.</p>
        <Link href="/skann" className="btn">Til appen</Link>
      </main>
    )
  }

  const flash = (m: string) => {
    setMsg(m)
    setTimeout(() => setMsg(''), 4000)
  }

  return (
    <main className="admin">
      <header className="admin-head">
        <Link href="/skann" style={{ textDecoration: 'none' }} aria-label="Til appen"><Logo /></Link>
        <span className="tag">Admin</span>
        <span className="small muted" style={{ marginLeft: 'auto' }}>{session.user.email}</span>
      </header>
      <nav className="admin-tabs" aria-label="Admin">
        {TABS.map((t) => (
          <button key={t.id} aria-pressed={tab === t.id} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </nav>
      {msg && <div className="alert info" role="status">{msg}</div>}
      {status && !status.stripe && tab !== 'oppsett' && (
        <div className="alert info">Salg er ikke aktivert ennå. Se <button className="linklike" onClick={() => setTab('oppsett')}>Oppsett</button> for hva som må legges inn.</div>
      )}

      {tab === 'oversikt' && ov && (
        <section className="stack">
          <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <h1>Oversikt</h1>
            <div className="seg" role="group" aria-label="Periode">
              {[7, 30, 90, 365].map((d) => (
                <button key={d} aria-pressed={days === d} onClick={() => setDays(d)}>{d === 365 ? '1 år' : `${d} d`}</button>
              ))}
            </div>
          </div>
          <div className="kpi-grid">
            <Kpi label="Brukere totalt" value={num(ov.users_total)} sub={`+${num(ov.users_new)} siste ${days} d`} />
            <Kpi label="Aktive brukere" value={num(ov.users_active)} sub={`har skannet siste ${days} d`} />
            <Kpi label="Skann" value={num(ov.scans_period)} sub={`${num(ov.scans_total)} totalt`} />
            <Kpi label="Bildeskann (AI)" value={num(ov.ai_period)} sub={ai.perScan ? `ca. ${nok(ai.perScan)} per skann` : 'kostnad måles fra nå'} />
            <Kpi label="Betalende abonnenter" value={num(ov.subs_active)} sub={`MRR ${nok(ov.mrr)}`} />
            <Kpi label="Inntekt" value={nok(ov.revenue_period)} sub={`${nok(ov.revenue_total)} totalt`} />
            <Kpi label="Kostnader" value={nok(ov.costs_period + ai.cost)} sub={`AI ${nok(ai.cost)}${ai.estimated ? ' (delvis anslag)' : ''} + faste ${nok(ov.costs_period)}`} />
            <Kpi label="Provisjon å betale" value={nok(ov.commission_earned - ov.commission_paid)} sub={`${nok(ov.commission_earned)} opptjent totalt`} />
          </div>
          <div className="admin-grid2">
            <Bars data={ov.daily} field="signups" label="Nye brukere" />
            <Bars data={ov.daily} field="scans" label="Skann" />
            <Bars data={ov.daily} field="ai" label="Bildeskann (AI)" />
            <Bars data={ov.daily} field="revenue" label="Inntekt" money />
          </div>
          <div className="admin-grid2">
            <div className="card">
              <h3>Skann per type</h3>
              <table className="admin-table">
                <tbody>
                  {Object.entries(ov.scans_by_mode).sort((a, b) => b[1] - a[1]).map(([m, n]) => (
                    <tr key={m}><td>{MODE[m] ?? m}</td><td className="r">{num(n)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="card">
              <h3>Svar</h3>
              <table className="admin-table">
                <tbody>
                  <tr><td>🔴 Rødt</td><td className="r">{num(ov.flags.red ?? 0)}</td></tr>
                  <tr><td>🟡 Gult</td><td className="r">{num(ov.flags.yellow ?? 0)}</td></tr>
                  <tr><td>🟢 Grønt</td><td className="r">{num(ov.flags.green ?? 0)}</td></tr>
                  <tr><td>Profiler totalt</td><td className="r">{num(ov.profiles_total)}</td></tr>
                  <tr><td>Aktive allergikort</td><td className="r">{num(ov.share_links)}</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {tab === 'brukere' && <UsersTab users={users} />}
      {tab === 'salg' && <SalesTab payments={payments} users={users} codes={codes} influencers={influencers} />}
      {tab === 'influencere' && (
        <InfluencerTab
          influencers={influencers}
          stats={stats}
          codes={codes}
          payouts={payouts}
          stripeOn={!!status?.stripe}
          reload={load}
          flash={flash}
        />
      )}
      {tab === 'kostnader' && <CostsTab costs={costs} ov={ov} ai={ai} days={days} vat={settings.vat_percent ?? 25} reload={load} />}
      {tab === 'oppsett' && (
        <SetupTab status={status} settings={settings} admins={admins} me={session.user.email ?? ''} reload={load} flash={flash} />
      )}
    </main>
  )
}

// ---------- Brukere ----------
function UsersTab({ users }: { users: UserRow[] }) {
  const [q, setQ] = useState('')
  const list = users.filter((u) => !q || `${u.email} ${u.name ?? ''}`.toLowerCase().includes(q.toLowerCase()))
  function csv() {
    const head = ['e-post', 'navn', 'registrert', 'sist innlogget', 'profiler', 'skann', 'bildeskann', 'abonnement']
    const rows = list.map((u) => [u.email, u.name ?? '', u.created_at, u.last_sign_in_at ?? '', u.profiles, u.scans, u.ai_scans, u.subscription_status ?? ''])
    const text = [head, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob(['﻿' + text], { type: 'text/csv' }))
    a.download = 'okei-brukere.csv'
    a.click()
  }
  return (
    <section className="stack">
      <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <h1>Brukere <span className="muted">({num(users.length)})</span></h1>
        <button className="btn btn-small" onClick={csv}>Last ned CSV</button>
      </div>
      <input className="input" placeholder="Søk på e-post eller navn" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="card admin-scroll">
        <table className="admin-table">
          <thead>
            <tr><th>Bruker</th><th>Registrert</th><th>Sist inne</th><th className="r">Profiler</th><th className="r">Skann</th><th className="r">AI</th><th>Abonnement</th></tr>
          </thead>
          <tbody>
            {list.map((u) => (
              <tr key={u.id}>
                <td>
                  <b>{u.email}</b>{u.is_admin && <span className="tag" style={{ marginLeft: 6 }}>admin</span>}
                  {u.name && <div className="tiny">{u.name}</div>}
                </td>
                <td>{date(u.created_at)}</td>
                <td>{date(u.last_scan ?? u.last_sign_in_at)}</td>
                <td className="r">{u.profiles}</td>
                <td className="r">{u.scans}</td>
                <td className="r">{u.ai_scans}</td>
                <td>{u.subscription_status ? `${u.plan ?? ''} (${u.subscription_status})` : 'Gratis'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

// ---------- Salg ----------
function SalesTab({ payments, users, codes, influencers }: { payments: Payment[]; users: UserRow[]; codes: Code[]; influencers: Influencer[] }) {
  const email = (id: string | null) => users.find((u) => u.id === id)?.email ?? '–'
  const code = (id: string | null) => codes.find((c) => c.id === id)?.code ?? ''
  const inf = (id: string | null) => influencers.find((i) => i.id === id)?.name ?? ''
  const paid = payments.filter((p) => !p.refunded)
  return (
    <section className="stack">
      <h1>Salg</h1>
      <div className="kpi-grid">
        <Kpi label="Betalinger" value={num(paid.length)} />
        <Kpi label="Inntekt inkl. mva" value={nok(paid.reduce((s, p) => s + Number(p.amount_nok), 0))} />
        <Kpi label="Inntekt eks. mva" value={nok(paid.reduce((s, p) => s + Number(p.amount_ex_vat_nok), 0))} />
        <Kpi label="Med influencer-kode" value={num(paid.filter((p) => p.influencer_id).length)} />
      </div>
      {payments.length === 0 ? (
        <div className="card"><p className="muted">Ingen betalinger ennå. De dukker opp her automatisk når Stripe er koblet til og noen abonnerer.</p></div>
      ) : (
        <div className="card admin-scroll">
          <table className="admin-table">
            <thead><tr><th>Dato</th><th>Kunde</th><th className="r">Beløp</th><th>Kode</th><th>Influencer</th><th className="r">Provisjon</th></tr></thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} style={p.refunded ? { opacity: 0.5, textDecoration: 'line-through' } : undefined}>
                  <td>{date(p.paid_at)}</td>
                  <td>{email(p.user_id)}</td>
                  <td className="r">{nok(Number(p.amount_nok))}</td>
                  <td>{code(p.promo_code_id)}</td>
                  <td>{inf(p.influencer_id)}</td>
                  <td className="r">{p.commission_nok ? nok(Number(p.commission_nok)) : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

// ---------- Influencere og koder ----------
function InfluencerTab({
  influencers,
  stats,
  codes,
  payouts,
  stripeOn,
  reload,
  flash
}: {
  influencers: Influencer[]
  stats: InfStats[]
  codes: Code[]
  payouts: Payout[]
  stripeOn: boolean
  reload: () => void
  flash: (m: string) => void
}) {
  const [showNew, setShowNew] = useState(false)
  const [showCode, setShowCode] = useState<string | null>(null)
  const [payFor, setPayFor] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function addInfluencer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const months = String(f.get('payments') ?? '')
    const { error } = await supabase()
      .from('influencers')
      .insert({
        name: String(f.get('name') ?? '').trim(),
        email: String(f.get('email') ?? '').trim() || null,
        channel: String(f.get('channel') ?? '').trim() || null,
        commission_type: f.get('ctype') === 'fixed' ? 'fixed' : 'percent',
        commission_value: Number(f.get('cvalue') ?? 0),
        commission_payments: months === 'all' ? null : Number(months),
        notes: String(f.get('notes') ?? '').trim() || null
      })
    if (error) return setError('Kunne ikke lagre. Sjekk at navn og provisjon er fylt ut.')
    setShowNew(false)
    setError('')
    reload()
  }

  async function addCode(e: React.FormEvent<HTMLFormElement>, influencerId: string | null) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const months = String(f.get('dmonths') ?? '1')
    try {
      const r = await apiPost<{ synced: boolean }>('/api/admin/codes', {
        action: 'create',
        code: String(f.get('code') ?? ''),
        influencer_id: influencerId,
        discount_type: String(f.get('dtype') ?? 'none'),
        discount_value: Number(f.get('dvalue') ?? 0),
        discount_months: months === 'forever' ? null : Number(months),
        max_redemptions: Number(f.get('max') ?? 0) || null,
        expires_at: String(f.get('expires') ?? '') || null
      })
      setShowCode(null)
      setError('')
      flash(r.synced ? 'Koden er laget og lagt inn i Stripe.' : 'Koden er laget. Den legges inn i Stripe når Stripe er koblet til.')
      reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke lage koden.')
    }
  }

  async function codeAction(id: string, action: 'toggle' | 'sync') {
    try {
      await apiPost('/api/admin/codes', { action, id })
      reload()
    } catch (err) {
      flash(err instanceof Error ? err.message : 'Noe gikk galt.')
    }
  }

  async function addPayout(e: React.FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const { error } = await supabase()
      .from('commission_payouts')
      .insert({ influencer_id: id, amount_nok: Number(f.get('amount') ?? 0), paid_at: String(f.get('date') || new Date().toISOString().slice(0, 10)), note: String(f.get('note') ?? '') || null })
    if (error) return setError('Kunne ikke lagre utbetalingen.')
    setPayFor(null)
    reload()
  }

  async function toggleInfluencer(i: Influencer) {
    await supabase().from('influencers').update({ active: !i.active }).eq('id', i.id)
    reload()
  }

  const codeForm = (influencerId: string | null) => (
    <form className="stack admin-form" onSubmit={(e) => addCode(e, influencerId)}>
      <div className="admin-form-row">
        <label className="field">Kode<input className="input" name="code" required placeholder="NORA20" style={{ textTransform: 'uppercase' }} /></label>
        <label className="field">Rabatt til kunden
          <select className="input" name="dtype" defaultValue="percent">
            <option value="percent">Prosent</option>
            <option value="amount">Kroner</option>
            <option value="free">Gratis</option>
            <option value="none">Ingen (bare sporing)</option>
          </select>
        </label>
        <label className="field">Verdi<input className="input" name="dvalue" type="number" min="0" step="1" defaultValue={20} /></label>
        <label className="field">Varighet
          <select className="input" name="dmonths" defaultValue="1">
            <option value="1">Første betaling</option>
            <option value="3">3 måneder</option>
            <option value="6">6 måneder</option>
            <option value="12">12 måneder</option>
            <option value="forever">For alltid</option>
          </select>
        </label>
      </div>
      <div className="admin-form-row">
        <label className="field">Maks antall bruk (valgfritt)<input className="input" name="max" type="number" min="1" /></label>
        <label className="field">Utløper (valgfritt)<input className="input" name="expires" type="date" /></label>
      </div>
      <div className="row" style={{ gap: 8 }}>
        <button className="btn btn-primary btn-small" type="submit">Lag kode</button>
        <button className="btn btn-small" type="button" onClick={() => setShowCode(null)}>Avbryt</button>
      </div>
    </form>
  )

  return (
    <section className="stack">
      <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <h1>Influencere</h1>
        <button className="btn btn-primary btn-small" onClick={() => setShowNew(true)}>+ Ny influencer</button>
      </div>
      <p className="small muted">
        Hver influencer får én eller flere koder. Kunden skriver koden i betalingen, eller bruker lenken med koden. Provisjonen regnes automatisk av beløpet betalt eks. mva.
        {!stripeOn && ' Koder kan lages nå. Rabatten legges inn i Stripe når Stripe er koblet til.'}
      </p>
      {error && <div className="alert error">{error}</div>}

      {showNew && (
        <form className="card stack admin-form" onSubmit={addInfluencer}>
          <h3>Ny influencer</h3>
          <div className="admin-form-row">
            <label className="field">Navn<input className="input" name="name" required /></label>
            <label className="field">E-post<input className="input" name="email" type="email" /></label>
            <label className="field">Kanal<input className="input" name="channel" placeholder="Instagram, TikTok …" /></label>
          </div>
          <div className="admin-form-row">
            <label className="field">Provisjon
              <select className="input" name="ctype" defaultValue="percent">
                <option value="percent">Prosent av betalingen</option>
                <option value="fixed">Fast beløp per betaling</option>
              </select>
            </label>
            <label className="field">Verdi (% eller kr)<input className="input" name="cvalue" type="number" min="0" step="0.5" required defaultValue={30} /></label>
            <label className="field">Gjelder
              <select className="input" name="payments" defaultValue="1">
                <option value="1">Første betaling</option>
                <option value="3">Første 3 betalinger</option>
                <option value="6">Første 6 betalinger</option>
                <option value="12">Første 12 betalinger</option>
                <option value="all">Alle betalinger</option>
              </select>
            </label>
          </div>
          <label className="field">Notat<input className="input" name="notes" placeholder="Avtale, kontaktperson …" /></label>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn btn-primary btn-small" type="submit">Lagre</button>
            <button className="btn btn-small" type="button" onClick={() => setShowNew(false)}>Avbryt</button>
          </div>
        </form>
      )}

      {influencers.length === 0 && !showNew && <div className="card"><p className="muted">Ingen influencere ennå.</p></div>}

      {influencers.map((i) => {
        const s = stats.find((x) => x.influencer_id === i.id)
        const owed = (s?.commission_earned ?? 0) - (s?.commission_paid ?? 0)
        const myCodes = codes.filter((c) => c.influencer_id === i.id)
        return (
          <div key={i.id} className="card stack" style={i.active ? undefined : { opacity: 0.6 }}>
            <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <h3>{i.name} {!i.active && <span className="tag">pause</span>}</h3>
                <div className="tiny">{[i.channel, i.email].filter(Boolean).join(' · ')}{i.notes ? ` · ${i.notes}` : ''}</div>
                <div className="small">Provisjon: {commissionText(i)}</div>
              </div>
              <button className="btn btn-small" onClick={() => toggleInfluencer(i)}>{i.active ? 'Sett på pause' : 'Aktiver'}</button>
            </div>
            <div className="kpi-grid">
              <Kpi label="Kunder" value={num(s?.customers ?? 0)} sub={`${num(s?.active_customers ?? 0)} aktive`} />
              <Kpi label="Betalinger" value={num(s?.payments ?? 0)} />
              <Kpi label="Inntekt" value={nok(s?.revenue_nok ?? 0)} />
              <Kpi label="Provisjon å betale" value={nok(owed)} sub={`${nok(s?.commission_earned ?? 0)} opptjent, ${nok(s?.commission_paid ?? 0)} utbetalt`} />
            </div>

            <table className="admin-table">
              <thead><tr><th>Kode</th><th>Rabatt</th><th>Stripe</th><th></th></tr></thead>
              <tbody>
                {myCodes.map((c) => (
                  <tr key={c.id} style={c.active ? undefined : { opacity: 0.5 }}>
                    <td><b>{c.code}</b><div className="tiny">{typeof window !== 'undefined' ? `${window.location.origin}/?kode=${c.code}` : ''}</div></td>
                    <td>{discountText(c)}{c.max_redemptions ? ` · maks ${c.max_redemptions}` : ''}{c.expires_at ? ` · til ${date(c.expires_at)}` : ''}</td>
                    <td>{c.discount_type === 'none' ? '–' : c.stripe_promotion_code_id ? '✓' : stripeOn ? <button className="btn btn-small" onClick={() => codeAction(c.id, 'sync')}>Legg inn</button> : 'venter'}</td>
                    <td className="r"><button className="btn btn-small" onClick={() => codeAction(c.id, 'toggle')}>{c.active ? 'Slå av' : 'Slå på'}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {showCode === i.id ? codeForm(i.id) : <button className="btn btn-small" onClick={() => setShowCode(i.id)}>+ Ny kode</button>}

            {payFor === i.id ? (
              <form className="stack admin-form" onSubmit={(e) => addPayout(e, i.id)}>
                <div className="admin-form-row">
                  <label className="field">Beløp utbetalt (kr)<input className="input" name="amount" type="number" min="1" step="0.01" required defaultValue={Math.max(0, Math.round(owed))} /></label>
                  <label className="field">Dato<input className="input" name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></label>
                  <label className="field">Notat<input className="input" name="note" placeholder="Faktura nr. …" /></label>
                </div>
                <div className="row" style={{ gap: 8 }}>
                  <button className="btn btn-primary btn-small" type="submit">Registrer utbetaling</button>
                  <button className="btn btn-small" type="button" onClick={() => setPayFor(null)}>Avbryt</button>
                </div>
              </form>
            ) : (
              <button className="btn btn-small" onClick={() => setPayFor(i.id)}>Registrer utbetaling av provisjon</button>
            )}
            {payouts.filter((p) => p.influencer_id === i.id).length > 0 && (
              <div className="tiny">
                Utbetalt: {payouts.filter((p) => p.influencer_id === i.id).map((p) => `${date(p.paid_at)} ${nok(Number(p.amount_nok))}${p.note ? ` (${p.note})` : ''}`).join(' · ')}
              </div>
            )}
          </div>
        )
      })}

      <div className="card stack">
        <h3>Koder uten influencer</h3>
        <p className="tiny">For kampanjer, for eksempel en rabatt i et nyhetsbrev.</p>
        <table className="admin-table">
          <tbody>
            {codes.filter((c) => !c.influencer_id).map((c) => (
              <tr key={c.id} style={c.active ? undefined : { opacity: 0.5 }}>
                <td><b>{c.code}</b></td>
                <td>{discountText(c)}</td>
                <td>{c.discount_type === 'none' ? '–' : c.stripe_promotion_code_id ? '✓ Stripe' : 'venter på Stripe'}</td>
                <td className="r"><button className="btn btn-small" onClick={() => codeAction(c.id, 'toggle')}>{c.active ? 'Slå av' : 'Slå på'}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {showCode === 'none' ? codeForm(null) : <button className="btn btn-small" onClick={() => setShowCode('none')}>+ Ny kampanjekode</button>}
      </div>
    </section>
  )
}

// ---------- Kostnader ----------
function CostsTab({ costs, ov, ai, days, vat, reload }: { costs: Cost[]; ov: Overview | null; ai: { cost: number; perScan: number; estimated: boolean }; days: number; vat: number; reload: () => void }) {
  const [error, setError] = useState('')
  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const form = e.currentTarget
    const { error } = await supabase()
      .from('costs')
      .insert({
        month: `${String(f.get('month'))}-01`,
        category: String(f.get('category')),
        description: String(f.get('description') ?? '') || null,
        amount_nok: Number(f.get('amount') ?? 0),
        monthly: f.get('monthly') === 'on'
      })
    if (error) return setError('Kunne ikke lagre kostnaden.')
    setError('')
    form.reset()
    reload()
  }
  async function remove(id: string) {
    if (!window.confirm('Slette kostnaden?')) return
    await supabase().from('costs').delete().eq('id', id)
    reload()
  }
  const revenueEx = ov ? ov.revenue_period / (1 + vat / 100) : 0
  const total = (ov?.costs_period ?? 0) + ai.cost
  return (
    <section className="stack">
      <h1>Kostnader</h1>
      <div className="kpi-grid">
        <Kpi label={`AI siste ${days} d`} value={nok(ai.cost)} sub={ai.perScan ? `${nok(ai.perScan)} per bildeskann${ai.estimated ? ', delvis anslag' : ''}` : 'Måles fra første bildeskann etter denne oppdateringen'} />
        <Kpi label="Faste og andre kostnader" value={nok(ov?.costs_period ?? 0)} sub="lagt inn under" />
        <Kpi label="Inntekt eks. mva" value={nok(revenueEx)} />
        <Kpi label="Resultat før provisjon" value={nok(revenueEx - total)} sub="inntekt eks. mva minus kostnader" />
      </div>
      <form className="card stack admin-form" onSubmit={add}>
        <h3>Legg inn kostnad</h3>
        <div className="admin-form-row">
          <label className="field">Måned<input className="input" name="month" type="month" required defaultValue={new Date().toISOString().slice(0, 7)} /></label>
          <label className="field">Kategori
            <select className="input" name="category" defaultValue="Drift">
              <option>Drift</option>
              <option>Markedsføring</option>
              <option>Influencer</option>
              <option>Rådgivning</option>
              <option>Lisenser</option>
              <option>Annet</option>
            </select>
          </label>
          <label className="field">Beløp (kr)<input className="input" name="amount" type="number" min="0" step="0.01" required /></label>
        </div>
        <label className="field">Beskrivelse<input className="input" name="description" placeholder="Vercel Pro, Supabase, annonse …" /></label>
        <label className="row" style={{ gap: 8 }}><input type="checkbox" name="monthly" /> Fast hver måned</label>
        {error && <div className="alert error">{error}</div>}
        <button className="btn btn-primary btn-small" type="submit">Lagre</button>
      </form>
      <div className="card admin-scroll">
        <table className="admin-table">
          <thead><tr><th>Måned</th><th>Kategori</th><th>Beskrivelse</th><th className="r">Beløp</th><th></th></tr></thead>
          <tbody>
            {costs.map((c) => (
              <tr key={c.id}>
                <td>{new Date(c.month).toLocaleDateString('nb-NO', { month: 'short', year: 'numeric' })}</td>
                <td>{c.category}{c.monthly && <span className="tag" style={{ marginLeft: 6 }}>fast</span>}</td>
                <td>{c.description}</td>
                <td className="r">{nok(Number(c.amount_nok))}</td>
                <td className="r"><button className="btn btn-small btn-danger" onClick={() => remove(c.id)}>Slett</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="tiny">Faste kostnader legges inn per måned. AI-kostnaden regnes av faktisk tokenforbruk og prisene under Oppsett. Bildeskann fra delte allergikort er ikke med i AI-kostnaden ennå.</p>
    </section>
  )
}

// ---------- Oppsett ----------
function SetupTab({ status, settings, admins, me, reload, flash }: { status: Status | null; settings: Record<string, number>; admins: { email: string; added_at: string }[]; me: string; reload: () => void; flash: (m: string) => void }) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  async function addAdmin(e: React.FormEvent) {
    e.preventDefault()
    const clean = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return setError('Sjekk e-postadressen.')
    const { error } = await supabase().from('beta_admins').insert({ email: clean })
    if (error) return setError(error.code === '23505' ? 'Er allerede administrator.' : 'Kunne ikke legge til.')
    setEmail('')
    setError('')
    flash(`${clean} er nå administrator.`)
    reload()
  }
  async function removeAdmin(addr: string) {
    if (!window.confirm(`Fjerne ${addr} som administrator?`)) return
    await supabase().from('beta_admins').delete().eq('email', addr)
    reload()
  }
  async function saveSettings(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const rows = ['ai_usd_per_mtok_in', 'ai_usd_per_mtok_out', 'usd_nok', 'vat_percent'].map((key) => ({ key, value: Number(f.get(key)), updated_at: new Date().toISOString() }))
    const { error } = await supabase().from('app_settings').upsert(rows)
    if (error) return setError('Kunne ikke lagre innstillingene.')
    flash('Innstillingene er lagret.')
    reload()
  }
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const check = (ok: boolean | undefined) => (ok ? '✅' : '⬜')
  return (
    <section className="stack">
      <h1>Oppsett</h1>

      <div className="card stack">
        <h3>Administratorer</h3>
        <p className="small muted">Administratorer ser hele dashboardet. Personen logger inn i Okei med e-postadressen du legger inn.</p>
        <form onSubmit={addAdmin} className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <input className="input" style={{ flex: 1, minWidth: 220 }} type="email" placeholder="navn@eksempel.no" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button className="btn btn-primary btn-small" type="submit">Legg til</button>
        </form>
        {error && <div className="alert error">{error}</div>}
        <table className="admin-table">
          <tbody>
            {admins.map((a) => (
              <tr key={a.email}>
                <td><b>{a.email}</b></td>
                <td>siden {date(a.added_at)}</td>
                <td className="r">{a.email.toLowerCase() !== me.toLowerCase() && <button className="btn btn-small btn-danger" onClick={() => removeAdmin(a.email)}>Fjern</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card stack">
        <h3>Stripe og salg</h3>
        <p className="small muted">Disse nøklene legger du selv inn i Vercel (Settings → Environment Variables), og deployer på nytt. Verdiene vises aldri her.</p>
        <table className="admin-table">
          <tbody>
            <tr><td>{check(status?.stripe)} STRIPE_SECRET_KEY</td><td className="tiny">Fra Stripe → Developers → API keys. {status?.stripe ? (status.stripeLive ? 'Live-modus.' : 'Testmodus.') : ''}</td></tr>
            <tr><td>{check(status?.webhook)} STRIPE_WEBHOOK_SECRET</td><td className="tiny">Lag et webhook-endepunkt i Stripe til <b>{origin}/api/stripe/webhook</b> med hendelsene checkout.session.completed, customer.subscription.created/updated/deleted, invoice.paid og charge.refunded.</td></tr>
            <tr><td>{check(status?.serviceRole)} SUPABASE_SERVICE_ROLE_KEY</td><td className="tiny">Fra Supabase → Project Settings → API keys (service_role). Lar webhooken lagre betalinger.</td></tr>
          </tbody>
        </table>
        <p className="tiny">Influencer-lenker har formen {origin}/?kode=KODE. Koden huskes på telefonen og brukes når kunden betaler.</p>
      </div>

      <form className="card stack admin-form" onSubmit={saveSettings}>
        <h3>Priser for kostnadsberegning</h3>
        <p className="small muted">AI-modell: {status?.model ?? '–'}. Sjekk gjeldende pris hos Anthropic og oppdater ved behov.</p>
        <div className="admin-form-row">
          <label className="field">USD per million tokens inn<input className="input" name="ai_usd_per_mtok_in" type="number" step="0.01" defaultValue={settings.ai_usd_per_mtok_in ?? 3} /></label>
          <label className="field">USD per million tokens ut<input className="input" name="ai_usd_per_mtok_out" type="number" step="0.01" defaultValue={settings.ai_usd_per_mtok_out ?? 15} /></label>
          <label className="field">Kurs USD → NOK<input className="input" name="usd_nok" type="number" step="0.01" defaultValue={settings.usd_nok ?? 10.5} /></label>
          <label className="field">Mva (%)<input className="input" name="vat_percent" type="number" step="1" defaultValue={settings.vat_percent ?? 25} /></label>
        </div>
        <button className="btn btn-primary btn-small" type="submit">Lagre</button>
      </form>
    </section>
  )
}

export default function Page() {
  return (
    <AuthGate>
      <Admin />
    </AuthGate>
  )
}
