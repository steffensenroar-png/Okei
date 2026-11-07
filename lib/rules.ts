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
import { fmt, Msg } from './i18n/core'
export type { Msg } from './i18n/core'
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
  /** AI-ens egen liste over allergener på etiketten. Brukes bare for å gjøre svaret strengere. */
  aiDeclared?: { contains: AllergenKey[]; traces: AllergenKey[] }
  translatedText?: string | null
  language?: string | null
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
  /** Oversettbar etikett, f.eks. «allergen.milk». Mangler for egne ord. */
  labelKey?: string
  noteKey?: string
}

export interface OtherAllergen {
  key?: AllergenKey
  label: string
  kind: 'contains' | 'traces'
}

export interface Evaluation {
  flag: Flag
  headline: string
  reasons: string[]
  findings: Finding[]
  headlineMsg?: Msg
  reasonMsgs?: Msg[]
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
  /kann (auch |möglicherweise )?spuren( von)?/g,
  /enthält möglicherweise/g,
  /spuren von/g,
  /puede contener( trazas)?( de)?/g,
  /trazas de/g,
  /peut contenir( des traces)?( de| d')?/g,
  /traces (de|d')/g,
  /può contenere( tracce)?( di)?/g,
  /tracce di/g,
  /(voi|saattaa) sisältää( pieniä määriä| hivenen| jäämiä)?/g,
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


interface Check {
  key: string
  label: string
  labelKey: string
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
    if ((main && matchAllergen(main, def).hits.length) || st === 'contains') out.push({ key: def.key, label: def.label, kind: 'contains' })
    else if ((traces && matchAllergen(traces, def).hits.length) || st === 'traces') out.push({ key: def.key, label: def.label, kind: 'traces' })
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
    checks.push({ key: pa.key, label: def.label, labelKey: `allergen.${pa.key}`, severity: pa.severity, def, dataKey: pa.key })
  }
  if (coeliac) {
    // Spor gir gult som standard (Norsk cøliakiforening). «Svært sensitiv» gir rødt.
    const g = ALLERGEN_BY_KEY.gluten
    checks.push({
      key: 'gluten',
      label: 'Gluten (cøliaki)',
      labelKey: 'label.coeliacGluten',
      severity: conditions.includes('coeliac_strict') ? 'severe' : 'moderate',
      def: { ...g, exclude: [...COELIAC_EXCLUDE, ...g.exclude] },
      dataKey: 'gluten',
      coeliac: true
    })
  }
  if (conditions.includes('birch')) {
    checks.push({ key: 'birch', label: 'Kryssreaksjon (bjørk)', labelKey: 'label.birch', severity: 'mild', def: BIRCH_DEF, dataKey: 'nuts', birch: true })
  }
  if (conditions.includes('lactose') && !profile.allergens.some((a) => a.key === 'milk')) {
    checks.push({ key: 'lactose', label: 'Laktose', labelKey: 'label.lactose', severity: 'moderate', def: LACTOSE_DEF, dataKey: 'milk', lactose: true })
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
  let aiUpgraded = false
  const sync = () => Object.assign(flags, { usedWheatStarch, sawOats, sawBirch, glutenFree, aiUpgraded })

  for (const c of buildChecks(profile)) {
    const def = c.def
    const f: Finding = { key: c.key, label: c.label, labelKey: c.labelKey, severity: c.severity, status: 'none', evidence: [] }

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
        f.noteKey = 'note.birch'
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
      f.noteKey = c.dataKey === 'nuts' ? 'note.nougat' : c.dataKey === 'soy' ? 'note.lecithin' : undefined
    } else if ((hasText && legible) || st === 'free') {
      f.status = 'none'
    } else {
      f.status = 'unknown'
    }

    // Sikkerhetsnett: AI-en så allergenet på etiketten, men ordlisten fant det ikke. Kan bare gjøre svaret strengere.
    const ai = product.aiDeclared
    if (ai && !(c.coeliac && usedWheatStarch) && !(c.lactose && hasText && isLactoseFree(text))) {
      const rank = { none: 0, unknown: 1, ambiguous: 2, likely: 2, traces: 3, contains: 4 } as const
      const want = ai.contains.includes(c.dataKey) ? 'contains' : ai.traces.includes(c.dataKey) ? 'traces' : null
      if (want && rank[want] > rank[f.status]) {
        f.status = want
        f.evidence = [want === 'contains' ? 'sett på etiketten av AI' : '«kan inneholde» sett av AI']
        f.note = 'Ordlisten fant ikke ordet, men AI-en så allergenet på etiketten. Les etiketten selv.'
        f.noteKey = 'note.ai'
        aiUpgraded = true
      }
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

  const reasonMsgs: Msg[] = []
  const R = (k: string, p?: Msg['p']) => {
    reasonMsgs.push({ k, p })
    reasons.push(fmt('no', { k, p }))
  }
  const out = (flag: Flag, k: string, p: Msg['p'] | undefined, o: OtherAllergen[]): Evaluation => ({
    flag,
    headline: fmt('no', { k, p }),
    headlineMsg: { k, p },
    reasons,
    reasonMsgs,
    findings,
    others: o
  })

  // Uemballert mat: aldri grønt. Sannsynlig allergen ved alvorlig allergi gir rødt.
  if (product.mode === 'food') {
    R('r.food')
    const severeLikely = likely.filter((f) => f.severity === 'severe')
    if (severeLikely.length) return out('red', 'h.likelySevere', { items: items(severeLikely) }, [])
    if (likely.length) return out('yellow', 'h.likely', { items: items(likely) }, [])
    return out('yellow', 'h.guess', undefined, [])
  }

  if (!product.found && !hasText) {
    R('r.notFound')
    return out('yellow', 'h.noData', undefined, others)
  }

  if (contains.length) {
    if (!legible) R('r.partial')
    return out('red', 'h.contains', { items: items(contains) }, others)
  }
  if (severeTraces.length) {
    R('r.severeTraces')
    return out('red', 'h.traces', { items: items(severeTraces) }, others)
  }

  if ((product.mode === 'label' || product.mode === 'product') && product.legibility === 'poor') {
    R('r.poor')
    return out('yellow', 'h.unreadable', undefined, others)
  }

  if (otherTraces.length || ambiguous.length || unknown.length || !legible) {
    if (otherTraces.length) R('r.traces', { items: items(otherTraces) })
    for (const a of ambiguous) if (a.noteKey) R(a.noteKey)
    if (unknown.length) R('r.missing', { items: items(unknown) })
    if (!legible && product.mode !== 'barcode') R('r.partial')
    if (otherTraces.length) return out('yellow', 'h.traces', { items: items(otherTraces) }, others)
    if (ambiguous.length) {
      return ambiguous[0].key === 'birch'
        ? out('yellow', 'h.cross', { words: ambiguous[0].evidence }, others)
        : out('yellow', 'h.ambiguous', { word: ambiguous[0].evidence[0] }, others)
    }
    return out('yellow', 'h.unsure', undefined, others)
  }

  if (!findings.length) {
    R('r.noAllergies')
    return out('green', 'h.noAllergies', undefined, others)
  }

  R('r.checkLabel')
  const n = profile.name?.trim()
  return n ? out('green', 'h.noneFound', { name: n }, others) : out('green', 'h.noneFoundYou', undefined, others)
}

/** Etiketter som kan oversettes (@nøkkel) eller rå tekst for egne ord. */
function items(fs: Finding[]): string[] {
  return fs.map((f) => (f.labelKey ? `@${f.labelKey}` : f.label))
}

interface CoreFlags {
  aiUpgraded?: boolean
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
  if (flags.aiUpgraded) out.push(INSIGHTS.ai_net)
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
  headlineMsg?: Msg
  people: PersonResult[]
}

const RANK: Record<Flag, number> = { green: 0, yellow: 1, red: 2 }


export function evaluateFamily(
  product: ProductData,
  profiles: (ProfileInput & { id: string })[]
): FamilyEvaluation {
  const people = profiles.map((p) => ({ profileId: p.id, name: p.name, evaluation: evaluate(product, p) }))
  const seen = new Set<string>()
  const insights: Insight[] = []
  for (const p of people) for (const i of p.evaluation.insights ?? []) if (!seen.has(i.id)) seen.add(i.id) && insights.push(i)
  if (people.length === 1) {
    return { flag: people[0].evaluation.flag, headline: people[0].evaluation.headline, headlineMsg: people[0].evaluation.headlineMsg, people, insights }
  }
  const flag = people.reduce<Flag>((w, p) => (RANK[p.evaluation.flag] > RANK[w] ? p.evaluation.flag : w), 'green')
  const red = people.filter((p) => p.evaluation.flag === 'red').map((p) => p.name)
  const yellow = people.filter((p) => p.evaluation.flag === 'yellow').map((p) => p.name)
  let m: Msg
  if (flag === 'green') m = { k: 'f.okAll' }
  else if (red.length === people.length) m = { k: 'f.noneOk' }
  else if (red.length) m = { k: 'f.notFor', p: { names: red } }
  else if (yellow.length === people.length) m = { k: 'f.unsureAll' }
  else m = { k: 'f.unsureFor', p: { names: yellow } }
  return { flag, headline: fmt('no', m), headlineMsg: m, people, insights }
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
  headlineMsg?: Msg
  people: { name: string; flag: Flag; headline: string; headlineMsg?: Msg }[]
}

export interface MenuEvaluation {
  flag: Flag
  headline: string
  headlineMsg: Msg
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
      headlineMsg: fam.headlineMsg,
      people: fam.people.map((p) => ({ name: p.name, flag: p.evaluation.flag, headline: p.evaluation.headline, headlineMsg: p.evaluation.headlineMsg }))
    }
  })
  const ok = results.filter((r) => r.flag === 'green').length
  const flag: Flag = ok ? 'green' : results.some((r) => r.flag === 'yellow') ? 'yellow' : 'red'
  const who = profiles.length > 1 ? '@m.all' : profiles[0]?.name ?? ''
  const m: Msg = !results.length ? { k: 'm.empty' } : ok ? { k: 'm.ok', p: { ok, n: results.length, who } } : { k: 'm.none', p: { who } }
  const headline = fmt('no', m)
  const order: Record<Flag, number> = { green: 0, yellow: 1, red: 2 }
  results.sort((a, b) => order[a.flag] - order[b.flag])
  return { flag: results.length ? flag : 'yellow', headline, headlineMsg: m, dishes: results, insights: [INSIGHTS.menu_ask] }
}
