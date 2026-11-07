// De 14 merkepliktige allergenene (EU-forordning 1169/2011, vedlegg II)
// med synonymer på norsk, svensk, dansk og engelsk.
//
// Termer matches som delstreng (norske sammensatte ord: «skummetmelkpulver»),
// unntatt når `start` er satt (må stå først i et ord) eller `word` (helt ord).
// `exclude` fjernes fra teksten før matching, for å unngå falske treff
// (kokosmelk er ikke melk, bokhvete er ikke hvete).
//
// VIKTIG: Dette er en betaliste. Den må kvalitetssikres av klinisk
// ernæringsfysiolog eller allergolog før offentlig lansering.

export type AllergenKey =
  | 'milk'
  | 'egg'
  | 'peanut'
  | 'nuts'
  | 'gluten'
  | 'soy'
  | 'fish'
  | 'crustaceans'
  | 'molluscs'
  | 'sesame'
  | 'celery'
  | 'mustard'
  | 'sulphites'
  | 'lupin'

export type Severity = 'mild' | 'moderate' | 'severe'

export interface Term {
  t: string
  start?: boolean
  word?: boolean
}

export interface AllergenDef {
  key: AllergenKey
  label: string
  terms: Term[]
  exclude: string[]
  ambiguous?: Term[]
  ambiguousExclude?: string[]
  ambiguousNote?: string
}

const s = (...xs: string[]): Term[] => xs.map((t) => ({ t }))
const st = (...xs: string[]): Term[] => xs.map((t) => ({ t, start: true }))
const w = (...xs: string[]): Term[] => xs.map((t) => ({ t, word: true }))

export const ALLERGENS: AllergenDef[] = [
  {
    key: 'milk',
    label: 'Melk',
    terms: [
      ...s('melk', 'mælk', 'mjölk', 'mjolk', 'milk', 'fløte', 'fløde', 'grädde', 'cream', 'smør', 'smör', 'butter',
        'kasein', 'casein', 'myse', 'valle', 'whey', 'laktose', 'lactose', 'laktos', 'yoghurt', 'yogurt', 'kefir',
        'rømme', 'creme fraiche', 'crème fraîche', 'kvarg', 'quark', 'ghee', 'laktalbumin', 'lactalbumin',
        'laktoglobulin', 'lactoglobulin', 'kesam', 'skyr', 'mozzarella', 'parmesan', 'cheddar', 'mascarpone', 'ricotta'),
      ...st('ost', 'oste', 'cheese', 'brunost', 'gräddfil')
    ],
    exclude: ['kokosmelk', 'kokosmælk', 'kokosmjölk', 'coconut milk', 'coconut cream', 'kokosfløte', 'mandelmelk',
      'havremelk', 'soyamelk', 'sojamelk', 'rismelk', 'melkesyre', 'mælkesyre', 'mjölksyra', 'lactic acid',
      'kakaosmør', 'kakaosmör', 'kakaosmør', 'cocoa butter', 'peanøttsmør', 'peanut butter', 'sheasmør', 'shea butter',
      'melkefri', 'uten melk', 'mjölkfri', 'mælkefri', 'dairy free', 'dairy-free', 'non-dairy', 'nøttesmør', 'mandelsmør']
  },
  {
    key: 'egg',
    label: 'Egg',
    terms: [...s('egg', 'æg', 'ägg', 'lysozym', 'lysozyme', 'e1105'), ...st('albumin', 'ovalbumin', 'eggs')],
    // Ikke ekskluder «legg»: det ville skjult «helegg».
    exclude: ['veggi', 'vegg', 'pålegg', 'eggfri', 'uten egg', 'egg free', 'egg-free', 'äggfri', 'ægfri', 'reggae']
  },
  {
    key: 'peanut',
    label: 'Peanøtter',
    terms: s('peanøtt', 'jordnøtt', 'jordnöt', 'jordnød', 'peanut', 'arachis', 'groundnut'),
    exclude: ['peanøttfri', 'peanut free', 'peanut-free', 'uten peanøtter']
  },
  {
    key: 'nuts',
    label: 'Nøtter',
    terms: [
      ...s('mandel', 'mandl', 'almond', 'marsipan', 'marzipan', 'hasselnøtt', 'hasselnöt', 'hasselnød', 'hazelnut',
        'valnøtt', 'valnöt', 'valnød', 'walnut', 'cashew', 'pekan', 'pecan', 'paranøtt', 'paranöt', 'paranød',
        'brazil nut', 'pistasj', 'pistach', 'pistacie', 'macadamia', 'queensland', 'nøtt', 'nötter', 'nødder',
        'tree nut', 'pralin', 'gianduja', 'prunus amygdalus', 'corylus avellana', 'juglans regia', 'anacardium',
        'bertholletia', 'macadamia ternifolia'),
      ...st('nuts', 'nut')
    ],
    exclude: ['peanøtt', 'jordnøtt', 'jordnöt', 'jordnød', 'peanut', 'kokosnøtt', 'kokosnöt', 'kokosnød', 'coconut',
      'muskatnøtt', 'muskatnöt', 'muskatnød', 'nutmeg', 'butternut', 'nøttefri', 'nut free', 'nut-free',
      'uten nøtter', 'donut', 'doughnut', 'nutrition', 'nutritional', 'nutrient', 'nutri-score', 'nutriscore',
      'mandarin'],
    ambiguous: s('nougat'),
    ambiguousNote: 'Nougat lages vanligvis med hasselnøtter.'
  },
  {
    key: 'gluten',
    label: 'Gluten',
    terms: [
      ...s('hvete', 'hvede', 'vete', 'wheat', 'spelt', 'dinkel', 'havre', 'oats', 'durum', 'semule', 'semolina',
        'kamut', 'khorasan', 'couscous', 'bulgur', 'seitan', 'gluten', 'emmer', 'enkorn', 'einkorn', 'triticale',
        'rugmel', 'rågmjöl', 'rugbrød', 'byggmel', 'byggryn', 'bygmel', 'kornmel', 'triticum', 'hordeum', 'secale cereale',
        'avena sativa'),
      ...st('rug', 'råg', 'rye', 'bygg', 'barley', 'malt', 'maltekstrakt', 'maltextrakt', 'graham', 'farro')
    ],
    // Merket glutenfri havre tåles av de fleste med cøliaki (Norsk cøliakiforening). Må stå før «glutenfri».
    exclude: ['glutenfri havre', 'glutenfrie havregryn', 'glutenfrie havre', 'gluten-free oats', 'glutenfri havremel',
      'bokhvete', 'buckwheat', 'bovete', 'boghvede', 'glutenfri', 'gluten-free', 'gluten free',
      'uten gluten', 'maltodekstrin', 'maltodextrin', 'maltitol', 'maltose', 'maltol', 'isomalt']
  },
  {
    key: 'soy',
    label: 'Soya',
    terms: [...s('soya', 'soja', 'edamame', 'tempeh', 'glycine max'), ...st('soy', 'tofu', 'miso', 'shoyu', 'tamari')],
    exclude: ['soyafri', 'sojafri', 'soy free', 'soy-free', 'uten soya'],
    ambiguous: [...s('lecitin', 'lecithin', 'lecitiner'), ...w('e322')],
    ambiguousExclude: ['solsikkelecitin', 'solsikke-lecitin', 'rapslecitin', 'raps-lecitin', 'sunflower lecithin',
      'rapeseed lecithin', 'lecitin (solsikke)', 'lecitin (raps)', 'lecitiner (solsikke)', 'lecitiner (raps)',
      'lecithin (sunflower)', 'lecithins (sunflower)', 'solroslecitin', 'rapslecithin', 'e322 (solsikke)'],
    ambiguousNote: 'Lecitin uten oppgitt kilde kan komme fra soya.'
  },
  {
    key: 'fish',
    label: 'Fisk',
    terms: [
      ...s('fisk', 'fish', 'makrell', 'mackerel', 'ansjos', 'anchov', 'sardin', 'kaviar', 'tunfisk', 'pangasius',
        'tilapia', 'fiskesaus', 'fiskegelatin', 'surimi'),
      ...st('laks', 'lax', 'salmon', 'torsk', 'hyse', 'kveite', 'sild', 'rogn', 'ørret', 'trout', 'kolje', 'tuna',
        'herring', 'haddock', 'pollock'),
      ...w('sei', 'cod', 'lyr')
    ],
    exclude: ['shellfish', 'fiskefri', 'fish free', 'uten fisk', 'seitan', 'fisksaus-fri']
  },
  {
    key: 'crustaceans',
    label: 'Skalldyr',
    terms: [
      ...s('shrimp', 'prawn', 'krabbe', 'hummer', 'lobster', 'kreps', 'krebs', 'krill', 'scampi', 'langust',
        'skalldyr', 'crustacean', 'skaldyr'),
      ...st('reke', 'reker', 'räk', 'rejer', 'crab', 'crayfish')
    ],
    exclude: ['skalldyrfri', 'uten skalldyr']
  },
  {
    key: 'molluscs',
    label: 'Bløtdyr',
    terms: [
      ...s('skjell', 'musling', 'mussel', 'østers', 'oyster', 'ostron', 'musslor', 'scallop', 'blekksprut', 'squid',
        'octopus', 'calamar', 'escargot', 'bløtdyr', 'mollus', 'abalone', 'skalldyr', 'skaldyr', 'blötdjur'),
      ...st('snegl', 'snail', 'sepia')
    ],
    exclude: ['skjellfri', 'uten skjell']
  },
  {
    key: 'sesame',
    label: 'Sesam',
    terms: [...s('sesam', 'gomasio'), ...st('tahini', 'tahin')],
    exclude: ['sesamfri', 'uten sesam', 'sesame free']
  },
  {
    key: 'celery',
    label: 'Selleri',
    terms: s('selleri', 'celery', 'celeri', 'selleriak'),
    exclude: ['uten selleri']
  },
  {
    key: 'mustard',
    label: 'Sennep',
    terms: s('sennep', 'mustard', 'senap', 'sennop'),
    exclude: ['uten sennep']
  },
  {
    key: 'sulphites',
    label: 'Sulfitt',
    terms: [
      ...s('sulfitt', 'sulfit', 'sulphit', 'sulfite', 'svoveldioksid', 'svoveldioxid', 'svaveldioxid', 'svovldioxid',
        'sulphur dioxide', 'sulfur dioxide', 'disulfitt', 'metabisulfitt', 'metabisulfite'),
      ...w('e220', 'e221', 'e222', 'e223', 'e224', 'e225', 'e226', 'e227', 'e228')
    ],
    exclude: ['sulfittfri', 'uten sulfitt', 'sulphite free']
  },
  {
    key: 'lupin',
    label: 'Lupin',
    terms: s('lupin'),
    exclude: ['uten lupin']
  }
]

// Tilstander: sykdommer og intoleranser som regelmotoren oversetter til hva man må passe på.
export type ConditionKey = 'coeliac' | 'coeliac_strict' | 'lactose' | 'birch'

/** Tilstander som vises som egne kort. «coeliac_strict» er et valg under cøliaki, ikke eget kort. */
export const CONDITIONS: { key: ConditionKey; label: string; hint: string }[] = [
  {
    key: 'coeliac',
    label: 'Cøliaki',
    hint: 'Gluten gir rødt. «Kan inneholde spor» gir gult, fordi de fleste med cøliaki tåler spor i små mengder. Glutenfri hvetestivelse er OK.'
  },
  { key: 'lactose', label: 'Laktoseintoleranse', hint: 'Ser etter laktose. Laktosefrie varer er OK.' },
  {
    key: 'birch',
    label: 'Bjørkepollenallergi',
    hint: 'Varsler om rå frukt, grønnsaker og nøtter som ofte gir kløe i munnen. Mange tåler dem kokt eller skrellet.'
  }
]

/** Glutenfri hvetestivelse tåles av de fleste med cøliaki, men ikke ved hveteallergi. Må stå før «glutenfri». */
export const COELIAC_EXCLUDE = [
  'glutenfri hvetestivelse', 'glutenfri hvete stivelse', 'glutenfri hvete-stivelse', 'hvetestivelse (glutenfri)',
  'hvetestivelse(glutenfri)', 'hvetestivelse, glutenfri', 'hvetestivelse - glutenfri', 'glutenfri hvedestivelse',
  'hvedestivelse (glutenfri)', 'glutenfri vetestärkelse', 'vetestärkelse (glutenfri)', 'gluten-free wheat starch',
  'gluten free wheat starch', 'wheat starch (gluten free)', 'wheat starch (gluten-free)'
]

export const WHEAT_STARCH = /^(hvetestivelse|hvedestivelse|vetestärkelse|wheat starch|hvete-stivelse)/

/** Varen er merket glutenfri (tekst eller symbolet med overstreket aks). */
export function claimsGlutenFree(text: string): boolean {
  return /glutenfri(tt|e)?\b|gluten[\s-]free|glutenfritt|glutenfria?\b/.test(normalize(text).replace(/glutenfri(e)? havre\w*/g, ''))
}

/** Bjørkepollen: mat som ofte gir kryssreaksjon (Norges Astma- og Allergiforbund, NHI). Gjelder mest rå mat. */
export const BIRCH_DEF: AllergenDef = {
  key: 'nuts',
  label: 'Kryssreaksjon (bjørk)',
  terms: [
    ...s('eple', 'epler', 'pære', 'pærer', 'kiwi', 'fersken', 'nektarin', 'kirsebær', 'morell', 'plomme', 'aprikos',
      'hasselnøtt', 'hasselnøtter', 'mandel', 'mandler', 'selleri', 'gulrot', 'gulrøtter', 'apple', 'pear', 'peach',
      'cherry', 'plum', 'apricot', 'hazelnut', 'almond', 'celery', 'carrot', 'jordbær')
  ],
  exclude: ['eplecidereddik', 'epleeddik', 'eplejuicekonsentrat', 'pærekonsentrat', 'cider vinegar']
}

// Laktose: melkeprodukter med laktose. Kasein og myseprotein er protein, ikke laktose, men myse inneholder laktose.
export const LACTOSE_DEF: AllergenDef = {
  key: 'milk',
  label: 'Laktose',
  terms: [
    ...s('laktose', 'lactose', 'laktos', 'melk', 'mælk', 'mjölk', 'milk', 'fløte', 'fløde', 'grädde', 'cream', 'smør',
      'smör', 'butter', 'myse', 'valle', 'whey', 'yoghurt', 'yogurt', 'kefir', 'rømme', 'creme fraiche',
      'crème fraîche', 'kvarg', 'quark', 'kesam', 'iskrem', 'gräddfil'),
    ...st('ost', 'oste', 'cheese', 'brunost')
  ],
  exclude: [
    'myseprotein', 'whey protein', 'melkeprotein', 'milk protein', 'kasein', 'casein', 'kokosmelk', 'kokosmælk',
    'kokosmjölk', 'coconut milk', 'coconut cream', 'kokosfløte', 'mandelmelk', 'havremelk', 'soyamelk', 'sojamelk',
    'rismelk', 'melkesyre', 'mælkesyre', 'mjölksyra', 'lactic acid', 'kakaosmør', 'kakaosmör', 'cocoa butter',
    'peanøttsmør', 'peanut butter', 'sheasmør', 'shea butter', 'melkefri', 'uten melk', 'dairy free', 'dairy-free',
    'nøttesmør', 'mandelsmør'
  ]
}

/** Laktosefrie produkter er OK ved laktoseintoleranse. */
export function isLactoseFree(text: string): boolean {
  return /laktosefri|laktosfri|lactose[\s-]free|laktosefritt/.test(normalize(text))
}

export const ALLERGEN_BY_KEY: Record<AllergenKey, AllergenDef> = Object.fromEntries(
  ALLERGENS.map((a) => [a.key, a])
) as Record<AllergenKey, AllergenDef>

export const SEVERITY_LABEL: Record<Severity, string> = {
  mild: 'Mild',
  moderate: 'Moderat',
  severe: 'Alvorlig'
}

const LETTER = 'a-z0-9æøåäöüéèêàáâíóúçñß'
const isLetter = (ch: string | undefined) => !!ch && new RegExp(`[${LETTER}]`).test(ch)

/** Normaliser tekst for matching: små bokstaver, samlet E-nummer, enkle mellomrom. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/­/g, '')
    .replace(/\be[\s\-–]?(\d{3,4}[a-z]?)\b/g, 'e$1')
    .replace(/\s+/g, ' ')
}

/** Erstatt hver ekskluderingsfrase med mellomrom av samme lengde, så indeksene beholdes. */
export function blankOut(text: string, phrases: string[]): string {
  let out = text
  for (const p of phrases) {
    const needle = p.toLowerCase()
    let i = out.indexOf(needle)
    while (i !== -1) {
      out = out.slice(0, i) + ' '.repeat(needle.length) + out.slice(i + needle.length)
      i = out.indexOf(needle, i + needle.length)
    }
  }
  return out
}

function wordAround(text: string, i: number, len: number): string {
  let a = i
  let b = i + len
  while (a > 0 && isLetter(text[a - 1])) a--
  while (b < text.length && isLetter(text[b])) b++
  return text.slice(a, b)
}

/** Finn termer i (allerede normalisert) tekst. Returnerer ordene som utløste treff. */
export function findTerms(text: string, terms: Term[]): string[] {
  const hits = new Set<string>()
  for (const term of terms) {
    const needle = term.t.toLowerCase()
    let i = text.indexOf(needle)
    while (i !== -1) {
      const before = text[i - 1]
      const after = text[i + needle.length]
      const okStart = !(term.start || term.word) || !isLetter(before)
      const okEnd = !term.word || !isLetter(after)
      if (okStart && okEnd) hits.add(wordAround(text, i, needle.length).trim())
      i = text.indexOf(needle, i + 1)
    }
  }
  return [...hits].filter(Boolean)
}

export function matchAllergen(text: string, def: AllergenDef): { hits: string[]; ambiguous: string[] } {
  const norm = normalize(text)
  const cleaned = blankOut(norm, def.exclude)
  const hits = findTerms(cleaned, def.terms)
  let ambiguous: string[] = []
  if (!hits.length && def.ambiguous) {
    const amb = blankOut(cleaned, def.ambiguousExclude ?? [])
    ambiguous = findTerms(amb, def.ambiguous)
  }
  return { hits, ambiguous }
}

/** Gjenkjenn hvilket allergen en fritekst (f.eks. «Hvete», «Skalldyr») beskriver. */
export function keyFromName(name: string): AllergenKey | null {
  const norm = normalize(name)
  for (const def of ALLERGENS) {
    if (norm.includes(def.label.toLowerCase())) return def.key
  }
  for (const def of ALLERGENS) {
    if (findTerms(blankOut(norm, def.exclude), def.terms).length) return def.key
  }
  return null
}
