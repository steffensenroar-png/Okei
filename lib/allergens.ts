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

// ---------- Flere språk: tysk, spansk, fransk, italiensk og finsk ----------
// Lagt til separat for oversikt. Unntak som må gjelde før andre unntak (f.eks. «glutenfri havre» før «glutenfri»)
// står i «first».

interface Extra {
  terms: Term[]
  exclude?: string[]
  first?: string[]
  ambiguous?: Term[]
  ambiguousExclude?: string[]
}

const EXTRA: Partial<Record<AllergenKey, Extra>> = {
  milk: {
    terms: [
      ...s('milch', 'sahne', 'molke', 'käse', 'joghurt', 'buttermilch', 'milchzucker', 'leche', 'mantequilla', 'queso',
        'suero de leche', 'lactosa', 'caseína', 'yogur', 'crème', 'beurre', 'fromage', 'lactosérum', 'petit-lait',
        'caséine', 'yaourt', 'babeurre', 'formaggio', 'siero di latte', 'lattosio', 'caseina', 'maito', 'kerma',
        'juusto', 'laktoosi', 'kaseiini', 'jogurtti', 'piimä', 'rahka', 'heraproteiini'),
      ...st('rahm', 'lait', 'latte', 'panna', 'burro', 'hera'),
      ...w('nata', 'voi', 'voita')
    ],
    exclude: ['kokosmilch', 'milchsäure', 'kakaobutter', 'erdnussbutter', 'milchfrei', 'ohne milch', 'leche de coco',
      'ácido láctico', 'manteca de cacao', 'mantequilla de cacahuete', 'sin leche', 'lait de coco', 'acide lactique',
      'beurre de cacao', 'beurre de cacahuète', 'sans lait', 'laitue', 'crème de coco', 'latte di cocco', 'acido lattico',
      'burro di cacao', 'burro di arachidi', 'senza latte', 'kookosmaito', 'maitohappo', 'kaakaovoi', 'maidoton',
      'kauramaito', 'soijamaito', 'mantelimaito', 'riisimaito']
  },
  egg: {
    terms: [
      ...s('kananmuna', 'huevo', 'ovoalbúmina', 'œuf', 'oeuf', 'uovo', 'uova', 'tuorlo', 'albume', 'munankeltuainen',
        'munanvalkuainen'),
      ...st('eigelb', 'eiklar', 'eiweiß', 'eiweiss', 'vollei', 'hühnerei', 'eipulver', 'yema', 'muna'),
      // Ikke «ei» alene: på finsk betyr det «ikke».
      ...w('eier')
    ],
    exclude: ['ohne ei', 'sin huevo', 'sans œuf', 'sans oeuf', 'senza uova', 'munaton']
  },
  peanut: {
    terms: s('erdnuss', 'erdnüss', 'cacahuete', 'cacahuate', 'maní', 'arachide', 'arachid', 'cacahuète', 'cacahouète',
      'maapähkinä'),
    exclude: ['sin cacahuete', 'sans arachide', 'senza arachidi', 'ohne erdnüsse']
  },
  nuts: {
    terms: [
      ...s('haselnuss', 'haselnüss', 'walnuss', 'walnüss', 'pekannuss', 'paranuss', 'pistazie', 'nüsse', 'schalenfrüchte',
        'almendra', 'avellana', 'nuez', 'nueces', 'anacardo', 'pistacho', 'frutos de cáscara', 'frutos secos', 'amande',
        'noisette', 'pistache', 'fruits à coque', 'noix', 'mandorl', 'nocciol', 'anacardi', 'pistacchi', 'frutta a guscio',
        'manteli', 'hasselpähkinä', 'saksanpähkinä', 'cashewpähkinä', 'pekaanipähkinä', 'parapähkinä', 'pistaasi',
        'makadamia', 'pähkinä'),
      ...st('nuss'),
      ...w('noce', 'noci')
    ],
    first: ['nuez moscada', 'nuez de coco', 'noix de coco', 'noix de muscade', 'noce di cocco', 'noce moscata',
      'kokosnuss', 'muskatnuss', 'erdnuss', 'erdnüss', 'cacahuete', 'arachide', 'arachid', 'cacahuète', 'maapähkinä',
      'kookospähkinä', 'muskottipähkinä'],
    exclude: ['sin frutos de cáscara', 'sans fruits à coque', 'senza frutta a guscio', 'pähkinätön', 'ohne nüsse']
  },
  gluten: {
    terms: [
      ...s('weizen', 'roggen', 'gerste', 'hafer', 'grünkern', 'trigo', 'centeno', 'cebada', 'avena', 'espelta', 'sémola',
        'seigle', 'avoine', 'épeautre', 'froment', 'semoule', 'frumento', 'segale', 'semola', 'vehnä', 'ruis', 'ohra',
        'kaura', 'mallas'),
      ...st('malz', 'malta', 'malto', 'blé', 'orge', 'orzo'),
      ...w('grano')
    ],
    first: ['glutenfreier hafer', 'glutenfreie haferflocken', 'avena sin gluten', 'avoine sans gluten',
      'avena senza glutine', 'gluteeniton kaura', 'gluteenittomat kaurahiutaleet', 'glutenfreie weizenstärke',
      'weizenstärke (glutenfrei)', 'almidón de trigo sin gluten', 'amidon de blé sans gluten',
      'amido di frumento senza glutine', 'gluteeniton vehnätärkkelys'],
    exclude: ['glutenfrei', 'sin gluten', 'sans gluten', 'senza glutine', 'gluteeniton', 'gluteenittomat', 'buchweizen',
      'trigo sarraceno', 'blé noir', 'sarrasin', 'grano saraceno', 'granoturco', 'tattari', 'maltodextrina',
      'maltodextrine', 'maltodestrin', 'maltosa', 'maltitolo', 'trigonella']
  },
  soy: {
    terms: s('soia', 'soija'),
    exclude: ['sin soja', 'sans soja', 'senza soia', 'ohne soja', 'soijaton'],
    ambiguous: s('lécithine', 'lezithin', 'lesitiini'),
    ambiguousExclude: ['sonnenblumenlecithin', 'sonnenblumenlezithin', 'lecitina de girasol', 'lécithine de tournesol',
      'lecitina di girasole', 'auringonkukkalesitiini', 'rapslezithin', 'lécithine de colza', 'lecitina de colza',
      'lecitina di colza', 'rypsilesitiini', 'lecitina (girasol)', 'lécithine (tournesol)', 'lecitina (girasole)']
  },
  fish: {
    terms: [
      ...s('fisch', 'lachs', 'kabeljau', 'thunfisch', 'sardelle', 'pescado', 'salmón', 'atún', 'bacalao', 'anchoa',
        'merluza', 'poisson', 'saumon', 'cabillaud', 'anchois', 'morue', 'pesce', 'salmone', 'tonno', 'merluzzo',
        'acciughe', 'alici', 'baccalà', 'tonnikala', 'turska', 'silli', 'anjovis'),
      ...st('hering', 'thon', 'kala', 'lohi')
    ],
    exclude: ['tintenfisch', 'mustekala', 'kalamata', 'sin pescado', 'sans poisson', 'senza pesce', 'ohne fisch', 'kalaton']
  },
  crustaceans: {
    terms: s('garnele', 'krebstier', 'gamba', 'langostino', 'cangrejo', 'crustáceo', 'langosta', 'crevette', 'crabe',
      'homard', 'langoustine', 'crustacé', 'gamber', 'granchio', 'aragosta', 'crostace', 'katkarapu', 'rapu', 'hummeri',
      'äyriäi')
  },
  molluscs: {
    terms: [
      ...s('muschel', 'tintenfisch', 'auster', 'schnecke', 'weichtier', 'mejillón', 'almeja', 'pulpo', 'ostra', 'molusco',
        'vieira', 'huître', 'calmar', 'poulpe', 'mollusque', 'saint-jacques', 'cozze', 'vongole', 'calamari', 'polpo',
        'ostriche', 'mollusch', 'seppia', 'simpukk', 'osteri', 'mustekala', 'nilviäi'),
      ...st('etana'),
      ...w('moule', 'moules')
    ]
  },
  sesame: { terms: s('sésamo', 'sésame', 'seesami') },
  celery: { terms: [...s('céleri', 'sedano'), ...w('apio')] },
  mustard: { terms: s('senf', 'mostaza', 'moutarde', 'senape', 'sinappi') },
  sulphites: {
    terms: s('schwefeldioxid', 'dióxido de azufre', 'anhídrido sulfuroso', 'anhydride sulfureux', 'dioxyde de soufre',
      'solfit', 'anidride solforosa', 'biossido di zolfo', 'sulfiitti', 'rikkidioksidi')
  },
  lupin: { terms: s('lupine', 'altramuz', 'altramuces', 'lupiini') }
}

for (const def of ALLERGENS) {
  const x = EXTRA[def.key]
  if (!x) continue
  def.terms = [...def.terms, ...x.terms]
  def.exclude = [...(x.first ?? []), ...def.exclude, ...(x.exclude ?? [])]
  if (x.ambiguous) def.ambiguous = [...(def.ambiguous ?? []), ...x.ambiguous]
  if (x.ambiguousExclude) def.ambiguousExclude = [...(def.ambiguousExclude ?? []), ...x.ambiguousExclude]
}

// Tilstander: sykdommer og intoleranser som regelmotoren oversetter til hva man må passe på.
export type ConditionKey = 'coeliac' | 'coeliac_strict' | 'lactose' | 'birch' | 'vegetarian' | 'vegan'
export type DietKey = 'vegetarian' | 'vegan'
export const DIETS: DietKey[] = ['vegetarian', 'vegan']

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
  'gluten free wheat starch', 'wheat starch (gluten free)', 'wheat starch (gluten-free)', 'glutenfreie weizenstärke',
  'weizenstärke (glutenfrei)', 'almidón de trigo sin gluten', 'amidon de blé sans gluten', 'amido di frumento senza glutine',
  'gluteeniton vehnätärkkelys'
]

export const WHEAT_STARCH = /^(hvetestivelse|hvedestivelse|vetestärkelse|wheat starch|hvete-stivelse|weizenstärke|vehnätärkkelys)/

/** Varen er merket glutenfri (tekst eller symbolet med overstreket aks). */
export function claimsGlutenFree(text: string): boolean {
  return /glutenfri(tt|e)?\b|gluten[\s-]free|glutenfritt|glutenfria?\b|glutenfrei|sin gluten|sans gluten|senza glutine|gluteeniton/.test(
    normalize(text).replace(/(glutenfri(e)? havre\w*|glutenfreie[rn]? hafer\w*|avena sin gluten|avoine sans gluten|avena senza glutine|gluteeniton kaura)/g, '')
  )
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

// ---------- Kosthold: vegetar og vegansk ----------
// Kjøtt og andre ingredienser fra slaktede dyr. Fisk og skalldyr hentes fra allergenlistene.
export const MEAT_DEF: AllergenDef = {
  key: 'fish',
  label: 'Kjøtt',
  terms: [
    // norsk, svensk, dansk
    ...s('kjøtt', 'svinekjøtt', 'storfekjøtt', 'oksekjøtt', 'kalvekjøtt', 'lammekjøtt', 'kyllingkjøtt', 'kylling', 'kalkun',
      'bacon', 'skinke', 'svinefett', 'svinesvor', 'smult', 'talg', 'kjøttkraft', 'kjøttbuljong', 'hønsekraft', 'kyllingkraft',
      'oksekraft', 'kjøttekstrakt', 'gelatin', 'kollagen', 'karmin', 'kochenille', 'e120', 'e 120', 'blodpølse', 'leverpostei',
      'kött', 'fläsk', 'nötkött', 'kyckling', 'kalkon', 'skinka', 'ister', 'köttbuljong', 'hönsbuljong',
      'kød', 'svinekød', 'oksekød', 'svinefedt', 'spæk', 'hønsebouillon', 'kødbouillon'),
    ...st('svin', 'okse', 'storfe', 'liha'),
    ...w('lam', 'lamm', 'ham', 'lard', 'tali', 'sego', 'sebo', 'kana', 'broileri', 'blod', 'lever', 'porc'),
    // engelsk
    ...s('meat', 'pork', 'beef', 'veal', 'chicken', 'turkey', 'mutton', 'gelatine', 'tallow', 'beef fat', 'chicken stock',
      'beef stock', 'chicken fat', 'collagen', 'carmine', 'cochineal', 'anchovy'),
    ...st('lardon'),
    // tysk
    ...s('fleisch', 'schwein', 'hähnchen', 'huhn', 'truthahn', 'speck', 'schinken', 'schmalz', 'rindertalg', 'karmin',
      'hühnerbrühe', 'rinderbrühe', 'fleischbrühe', 'kollagen'),
    ...st('rind', 'pute'),
    // spansk og italiensk
    ...s('carne', 'cerdo', 'ternera', 'vacuno', 'pollo', 'pavo', 'cordero', 'tocino', 'jamón', 'manteca de cerdo', 'carmín',
      'caldo de pollo', 'colágeno', 'maiale', 'manzo', 'vitello', 'tacchino', 'agnello', 'pancetta', 'prosciutto', 'strutto',
      'carminio', 'brodo di pollo', 'collagene'),
    // fransk
    ...s('viande', 'bœuf', 'boeuf', 'veau', 'poulet', 'dinde', 'agneau', 'jambon', 'saindoux', 'suif', 'gélatine',
      'collagène', 'bouillon de poule', 'bouillon de bœuf'),
    // finsk
    ...s('sianliha', 'naudanliha', 'kanaliha', 'broilerinliha', 'kalkkuna', 'lammas', 'pekoni', 'kinkku', 'liivate',
      'laardi', 'karmiini', 'kanaliemi', 'lihaliemi', 'kollageeni')
  ],
  exclude: [
    'kjøttfri', 'uten kjøtt', 'kjøtterstatning', 'soyakjøtt', 'plantebasert kjøtt', 'vegetarisk', 'vegansk', 'köttfri',
    'kødfri', 'meat-free', 'meat free', 'meatless', 'meat substitute', 'fleischlos', 'fleischfrei', 'fleischersatz',
    'sin carne', 'senza carne', 'sans viande', 'lihaton', 'kyllingkrydder', 'kycklingkrydda', 'kokoskjøtt'
  ]
}

// Andre dyreprodukter som veganere unngår, utover melk, egg, fisk og skalldyr.
export const ANIMAL_EXTRA_DEF: AllergenDef = {
  key: 'milk',
  label: 'Dyreprodukter',
  terms: [
    ...s('honning', 'honung', 'honey', 'honig', 'miel', 'miele', 'hunaja', 'bivoks', 'bivax', 'beeswax', 'bienenwachs',
      "cire d'abeille", "cera d'api", 'cera de abeja', 'mehiläisvaha', 'e901', 'skjellakk', 'schellack', 'shellac',
      'gomme-laque', 'gommalacca', 'goma laca', 'sellakka', 'e904', 'lanolin', 'lanoliini', 'propolis', 'gelatin',
      'gelatine', 'gélatine', 'liivate', 'karmin', 'carmine', 'carmín', 'karmiini', 'e120', 'e 120')
  ],
  exclude: ['honningmelon', 'honeydew', 'honungsmelon', 'honigmelone', 'honingmelon']
}

// Kan komme fra dyr eller planter. Etiketten sier sjelden hvilket.
export const DIET_AMBIGUOUS: Term[] = [
  ...s('e471', 'e 471', 'e472', 'e 472', 'mono- og diglyserider', 'monoglyserider', 'mono- och diglycerider',
    'mono- og diglycerider', 'mono- and diglycerides', 'mono- und diglyceride', 'mono- y diglicéridos',
    'mono- et diglycérides', 'mono- e digliceridi', 'mono- ja diglyseridit', 'vitamin d3', 'd3-vitamin', 'kolekalsiferol',
    'cholecalciferol', 'colecalciferol', 'cholécalciférol', 'kolekalsiferoli')
]
export const RENNET: Term[] = [
  ...w('løpe', 'löpe', 'osteløpe', 'rennet', 'lab', 'cuajo', 'présure', 'caglio', 'juoksute', 'animalsk løpe')
]
export const DIET_AMBIGUOUS_EXCLUDE = [
  'vegetabilske mono- og diglyserider', 'vegetabilsk e471', 'e471 (vegetabilsk)', 'vegetable mono- and diglycerides',
  'pflanzliche mono- und diglyceride', 'vegansk vitamin d3', 'vitamin d3 (vegansk)', 'vitamin d3 fra lav', 'vegan vitamin d3',
  'mikrobiell løpe', 'mikrobielt løpe', 'vegetabilsk løpe', 'mikrobiell löpe', 'microbial rennet', 'vegetable rennet',
  'vegetarian rennet', 'mikrobielles lab', 'cuajo microbiano', 'présure microbienne', 'caglio microbico', 'mikrobijuoksute'
]

export const ALLERGEN_BY_KEY: Record<AllergenKey, AllergenDef> = Object.fromEntries(
  ALLERGENS.map((a) => [a.key, a])
) as Record<AllergenKey, AllergenDef>

export const SEVERITY_LABEL: Record<Severity, string> = {
  mild: 'Mild',
  moderate: 'Moderat',
  severe: 'Alvorlig'
}

const LETTER_RE = /[\p{L}\p{N}]/u
const isLetter = (ch: string | undefined) => !!ch && LETTER_RE.test(ch)

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
