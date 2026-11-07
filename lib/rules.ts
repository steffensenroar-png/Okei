// Regelmotoren: setter flagget. Ingen AI her.
// AI leser etiketter og gjetter retter; denne koden avgjør rødt/gult/grønt,
// slik at hvert svar kan etterprøves og testes.
//
// Grunnregler:
// - Rødt: profilens allergen er oppgitt i ingrediensene, eller spor ved alvorlig allergi.
// - Gult: spor, tvetydige ingredienser, uleselig etikett, manglende data, eller foto av uemballert mat.
// - Grønt: bare når vi har data for hvert av profilens allergener og ingen treff.
// - Foto av uemballert mat gir aldri grønt.

import {
  ALLERGEN_BY_KEY,
  AllergenDef,
  AllergenKey,
  ConditionKey,
  LACTOSE_DEF,
  Severity,
  blankOut,
  findTerms,
  isLactoseFree,
  matchAllergen,
  normalize
} from './allergens'

export type Mode = 'barcode' | 'label' | 'food'
export type Flag = 'red' | 'yellow' | 'green'
export type StructuredStatus = 'contains' | 'traces' | 'free' | 'unknown'
export type Status = 'contains' | 'traces' | 'ambiguous' | 'likely' | 'none' | 'unknown'
export type Legibility = 'good' | 'partial' | 'poor'

export interface ProfileAllergen {
  key: AllergenKey
  severity: Severity
}

export interface ProfileInput {
  name: string
  allergens: ProfileAllergen[]
  customTerms?: string[]
  conditions?: ConditionKey[]
}

export interface ProductData {
  mode: Mode
  name?: string | null
  brand?: string | null
  ean?: string | null
  ingredientsText?: string | null
  tracesText?: string | null
  structured?: Partial<Record<AllergenKey, StructuredStatus>>
  legibility?: Legibility
  likely?: AllergenKey[]
  confidence?: 'low' | 'medium' | 'high'
  source: string
  found: boolean
}

export interface Finding {
  key: string
  label: string
  severity: Severity
  status: Status
  evidence: string[]
  note?: string
}

export interface OtherAllergen {
  label: string
  kind: 'contains' | 'traces'
}

export interface Evaluation {
  flag: Flag
  headline: string
  reasons: string[]
  findings: Finding[]
  /** Allergener i produktet som ikke står på profilen (til informasjon). */
  others?: OtherAllergen[]
}

const TRACE_PATTERNS = [
  /kan (også )?inneholde( små mengder| spor| rester)?( av)?/g,
  /kan (også )?indeholde( spor)?( af)?/g,
  /kan (även |också )?innehålla( spår)?( av)?/g,
  /may (also )?contain( traces)?( of)?/g,
  /spor av/g,
  /traces of/g,
  /(produsert|pakket|laget) (i|på) (en |et )?(fabrikk|anlegg|bedrift|linje|produksjonslinje)[^.]*?(som også|der det også|hvor det også)[^.]*/g
]

/** Del en ingrediensliste i hoveddel og «kan inneholde spor»-setninger. */
export function splitTraces(raw: string): { main: string; traces: string } {
  let main = normalize(raw)
  const traces: string[] = []
  for (const re of TRACE_PATTERNS) {
    re.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = re.exec(main)) !== null) {
      const startIdx = m.index
      const dot = main.indexOf('.', startIdx + m[0].length)
      const endIdx = dot === -1 ? main.length : dot + 1
      traces.push(main.slice(startIdx, endIdx))
      main = main.slice(0, startIdx) + ' '.repeat(endIdx - startIdx) + main.slice(endIdx)
      re.lastIndex = 0
    }
  }
  return { main, traces: traces.join(' ') }
}

function listLabels(fs: Finding[]): string {
  const labels = fs.map((f) => f.label.toLowerCase())
  if (labels.length <= 1) return labels.join('')
  return labels.slice(0, -1).join(', ') + ' og ' + labels[labels.length - 1]
}

const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1)

interface Check {
  key: string
  label: string
  severity: Severity
  def: AllergenDef
  dataKey: AllergenKey
  lactose?: boolean
}

function otherAllergens(product: ProductData, main: string, traces: string, findings: Finding[]): OtherAllergen[] {
  if (product.mode === 'food') return []
  const covered = new Set(findings.map((f) => (f.key === 'lactose' ? 'milk' : f.key)))
  const out: OtherAllergen[] = []
  for (const def of Object.values(ALLERGEN_BY_KEY)) {
    if (covered.has(def.key)) continue
    const st = product.structured?.[def.key]
    if ((main && matchAllergen(main, def).hits.length) || st === 'contains') out.push({ label: def.label, kind: 'contains' })
    else if ((traces && matchAllergen(traces, def).hits.length) || st === 'traces') out.push({ label: def.label, kind: 'traces' })
  }
  return out
}

/** Oversett profilens allergier og tilstander til konkrete sjekker. */
export function buildChecks(profile: ProfileInput): Check[] {
  const conditions = profile.conditions ?? []
  const coeliac = conditions.includes('coeliac')
  const checks: Check[] = []
  for (const pa of profile.allergens) {
    const def = ALLERGEN_BY_KEY[pa.key]
    if (!def) continue
    if (pa.key === 'gluten' && coeliac) continue
    checks.push({ key: pa.key, label: def.label, severity: pa.severity, def, dataKey: pa.key })
  }
  if (coeliac) {
    checks.push({ key: 'gluten', label: 'Gluten (cøliaki)', severity: 'severe', def: ALLERGEN_BY_KEY.gluten, dataKey: 'gluten' })
  }
  if (conditions.includes('lactose') && !profile.allergens.some((a) => a.key === 'milk')) {
    checks.push({ key: 'lactose', label: 'Laktose', severity: 'moderate', def: LACTOSE_DEF, dataKey: 'milk', lactose: true })
  }
  return checks
}

export function evaluate(product: ProductData, profile: ProfileInput): Evaluation {
  const reasons: string[] = []
  const findings: Finding[] = []

  const text = (product.ingredientsText ?? '').trim()
  const extraTraces = (product.tracesText ?? '').trim()
  const { main, traces } = text ? splitTraces(text) : { main: '', traces: '' }
  const tracesAll = [traces, extraTraces ? normalize(extraTraces) : ''].filter(Boolean).join(' ')
  const hasText = text.length > 0
  const legible = product.legibility ? product.legibility === 'good' : true

  for (const c of buildChecks(profile)) {
    const def = c.def
    const f: Finding = { key: c.key, label: c.label, severity: c.severity, status: 'none', evidence: [] }

    if (product.mode === 'food') {
      f.status = product.likely?.includes(c.dataKey) ? 'likely' : 'unknown'
      findings.push(f)
      continue
    }

    if (c.lactose && hasText && isLactoseFree(text)) {
      findings.push(f)
      continue
    }

    const inMain = hasText ? matchAllergen(main, def) : { hits: [], ambiguous: [] }
    const inTraces = tracesAll ? matchAllergen(tracesAll, def) : { hits: [], ambiguous: [] }
    const st = product.structured?.[c.dataKey]

    if (inMain.hits.length || st === 'contains') {
      f.status = 'contains'
      f.evidence = inMain.hits.length ? inMain.hits : ['oppgitt i produktdata']
    } else if (inTraces.hits.length || st === 'traces') {
      f.status = 'traces'
      f.evidence = inTraces.hits.length ? inTraces.hits : ['«kan inneholde spor» i produktdata']
    } else if (inMain.ambiguous.length) {
      f.status = 'ambiguous'
      f.evidence = inMain.ambiguous
      f.note = def.ambiguousNote
    } else if ((hasText && legible) || st === 'free') {
      f.status = 'none'
    } else {
      f.status = 'unknown'
    }
    findings.push(f)
  }

  for (const term of profile.customTerms ?? []) {
    const t = term.trim()
    if (!t) continue
    const f: Finding = { key: `custom:${t.toLowerCase()}`, label: t, severity: 'moderate', status: 'none', evidence: [] }
    if (product.mode === 'food') {
      f.status = 'unknown'
    } else {
      const hitsMain = hasText ? findTerms(blankOut(main, []), [{ t }]) : []
      const hitsTr = tracesAll ? findTerms(tracesAll, [{ t }]) : []
      if (hitsMain.length) {
        f.status = 'contains'
        f.evidence = hitsMain
      } else if (hitsTr.length) {
        f.status = 'traces'
        f.evidence = hitsTr
      } else if (!(hasText && legible)) {
        f.status = 'unknown'
      }
    }
    findings.push(f)
  }

  const others = otherAllergens(product, main, tracesAll, findings)
  const contains = findings.filter((f) => f.status === 'contains')
  const severeTraces = findings.filter((f) => f.status === 'traces' && f.severity === 'severe')
  const otherTraces = findings.filter((f) => f.status === 'traces' && f.severity !== 'severe')
  const ambiguous = findings.filter((f) => f.status === 'ambiguous')
  const unknown = findings.filter((f) => f.status === 'unknown')
  const likely = findings.filter((f) => f.status === 'likely')

  // Uemballert mat: aldri grønt. Sannsynlig allergen ved alvorlig allergi gir rødt.
  if (product.mode === 'food') {
    reasons.push('Vi kan ikke se ingrediensene. Spør den som har laget maten.')
    const severeLikely = likely.filter((f) => f.severity === 'severe')
    if (severeLikely.length) {
      return { flag: 'red', headline: `Sannsynligvis ${listLabels(severeLikely)}. Ikke spis.`, reasons, findings, others: [] }
    }
    if (likely.length) {
      return { flag: 'yellow', headline: `Inneholder vanligvis ${listLabels(likely)}`, reasons, findings, others: [] }
    }
    return { flag: 'yellow', headline: 'Usikkert – gjetning fra bilde', reasons, findings, others: [] }
  }

  if (!product.found && !hasText) {
    reasons.push('Fant ikke produktet eller ingredienslisten. Ta bilde av ingredienslisten i stedet.')
    return { flag: 'yellow', headline: 'Fant ikke nok produktdata', reasons, findings, others }
  }

  if (contains.length) {
    if (!legible) reasons.push('Deler av etiketten var vanskelig å lese.')
    return { flag: 'red', headline: `Inneholder ${listLabels(contains)}`, reasons, findings, others }
  }
  if (severeTraces.length) {
    reasons.push('Ved alvorlig allergi regnes «kan inneholde spor» som rødt.')
    return { flag: 'red', headline: `Kan inneholde spor av ${listLabels(severeTraces)}`, reasons, findings, others }
  }

  if (product.mode === 'label' && product.legibility === 'poor') {
    reasons.push('Bildet var for utydelig til å lese ingredienslisten sikkert. Ta et nytt bilde nærmere.')
    return { flag: 'yellow', headline: 'Kunne ikke lese etiketten', reasons, findings, others }
  }

  if (otherTraces.length || ambiguous.length || unknown.length || !legible) {
    if (otherTraces.length) reasons.push(`Etiketten oppgir at varen kan inneholde spor av ${listLabels(otherTraces)}.`)
    for (const a of ambiguous) if (a.note) reasons.push(a.note)
    if (unknown.length) reasons.push(`Mangler data for ${listLabels(unknown)}. Sjekk etiketten selv.`)
    if (!legible && product.mode === 'label') reasons.push('Deler av etiketten var vanskelig å lese.')
    const headline = otherTraces.length
      ? `Kan inneholde spor av ${listLabels(otherTraces)}`
      : ambiguous.length
        ? `Usikker ingrediens: ${ambiguous[0].evidence[0]}`
        : 'Usikkert'
    return { flag: 'yellow', headline: cap(headline), reasons, findings, others }
  }

  if (!findings.length) {
    reasons.push('Profilen har ingen allergier eller tilstander registrert.')
    return { flag: 'green', headline: 'Ingen registrerte allergier', reasons, findings, others }
  }

  reasons.push('Sjekk alltid etiketten. Oppskrifter kan endres.')
  const n = profile.name?.trim()
  const who = n ? (/[sxz]$/i.test(n) ? `${n}'` : `${n}s`) : 'dine'
  return { flag: 'green', headline: `Ingen av ${who} allergener funnet`, reasons, findings, others }
}

// ---------- Familievurdering: én skann mot flere profiler ----------

export interface PersonResult {
  profileId: string
  name: string
  evaluation: Evaluation
}

export interface FamilyEvaluation {
  flag: Flag
  headline: string
  people: PersonResult[]
}

const RANK: Record<Flag, number> = { green: 0, yellow: 1, red: 2 }

function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join('')
  return names.slice(0, -1).join(', ') + ' og ' + names[names.length - 1]
}

export function evaluateFamily(
  product: ProductData,
  profiles: (ProfileInput & { id: string })[]
): FamilyEvaluation {
  const people = profiles.map((p) => ({ profileId: p.id, name: p.name, evaluation: evaluate(product, p) }))
  if (people.length === 1) {
    return { flag: people[0].evaluation.flag, headline: people[0].evaluation.headline, people }
  }
  const flag = people.reduce<Flag>((w, p) => (RANK[p.evaluation.flag] > RANK[w] ? p.evaluation.flag : w), 'green')
  const red = people.filter((p) => p.evaluation.flag === 'red').map((p) => p.name)
  const yellow = people.filter((p) => p.evaluation.flag === 'yellow').map((p) => p.name)
  let headline: string
  if (flag === 'green') headline = 'OK for alle'
  else if (red.length === people.length) headline = 'Ikke for noen av dere'
  else if (red.length) headline = `Ikke for ${joinNames(red)}`
  else if (yellow.length === people.length) headline = 'Usikkert for alle'
  else headline = `Usikkert for ${joinNames(yellow)}`
  return { flag, headline, people }
}
