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
  BIRCH_DEF,
  COELIAC_EXCLUDE,
  ConditionKey,
  LACTOSE_DEF,
  WHEAT_STARCH,
  claimsGlutenFree,
  Severity,
  blankOut,
  findTerms,
  isLactoseFree,
  matchAllergen,
  normalize
} from './allergens'
import { INSIGHTS, Insight } from './insights'
export type { Insight } from './insights'

export type Mode = 'barcode' | 'label' | 'food' | 'product'
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
  /** Pakken er merket glutenfri eller har symbolet med overstreket aks. */
  glutenFreeClaim?: boolean
  nutrition?: Nutrition | null
  grainInfo?: string | null
  keyhole?: boolean
  labels?: string[]
  image?: string | null
  source: string
  found: boolean
}

export interface Nutrition {
  energy_kcal?: number
  carbohydrates_g?: number
  sugars_g?: number
  fiber_g?: number
  protein_g?: number
  fat_g?: number
  salt_g?: number
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
  /** «Godt å vite»: forklaringer som bygger kunnskap, med kilde. */
  insights?: Insight[]
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
  coeliac?: boolean
  birch?: boolean
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
    // Spor gir gult som standard (Norsk cøliakiforening). «Svært sensitiv» gir rødt.
    const g = ALLERGEN_BY_KEY.gluten
    checks.push({
      key: 'gluten',
      label: 'Gluten (cøliaki)',
      severity: conditions.includes('coeliac_strict') ? 'severe' : 'moderate',
      def: { ...g, exclude: [...COELIAC_EXCLUDE, ...g.exclude] },
      dataKey: 'gluten',
      coeliac: true
    })
  }
  if (conditions.includes('birch')) {
    checks.push({ key: 'birch', label: 'Kryssreaksjon (bjørk)', severity: 'mild', def: BIRCH_DEF, dataKey: 'nuts', birch: true })
  }
  if (conditions.includes('lactose') && !profile.allergens.some((a) => a.key === 'milk')) {
    checks.push({ key: 'lactose', label: 'Laktose', severity: 'moderate', def: LACTOSE_DEF, dataKey: 'milk', lactose: true })
  }
  return checks
}

function evaluateCore(product: ProductData, profile: ProfileInput, flags: CoreFlags): Evaluation {
  const reasons: string[] = []
  const findings: Finding[] = []

  const text = (product.ingredientsText ?? '').trim()
  const extraTraces = (product.tracesText ?? '').trim()
  const { main, traces } = text ? splitTraces(text) : { main: '', traces: '' }
  const tracesAll = [traces, extraTraces ? normalize(extraTraces) : ''].filter(Boolean).join(' ')
  const hasText = text.length > 0
  const legible = product.legibility ? product.legibility === 'good' : true
  const normText = normalize(text)
  const glutenFree = !!product.glutenFreeClaim || claimsGlutenFree(`${product.name ?? ''} ${text}`)
  let usedWheatStarch = false
  let sawOats = false
  let sawBirch = false
  const sync = () => Object.assign(flags, { usedWheatStarch, sawOats, sawBirch, glutenFree })

  for (const c of buildChecks(profile)) {
    const def = c.def
    const f: Finding = { key: c.key, label: c.label, severity: c.severity, status: 'none', evidence: [] }

    if (product.mode === 'food') {
      if (c.birch) {
        // Uemballert mat: maskoten kan ikke se om eplet er rått. Vis bare forklaringen.
        sawBirch = true
        findings.push(f)
        continue
      }
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
    let st = c.birch ? undefined : product.structured?.[c.dataKey]

    if (c.coeliac) {
      // «Hvetestivelse*» med fotnote om glutenfri: OK når varen er merket glutenfri.
      if (glutenFree && inMain.hits.length) {
        const kept = inMain.hits.filter((h) => !WHEAT_STARCH.test(h))
        if (kept.length < inMain.hits.length) usedWheatStarch = true
        inMain.hits = kept
      }
      if (hasText && COELIAC_EXCLUDE.some((p) => normText.includes(p))) usedWheatStarch = true
      // Butikkdata sier ofte «inneholder gluten» om glutenfri hvetestivelse. Stol på ingredienslisten da.
      if (st === 'contains' && usedWheatStarch && !inMain.hits.length) st = undefined
      if (inMain.hits.some((h) => /havre|oats/.test(h))) sawOats = true
    }

    if (c.birch) {
      if (inMain.hits.length) {
        f.status = 'ambiguous'
        f.evidence = inMain.hits
        f.note = 'Inneholder mat som ofte gir kryssreaksjon ved bjørkepollenallergi. Mange tåler den kokt eller skrellet.'
        sawBirch = true
      }
      findings.push(f)
      continue
    }

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

  sync()
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
        ? ambiguous[0].key === 'birch'
          ? `Kan gi kryssreaksjon: ${ambiguous[0].evidence.join(', ')}`
          : `Usikker ingrediens: ${ambiguous[0].evidence[0]}`
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

interface CoreFlags {
  usedWheatStarch?: boolean
  sawOats?: boolean
  sawBirch?: boolean
  glutenFree?: boolean
}

/** Bygg «Godt å vite» ut fra hva som faktisk skjedde i vurderingen. */
function buildInsights(product: ProductData, profile: ProfileInput, ev: Evaluation, flags: CoreFlags): Insight[] {
  const out: Insight[] = []
  const conditions = profile.conditions ?? []
  const coeliac = conditions.includes('coeliac')
  const gluten = ev.findings.find((f) => f.key === 'gluten')
  const text = normalize(`${product.ingredientsText ?? ''} ${product.tracesText ?? ''}`)

  if (product.mode === 'product') out.push(INSIGHTS.product_pharmacy)
  if (coeliac && gluten?.status === 'traces' && !conditions.includes('coeliac_strict')) out.push(INSIGHTS.coeliac_traces)
  if (coeliac && flags.usedWheatStarch) out.push(INSIGHTS.coeliac_wheat_starch)
  if (coeliac && flags.sawOats) out.push(INSIGHTS.coeliac_oats)
  if (coeliac && flags.glutenFree && gluten && gluten.status !== 'contains') out.push(INSIGHTS.gluten_free_label)
  if (ev.findings.some((f) => f.status === 'traces' && f.key !== 'gluten' && f.severity !== 'severe')) out.push(INSIGHTS.traces_general)
  const milkish = profile.allergens.some((a) => a.key === 'milk') || conditions.includes('lactose')
  if (milkish && /melkesyre|mælkesyre|mjölksyra|lactic acid/.test(text)) out.push(INSIGHTS.lactic_acid)
  const nutsOnly = profile.allergens.some((a) => a.key === 'nuts') && !profile.allergens.some((a) => a.key === 'peanut')
  if (nutsOnly && /peanøtt|jordnøtt|peanut/.test(text)) out.push(INSIGHTS.peanut_not_nut)
  if (flags.sawBirch) out.push(INSIGHTS.birch_cross)
  return out
}

export function evaluate(product: ProductData, profile: ProfileInput): Evaluation {
  const flags: CoreFlags = {}
  const ev = evaluateCore(product, profile, flags)
  const insights = buildInsights(product, profile, ev, flags)
  return insights.length ? { ...ev, insights } : ev
}

// ---------- Familievurdering: én skann mot flere profiler ----------

export interface PersonResult {
  profileId: string
  name: string
  evaluation: Evaluation
}

export interface FamilyEvaluation {
  insights: Insight[]
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
  const seen = new Set<string>()
  const insights: Insight[] = []
  for (const p of people) for (const i of p.evaluation.insights ?? []) if (!seen.has(i.id)) seen.add(i.id) && insights.push(i)
  if (people.length === 1) {
    return { flag: people[0].evaluation.flag, headline: people[0].evaluation.headline, people, insights }
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
  return { flag, headline, people, insights }
}

// ---------- Meny: vurdering per rett for hele familien ----------

export interface MenuDishInput {
  name: string
  description: string
  allergens: AllergenKey[]
  allergenInfo: boolean
}

export interface MenuDishResult {
  name: string
  description: string
  flag: Flag
  headline: string
  people: { name: string; flag: Flag; headline: string }[]
}

export interface MenuEvaluation {
  flag: Flag
  headline: string
  dishes: MenuDishResult[]
  insights: Insight[]
}

export function evaluateMenu(dishes: MenuDishInput[], profiles: (ProfileInput & { id: string })[]): MenuEvaluation {
  const results: MenuDishResult[] = dishes.map((d) => {
    const structured: Partial<Record<AllergenKey, StructuredStatus>> = {}
    if (d.allergenInfo) for (const k of Object.keys(ALLERGEN_BY_KEY) as AllergenKey[]) structured[k] = 'free'
    for (const k of d.allergens) structured[k] = 'contains'
    const product: ProductData = {
      mode: 'label',
      name: d.name,
      ingredientsText: d.description || d.name,
      structured,
      legibility: d.allergenInfo ? 'good' : 'partial',
      source: 'Foto av meny (lest av AI)',
      found: true
    }
    const fam = evaluateFamily(product, profiles)
    return {
      name: d.name,
      description: d.description,
      flag: fam.flag,
      headline: fam.headline,
      people: fam.people.map((p) => ({ name: p.name, flag: p.evaluation.flag, headline: p.evaluation.headline }))
    }
  })
  const ok = results.filter((r) => r.flag === 'green').length
  const flag: Flag = ok ? 'green' : results.some((r) => r.flag === 'yellow') ? 'yellow' : 'red'
  const who = profiles.length > 1 ? 'alle' : profiles[0]?.name ?? 'deg'
  const headline = !results.length
    ? 'Fant ingen retter'
    : ok
      ? `${ok} av ${results.length} retter passer ${who}`
      : `Ingen retter passer ${who} sikkert`
  const order: Record<Flag, number> = { green: 0, yellow: 1, red: 2 }
  results.sort((a, b) => order[a.flag] - order[b.flag])
  return { flag: results.length ? flag : 'yellow', headline, dishes: results, insights: [INSIGHTS.menu_ask] }
}
