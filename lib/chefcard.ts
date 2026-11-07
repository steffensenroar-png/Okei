// Kokkekort: faste oversettelser (ingen AI), så teksten alltid er den samme og kan kontrolleres.

import type { AllergenKey, ConditionKey, Severity } from './allergens'

export type Lang = 'no' | 'en' | 'de' | 'es' | 'fr' | 'it' | 'sv'

export const LANGS: { id: Lang; label: string }[] = [
  { id: 'no', label: 'Norsk' },
  { id: 'en', label: 'English' },
  { id: 'de', label: 'Deutsch' },
  { id: 'es', label: 'Español' },
  { id: 'fr', label: 'Français' },
  { id: 'it', label: 'Italiano' },
  { id: 'sv', label: 'Svenska' }
]

const A: Record<AllergenKey, Record<Lang, string>> = {
  milk: { no: 'melk', en: 'milk', de: 'Milch', es: 'leche', fr: 'lait', it: 'latte', sv: 'mjölk' },
  egg: { no: 'egg', en: 'egg', de: 'Ei', es: 'huevo', fr: 'œuf', it: 'uova', sv: 'ägg' },
  peanut: { no: 'peanøtter', en: 'peanuts', de: 'Erdnüsse', es: 'cacahuetes', fr: 'arachides', it: 'arachidi', sv: 'jordnötter' },
  nuts: { no: 'nøtter', en: 'tree nuts', de: 'Schalenfrüchte (Nüsse)', es: 'frutos de cáscara', fr: 'fruits à coque', it: 'frutta a guscio', sv: 'nötter' },
  gluten: { no: 'gluten (hvete, rug, bygg)', en: 'gluten (wheat, rye, barley)', de: 'Gluten (Weizen, Roggen, Gerste)', es: 'gluten (trigo, centeno, cebada)', fr: 'gluten (blé, seigle, orge)', it: 'glutine (frumento, segale, orzo)', sv: 'gluten (vete, råg, korn)' },
  soy: { no: 'soya', en: 'soy', de: 'Soja', es: 'soja', fr: 'soja', it: 'soia', sv: 'soja' },
  fish: { no: 'fisk', en: 'fish', de: 'Fisch', es: 'pescado', fr: 'poisson', it: 'pesce', sv: 'fisk' },
  crustaceans: { no: 'skalldyr (reker, krabbe, hummer)', en: 'crustaceans (shrimp, crab, lobster)', de: 'Krebstiere (Garnelen, Krabben, Hummer)', es: 'crustáceos (gambas, cangrejo, langosta)', fr: 'crustacés (crevettes, crabe, homard)', it: 'crostacei (gamberi, granchio, astice)', sv: 'kräftdjur (räkor, krabba, hummer)' },
  molluscs: { no: 'bløtdyr (blåskjell, blekksprut)', en: 'molluscs (mussels, squid)', de: 'Weichtiere (Muscheln, Tintenfisch)', es: 'moluscos (mejillones, calamar)', fr: 'mollusques (moules, calmar)', it: 'molluschi (cozze, calamari)', sv: 'blötdjur (musslor, bläckfisk)' },
  sesame: { no: 'sesam', en: 'sesame', de: 'Sesam', es: 'sésamo', fr: 'sésame', it: 'sesamo', sv: 'sesam' },
  celery: { no: 'selleri', en: 'celery', de: 'Sellerie', es: 'apio', fr: 'céleri', it: 'sedano', sv: 'selleri' },
  mustard: { no: 'sennep', en: 'mustard', de: 'Senf', es: 'mostaza', fr: 'moutarde', it: 'senape', sv: 'senap' },
  sulphites: { no: 'sulfitt', en: 'sulphites', de: 'Sulfite', es: 'sulfitos', fr: 'sulfites', it: 'solfiti', sv: 'sulfiter' },
  lupin: { no: 'lupin', en: 'lupin', de: 'Lupinen', es: 'altramuces', fr: 'lupin', it: 'lupini', sv: 'lupin' }
}

const T: Record<Lang, {
  title: string
  intro: (name: string) => string
  needs: (name: string) => string
  severe: string
  coeliac: string
  coeliacStrict: string
  lactose: string
  birch: string
  also: string
  cross: string
  thanks: string
}> = {
  no: {
    title: 'Til den som lager maten',
    intro: (n) => `${n} har matallergi og kan ikke spise:`,
    needs: (n) => `${n} må passe på dette i maten:`,
    severe: 'alvorlig – også spor',
    coeliac: 'Cøliaki: ingen hvete, rug, bygg, spelt eller vanlig havre. Glutenfri havre og glutenfri hvetestivelse er OK.',
    coeliacStrict: 'Reagerer også på små spor av gluten.',
    lactose: 'Laktoseintoleranse: laktosefrie meieriprodukter er OK.',
    birch: 'Bjørkepollenallergi: rå frukt, rå grønnsaker og nøtter kan gi kløe. Kokt eller stekt er som regel OK.',
    also: 'Unngå også:',
    cross: 'Bruk rent utstyr, egen stekeolje og eget skjærebrett.',
    thanks: 'Si fra hvis du er usikker. Tusen takk!'
  },
  en: {
    title: 'To the person preparing my food',
    intro: (n) => `${n} has a food allergy and cannot eat:`,
    needs: (n) => `${n} has special dietary needs:`,
    severe: 'severe – even traces',
    coeliac: 'Coeliac disease: no wheat, rye, barley, spelt or ordinary oats. Gluten-free oats and gluten-free wheat starch are fine.',
    coeliacStrict: 'Also reacts to small traces of gluten.',
    lactose: 'Lactose intolerance: lactose-free dairy is fine.',
    birch: 'Birch pollen allergy: raw fruit, raw vegetables and nuts may cause itching. Cooked or baked is usually fine.',
    also: 'Please also avoid:',
    cross: 'Please use clean utensils, separate frying oil and a separate cutting board.',
    thanks: 'Please tell me if you are unsure. Thank you!'
  },
  de: {
    title: 'An die Person, die mein Essen zubereitet',
    intro: (n) => `${n} hat eine Lebensmittelallergie und darf nicht essen:`,
    needs: (n) => `${n} muss beim Essen auf Folgendes achten:`,
    severe: 'schwer – auch Spuren',
    coeliac: 'Zöliakie: kein Weizen, Roggen, Gerste, Dinkel oder normaler Hafer. Glutenfreier Hafer und glutenfreie Weizenstärke sind in Ordnung.',
    coeliacStrict: 'Reagiert auch auf kleine Spuren von Gluten.',
    lactose: 'Laktoseintoleranz: laktosefreie Milchprodukte sind in Ordnung.',
    birch: 'Birkenpollenallergie: rohes Obst, rohes Gemüse und Nüsse können Juckreiz auslösen. Gekocht oder gebacken ist meist in Ordnung.',
    also: 'Bitte auch vermeiden:',
    cross: 'Bitte sauberes Geschirr, separates Frittierfett und ein eigenes Schneidebrett verwenden.',
    thanks: 'Bitte sagen Sie es mir, wenn Sie unsicher sind. Vielen Dank!'
  },
  es: {
    title: 'Para la persona que prepara mi comida',
    intro: (n) => `${n} tiene alergia alimentaria y no puede comer:`,
    needs: (n) => `${n} tiene necesidades alimentarias especiales:`,
    severe: 'grave – incluso trazas',
    coeliac: 'Celiaquía: sin trigo, centeno, cebada, espelta ni avena normal. La avena sin gluten y el almidón de trigo sin gluten están bien.',
    coeliacStrict: 'También reacciona a pequeñas trazas de gluten.',
    lactose: 'Intolerancia a la lactosa: los lácteos sin lactosa están bien.',
    birch: 'Alergia al polen de abedul: la fruta cruda, las verduras crudas y los frutos secos pueden causar picor. Cocinado u horneado suele estar bien.',
    also: 'Evite también:',
    cross: 'Use utensilios limpios, aceite de freír aparte y una tabla de cortar aparte.',
    thanks: 'Dígame si tiene dudas. ¡Muchas gracias!'
  },
  fr: {
    title: 'À la personne qui prépare mon repas',
    intro: (n) => `${n} a une allergie alimentaire et ne peut pas manger :`,
    needs: (n) => `${n} a des besoins alimentaires particuliers :`,
    severe: 'grave – même des traces',
    coeliac: 'Maladie cœliaque : pas de blé, seigle, orge, épeautre ni avoine ordinaire. L’avoine sans gluten et l’amidon de blé sans gluten conviennent.',
    coeliacStrict: 'Réagit aussi à de petites traces de gluten.',
    lactose: 'Intolérance au lactose : les produits laitiers sans lactose conviennent.',
    birch: 'Allergie au pollen de bouleau : les fruits crus, les légumes crus et les noix peuvent provoquer des démangeaisons. Cuit, c’est généralement bien.',
    also: 'Évitez aussi :',
    cross: 'Merci d’utiliser des ustensiles propres, une huile de friture séparée et une planche à découper séparée.',
    thanks: 'Dites-le-moi en cas de doute. Merci beaucoup !'
  },
  it: {
    title: 'Per chi prepara il mio pasto',
    intro: (n) => `${n} ha un’allergia alimentare e non può mangiare:`,
    needs: (n) => `${n} ha esigenze alimentari particolari:`,
    severe: 'grave – anche tracce',
    coeliac: 'Celiachia: niente frumento, segale, orzo, farro o avena normale. Avena senza glutine e amido di frumento senza glutine vanno bene.',
    coeliacStrict: 'Reagisce anche a piccole tracce di glutine.',
    lactose: 'Intolleranza al lattosio: i latticini senza lattosio vanno bene.',
    birch: 'Allergia al polline di betulla: frutta cruda, verdura cruda e frutta secca possono dare prurito. Cotto di solito va bene.',
    also: 'Evitare anche:',
    cross: 'Usate utensili puliti, olio per friggere separato e un tagliere separato.',
    thanks: 'Ditemi se avete dubbi. Grazie mille!'
  },
  sv: {
    title: 'Till den som lagar min mat',
    intro: (n) => `${n} har matallergi och kan inte äta:`,
    needs: (n) => `${n} behöver tänka på detta i maten:`,
    severe: 'svår – även spår',
    coeliac: 'Celiaki: inget vete, råg, korn, dinkel eller vanlig havre. Glutenfri havre och glutenfri vetestärkelse går bra.',
    coeliacStrict: 'Reagerar även på små spår av gluten.',
    lactose: 'Laktosintolerans: laktosfria mejeriprodukter går bra.',
    birch: 'Björkpollenallergi: rå frukt, råa grönsaker och nötter kan ge klåda. Kokt eller bakat går oftast bra.',
    also: 'Undvik även:',
    cross: 'Använd rena redskap, separat frityrolja och en egen skärbräda.',
    thanks: 'Säg till om du är osäker. Tack så mycket!'
  }
}

export interface ChefCard {
  title: string
  intro: string
  items: string[]
  notes: string[]
  thanks: string
}

export function buildChefCard(
  lang: Lang,
  p: { name: string; allergens: { key: AllergenKey; severity: Severity }[]; conditions: ConditionKey[]; custom_terms: string[] }
): ChefCard {
  const t = T[lang]
  const items = p.allergens
    .filter((a) => !(a.key === 'gluten' && p.conditions.includes('coeliac')))
    .map((a) => `${A[a.key]?.[lang] ?? a.key}${a.severity === 'severe' ? ` (${t.severe})` : ''}`)
  const notes: string[] = []
  if (p.conditions.includes('coeliac')) notes.push(t.coeliac + (p.conditions.includes('coeliac_strict') ? ` ${t.coeliacStrict}` : ''))
  if (p.conditions.includes('lactose')) notes.push(t.lactose)
  if (p.conditions.includes('birch')) notes.push(t.birch)
  if (p.custom_terms?.length) notes.push(`${t.also} ${p.custom_terms.join(', ')}`)
  if (items.length || p.conditions.includes('coeliac')) notes.push(t.cross)
  return { title: t.title, intro: items.length ? t.intro(p.name) : t.needs(p.name), items, notes, thanks: t.thanks }
}
