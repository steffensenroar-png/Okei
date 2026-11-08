import { describe, expect, it } from 'vitest'
import { evaluate, evaluateFamily, splitTraces, ProductData, ProfileInput } from './rules'
import { keyFromName, matchAllergen, ALLERGEN_BY_KEY } from './allergens'

const emma: ProfileInput = {
  name: 'Emma',
  allergens: [
    { key: 'milk', severity: 'severe' },
    { key: 'peanut', severity: 'moderate' }
  ]
}

const label = (ingredientsText: string, extra: Partial<ProductData> = {}): ProductData => ({
  mode: 'label',
  ingredientsText,
  legibility: 'good',
  source: 'test',
  found: true,
  ...extra
})

describe('melk', () => {
  it('finner melk i sammensatte ord', () => {
    const r = evaluate(label('Hvetemel, sukker, skummetmelkpulver, kakao.'), emma)
    expect(r.flag).toBe('red')
    expect(r.findings[0].evidence).toContain('skummetmelkpulver')
  })
  it('finner myse og kasein', () => {
    expect(matchAllergen('myseprotein', ALLERGEN_BY_KEY.milk).hits.length).toBeGreaterThan(0)
    expect(matchAllergen('natriumkaseinat', ALLERGEN_BY_KEY.milk).hits.length).toBeGreaterThan(0)
  })
  it('kokosmelk, kakaosmør og melkesyre er ikke melk', () => {
    const r = evaluate(label('Kokosmelk, kakaosmør, melkesyre, sukker.'), emma)
    expect(r.findings.find((f) => f.key === 'milk')?.status).toBe('none')
    expect(r.flag).toBe('green')
  })
  it('laktosefri melk er fortsatt melk', () => {
    expect(evaluate(label('Laktosefri melk.'), emma).flag).toBe('red')
  })
})

describe('spor', () => {
  it('skiller hoveddel og spor', () => {
    const { main, traces } = splitTraces('Sukker, kakao. Kan inneholde spor av melk og peanøtter.')
    expect(main).not.toContain('melk')
    expect(traces).toContain('melk')
  })
  it('spor ved alvorlig allergi gir rødt', () => {
    const r = evaluate(label('Sukker, kakao. Kan inneholde spor av melk.'), emma)
    expect(r.flag).toBe('red')
  })
  it('spor ved moderat allergi gir gult', () => {
    const r = evaluate(label('Sukker, kakao. Kan inneholde spor av peanøtter.'), emma)
    expect(r.flag).toBe('yellow')
  })
})

describe('falske treff vi må unngå', () => {
  it('bokhvete er ikke hvete', () => {
    const p: ProfileInput = { name: 'A', allergens: [{ key: 'gluten', severity: 'severe' }] }
    expect(evaluate(label('Bokhvetemel, vann, salt.'), p).flag).toBe('green')
  })
  it('kokosnøtt og muskatnøtt er ikke nøtter', () => {
    const p: ProfileInput = { name: 'A', allergens: [{ key: 'nuts', severity: 'severe' }] }
    expect(evaluate(label('Kokosnøtt, muskatnøtt, sukker.'), p).flag).toBe('green')
  })
  it('peanøtter er ikke trenøtter, men er peanøtter', () => {
    const p: ProfileInput = { name: 'A', allergens: [{ key: 'nuts', severity: 'severe' }, { key: 'peanut', severity: 'moderate' }] }
    const r = evaluate(label('Peanøtter, salt.'), p)
    expect(r.findings.find((f) => f.key === 'nuts')?.status).toBe('none')
    expect(r.findings.find((f) => f.key === 'peanut')?.status).toBe('contains')
  })
  it('helegg er egg', () => {
    const p: ProfileInput = { name: 'A', allergens: [{ key: 'egg', severity: 'moderate' }] }
    expect(evaluate(label('Hvetemel, helegg, sukker.'), p).flag).toBe('red')
  })
  it('maltodekstrin er ikke gluten, maltekstrakt er', () => {
    const p: ProfileInput = { name: 'A', allergens: [{ key: 'gluten', severity: 'moderate' }] }
    expect(evaluate(label('Maltodekstrin, sukker.'), p).flag).toBe('green')
    expect(evaluate(label('Maltekstrakt (bygg), sukker.'), p).flag).toBe('red')
  })
})

describe('tvetydige ingredienser og usikkerhet', () => {
  it('lecitin uten kilde gir gult for soya', () => {
    const p: ProfileInput = { name: 'A', allergens: [{ key: 'soy', severity: 'moderate' }] }
    expect(evaluate(label('Sukker, emulgator (lecitin).'), p).flag).toBe('yellow')
    expect(evaluate(label('Sukker, emulgator (solsikkelecitin).'), p).flag).toBe('green')
    expect(evaluate(label('Sukker, emulgator (soyalecitin).'), p).flag).toBe('red')
  })
  it('uleselig etikett gir aldri grønt', () => {
    expect(evaluate(label('Sukker, salt.', { legibility: 'partial' }), emma).flag).toBe('yellow')
    expect(evaluate(label('Sukker, salt.', { legibility: 'poor' }), emma).flag).toBe('yellow')
  })
  it('manglende data gir gult', () => {
    const r = evaluate({ mode: 'barcode', source: 'test', found: false }, emma)
    expect(r.flag).toBe('yellow')
  })
  it('strukturerte data uten tekst: ukjent gir gult, «free» gir grønt', () => {
    expect(evaluate({ mode: 'barcode', source: 'k', found: true, structured: { milk: 'free' } }, emma).flag).toBe('yellow')
    expect(
      evaluate({ mode: 'barcode', source: 'k', found: true, structured: { milk: 'free', peanut: 'free' } }, emma).flag
    ).toBe('green')
  })
  it('uemballert mat gir aldri grønt', () => {
    expect(evaluate({ mode: 'food', source: 'ai', found: true, likely: [] }, emma).flag).toBe('yellow')
    expect(evaluate({ mode: 'food', source: 'ai', found: true, likely: ['milk'] }, emma).flag).not.toBe('green')
    expect(evaluate({ mode: 'food', source: 'ai', found: true, likely: ['peanut'] }, emma).flag).toBe('yellow')
  })
  it('profil uten allergier gir grønt med tydelig overskrift', () => {
    expect(evaluate(label('Sukker.'), { name: 'A', allergens: [] })).toMatchObject({ flag: 'green', headline: 'Ingen registrerte allergier' })
  })
})

describe('sulfitt og E-nummer', () => {
  it('finner E 220 med mellomrom', () => {
    const p: ProfileInput = { name: 'A', allergens: [{ key: 'sulphites', severity: 'moderate' }] }
    expect(evaluate(label('Rosiner, konserveringsmiddel (E 220).'), p).flag).toBe('red')
  })
})

describe('egne ingredienser og navn', () => {
  it('finner egendefinert ingrediens', () => {
    const p: ProfileInput = { name: 'A', allergens: [], customTerms: ['kiwi'] }
    expect(evaluate(label('Eple, kiwi, sukker.'), p).flag).toBe('red')
  })
  it('gjenkjenner allergennavn fra produktdata', () => {
    expect(keyFromName('Hvete')).toBe('gluten')
    expect(keyFromName('Melk')).toBe('milk')
    expect(keyFromName('Skalldyr')).toBe('crustaceans')
  })
  it('genitiv for navn på s', () => {
    const p: ProfileInput = { name: 'Jonas', allergens: [{ key: 'egg', severity: 'moderate' }] }
    expect(evaluate(label('Sukker.'), p).headline).toBe("Ingen av Jonas' allergener funnet")
  })
})

describe('tilstander', () => {
  it('cøliaki: spor av gluten gir gult med forklaring, svært sensitiv gir rødt', () => {
    const p: ProfileInput = { name: 'Marte', allergens: [], conditions: ['coeliac'] }
    const r = evaluate(label('Rismel, sukker. Kan inneholde spor av hvete.'), p)
    expect(r.flag).toBe('yellow')
    expect(r.findings[0].label).toBe('Gluten (cøliaki)')
    expect(r.insights?.map((i) => i.id)).toContain('coeliac_traces')
    const strict = evaluate(label('Rismel, sukker. Kan inneholde spor av hvete.'), { ...p, conditions: ['coeliac', 'coeliac_strict'] })
    expect(strict.flag).toBe('red')
    expect(strict.insights?.map((i) => i.id) ?? []).not.toContain('coeliac_traces')
  })
  it('cøliaki: glutenfri hvetestivelse er OK, men ikke ved hveteallergi', () => {
    const p: ProfileInput = { name: 'Marte', allergens: [], conditions: ['coeliac'] }
    const bread = label('Vann, glutenfri hvetestivelse, rismel, gjær, salt.')
    const r = evaluate(bread, p)
    expect(r.flag).toBe('green')
    expect(r.insights?.map((i) => i.id)).toContain('coeliac_wheat_starch')
    expect(evaluate(label('Vann, hvetestivelse (glutenfri), rismel.'), p).flag).toBe('green')
    const wheat: ProfileInput = { name: 'Ola', allergens: [{ key: 'gluten', severity: 'severe' }] }
    expect(evaluate(bread, wheat).flag).toBe('red')
  })
  it('cøliaki: «hvetestivelse*» godtas når varen er merket glutenfri', () => {
    const p: ProfileInput = { name: 'Marte', allergens: [], conditions: ['coeliac'] }
    const r = evaluate({ ...label('Vann, hvetestivelse*, maisstivelse.'), glutenFreeClaim: true }, p)
    expect(r.flag).toBe('green')
    expect(r.insights?.map((i) => i.id)).toEqual(expect.arrayContaining(['coeliac_wheat_starch', 'gluten_free_label']))
    expect(evaluate(label('Vann, hvetestivelse, maisstivelse.'), p).flag).toBe('red')
  })
  it('cøliaki: vanlig havre gir rødt med forklaring, glutenfri havre er OK', () => {
    const p: ProfileInput = { name: 'Marte', allergens: [], conditions: ['coeliac'] }
    const r = evaluate(label('Havregryn, rosiner.'), p)
    expect(r.flag).toBe('red')
    expect(r.insights?.map((i) => i.id)).toContain('coeliac_oats')
    expect(evaluate(label('Glutenfri havre, rosiner.'), p).flag).toBe('green')
  })
  it('bjørkepollen: rått eple gir gult med forklaring om kryssreaksjon', () => {
    const p: ProfileInput = { name: 'Roar', allergens: [], conditions: ['birch'] }
    const r = evaluate(label('Eple, gulrot, sitronsaft.'), p)
    expect(r.flag).toBe('yellow')
    expect(r.headline).toMatch(/kryssreaksjon/)
    expect(r.insights?.map((i) => i.id)).toContain('birch_cross')
    expect(evaluate(label('Ris, vann, salt.'), p).flag).toBe('green')
  })
  it('forklaringer: melkesyre og peanøtt ved nøtteallergi', () => {
    const milk: ProfileInput = { name: 'A', allergens: [{ key: 'milk', severity: 'moderate' }] }
    expect(evaluate(label('Kjøtt, salt, melkesyre.'), milk).insights?.map((i) => i.id)).toContain('lactic_acid')
    const nuts: ProfileInput = { name: 'A', allergens: [{ key: 'nuts', severity: 'moderate' }] }
    const r = evaluate(label('Sjokolade, peanøtter.'), nuts)
    expect(r.flag).toBe('green')
    expect(r.insights?.map((i) => i.id)).toContain('peanut_not_nut')
  })
  it('laktoseintoleranse: melk gir rødt, laktosefri melk er OK, kasein er ikke laktose', () => {
    const p: ProfileInput = { name: 'A', allergens: [], conditions: ['lactose'] }
    expect(evaluate(label('Melk, sukker.'), p).flag).toBe('red')
    expect(evaluate(label('Laktosefri melk, sukker.'), p).flag).toBe('green')
    expect(evaluate(label('Natriumkaseinat, sukker.'), p).flag).toBe('green')
  })
  it('melkeallergi overstyrer laktosesjekken', () => {
    const p: ProfileInput = { name: 'A', allergens: [{ key: 'milk', severity: 'severe' }], conditions: ['lactose'] }
    const r = evaluate(label('Laktosefri melk.'), p)
    expect(r.flag).toBe('red')
    expect(r.findings).toHaveLength(1)
  })
})

describe('familievurdering', () => {
  it('grønnsakspostei: OK for Roar, ikke for Marte og Elise', () => {
    const product = label('Grønnsaker (gulrot, erter), hvetemel, rapsolje, egg, salt.')
    const r = evaluateFamily(product, [
      { id: '1', name: 'Roar', allergens: [] , customTerms: ['kiwi'] },
      { id: '2', name: 'Marte', allergens: [], conditions: ['coeliac'] },
      { id: '3', name: 'Elise', allergens: [{ key: 'egg', severity: 'moderate' }] }
    ])
    expect(r.flag).toBe('red')
    expect(r.headline).toBe('Ikke for Marte og Elise')
    expect(r.people.find((p) => p.name === 'Roar')?.evaluation.flag).toBe('green')
  })
  it('alle grønne gir «OK for alle»', () => {
    const r = evaluateFamily(label('Ris, vann.'), [
      { id: '1', name: 'A', allergens: [{ key: 'milk', severity: 'mild' }] },
      { id: '2', name: 'B', allergens: [{ key: 'egg', severity: 'mild' }] }
    ])
    expect(r).toMatchObject({ flag: 'green', headline: 'OK for alle' })
  })
})

describe('sikkerhetsregler fra designgjennomgangen', () => {
  it('uemballert mat ved alvorlig allergi gir rødt', () => {
    const p: ProfileInput = { name: 'A', allergens: [{ key: 'milk', severity: 'severe' }] }
    const r = evaluate({ mode: 'food', source: 'ai', found: true, likely: ['milk'] }, p)
    expect(r.flag).toBe('red')
    expect(r.headline).toBe('Sannsynligvis melk. Ikke spis.')
  })
  it('glutenfri havre er OK ved cøliaki, vanlig havre er ikke', () => {
    const p: ProfileInput = { name: 'A', allergens: [], conditions: ['coeliac'] }
    expect(evaluate(label('Glutenfri havre, salt.'), p).flag).toBe('green')
    expect(evaluate(label('Havregryn, salt.'), p).flag).toBe('red')
  })
  it('viser allergener som ikke står på profilen', () => {
    const p: ProfileInput = { name: 'A', allergens: [{ key: 'milk', severity: 'moderate' }] }
    const r = evaluate(label('Sukker, kakao. Kan inneholde spor av hasselnøtter.'), p)
    expect(r.flag).toBe('green')
    expect(r.others).toEqual([{ key: 'nuts', label: 'Nøtter', kind: 'traces' }])
  })
})

describe('andre språk', () => {
  const p = (key: any, severity: any = 'moderate'): ProfileInput => ({ name: 'A', allergens: [{ key, severity }] })
  it('tysk: Weizen og Milch gir rødt, Spuren gir gult, Kokosmilch er ikke melk', () => {
    expect(evaluate(label('Zutaten: Weizenmehl, Zucker, Salz.'), p('gluten')).flag).toBe('red')
    expect(evaluate(label('Zutaten: Zucker, Vollmilchpulver.'), p('milk')).flag).toBe('red')
    expect(evaluate(label('Zutaten: Reis, Kokosmilch, Salz.'), p('milk')).flag).toBe('green')
    expect(evaluate(label('Zutaten: Zucker, Kakaobutter. Kann Spuren von Haselnüssen enthalten.'), p('nuts')).flag).toBe('yellow')
    expect(evaluate(label('Zutaten: Erdnüsse, Salz.'), p('nuts')).flag).toBe('green')
    expect(evaluate(label('Zutaten: Erdnüsse, Salz.'), p('peanut')).flag).toBe('red')
  })
  it('spansk: trigo og leche, trazas, leche de coco', () => {
    expect(evaluate(label('Ingredientes: harina de trigo, azúcar.'), p('gluten')).flag).toBe('red')
    expect(evaluate(label('Ingredientes: arroz, leche de coco.'), p('milk')).flag).toBe('green')
    expect(evaluate(label('Ingredientes: azúcar, cacao. Puede contener trazas de leche.'), p('milk')).flag).toBe('yellow')
    expect(evaluate(label('Ingredientes: trigo sarraceno, sal.'), p('gluten')).flag).toBe('green')
  })
  it('fransk: blé, œuf, traces, lait de coco, laitue', () => {
    expect(evaluate(label('Ingrédients : farine de blé, sucre.'), p('gluten')).flag).toBe('red')
    expect(evaluate(label('Ingrédients : œufs, sucre.'), p('egg')).flag).toBe('red')
    expect(evaluate(label('Ingrédients : laitue, tomate, lait de coco.'), p('milk')).flag).toBe('green')
    expect(evaluate(label('Ingrédients : sucre. Peut contenir des traces de fruits à coque.'), p('nuts')).flag).toBe('yellow')
  })
  it('italiensk: frumento, latte, tracce, granoturco', () => {
    expect(evaluate(label('Ingredienti: farina di frumento, zucchero.'), p('gluten')).flag).toBe('red')
    expect(evaluate(label('Ingredienti: latte, zucchero.'), p('milk')).flag).toBe('red')
    expect(evaluate(label('Ingredienti: farina di granoturco, sale.'), p('gluten')).flag).toBe('green')
    expect(evaluate(label('Ingredienti: zucchero. Può contenere tracce di sesamo.'), p('sesame')).flag).toBe('yellow')
  })
  it('finsk: vehnä, maito, voi sisältää, «ei» er ikke egg, maitohappo', () => {
    expect(evaluate(label('Ainekset: vehnäjauho, sokeri.'), p('gluten')).flag).toBe('red')
    expect(evaluate(label('Ainekset: sokeri, maitojauhe.'), p('milk')).flag).toBe('red')
    expect(evaluate(label('Ainekset: sokeri, kaakaovoi. Voi sisältää pieniä määriä maapähkinää.'), p('peanut')).flag).toBe('yellow')
    expect(evaluate(label('Ainekset: riisi, suola. Ei sisällä gluteenia.'), p('egg')).flag).toBe('green')
    expect(evaluate(label('Ainekset: kana, suola, maitohappo.'), p('milk')).flag).toBe('green')
    expect(evaluate(label('Ainekset: kananmuna, sokeri.'), p('egg')).flag).toBe('red')
  })
  it('cøliaki på tysk: glutenfreie Weizenstärke er OK', () => {
    const c: ProfileInput = { name: 'M', allergens: [], conditions: ['coeliac'] }
    expect(evaluate(label('Zutaten: Wasser, glutenfreie Weizenstärke, Reismehl.'), c).flag).toBe('green')
  })
})

describe('AI-sikkerhetsnett', () => {
  it('gjør svaret strengere når AI ser et allergen ordlisten bommer på, aldri mildere', () => {
    const p: ProfileInput = { name: 'A', allergens: [{ key: 'milk', severity: 'moderate' }] }
    const r = evaluate({ ...label('Składniki: cukier, mleko w proszku.'), aiDeclared: { contains: ['milk'], traces: [] } }, p)
    expect(r.flag).toBe('red')
    expect(r.insights?.map((i) => i.id)).toContain('ai_net')
    const t = evaluate({ ...label('Ris, salt.'), aiDeclared: { contains: [], traces: ['milk'] } }, p)
    expect(t.flag).toBe('yellow')
    // AI som ikke ser noe, gjør aldri et rødt svar grønt.
    expect(evaluate({ ...label('Melk, sukker.'), aiDeclared: { contains: [], traces: [] } }, p).flag).toBe('red')
  })
  it('respekterer glutenfri hvetestivelse ved cøliaki', () => {
    const c: ProfileInput = { name: 'M', allergens: [], conditions: ['coeliac'] }
    const r = evaluate({ ...label('Vann, glutenfri hvetestivelse.'), aiDeclared: { contains: ['gluten'], traces: [] } }, c)
    expect(r.flag).toBe('green')
  })
})

import { DICTS, fmt, LANG_IDS } from './i18n/core'

describe('språk', () => {
  it('alle språk har alle nøkler og ingen rester av {plassholdere}', () => {
    const keys = Object.keys(DICTS.no)
    for (const l of LANG_IDS) {
      for (const k of keys) expect(DICTS[l][k], `${l}:${k}`).not.toBeUndefined()
    }
    const m = { k: 'f.notFor', p: { names: ['Nora', 'Emil'] } }
    for (const l of LANG_IDS) expect(fmt(l, m)).not.toMatch(/[{}]/)
    for (const l of LANG_IDS) expect(fmt(l, { k: 'h.noneFound', p: { name: 'Klaus' } })).not.toMatch(/[{}]/)
  })
})

describe('vegetar og vegansk', () => {
  const vegan: ProfileInput = { name: 'Mia', allergens: [], conditions: ['vegan'] }
  const vegetar: ProfileInput = { name: 'Ola', allergens: [], conditions: ['vegetarian'] }
  it('vegansk: melk, egg og honning gir rødt', () => {
    expect(evaluate(label('Hvetemel, sukker, melkepulver.'), vegan).flag).toBe('red')
    expect(evaluate(label('Havregryn, honning, salt.'), vegan).flag).toBe('red')
    expect(evaluate(label('Pasta (durumhvete, egg).'), vegan).flag).toBe('red')
  })
  it('vegetar: egg og melk er OK, kjøtt og gelatin gir rødt', () => {
    expect(evaluate(label('Pasta (durumhvete, egg), ost, melk.'), vegetar).flag).toBe('green')
    expect(evaluate(label('Sukker, glukosesirup, gelatin, aroma.'), vegetar).flag).toBe('red')
    expect(evaluate(label('Pizzadeig, tomat, ost, skinke.'), vegetar).flag).toBe('red')
    expect(evaluate(label('Pasta, ansjos, olivenolje.'), vegetar).flag).toBe('red')
  })
  it('plantebaserte varer gir grønt', () => {
    const r = evaluate(label('Vann, havre (10 %), rapsolje, kokosmelk, kakaosmør, salt.'), vegan)
    expect(r.flag).toBe('green')
    expect(r.headlineMsg?.k).toBe('h.noneOf')
  })
  it('spor av melk gjør ikke varen ikke-vegansk, men gir forklaring', () => {
    const r = evaluateFamily(label('Sukker, kakaomasse, kakaosmør. Kan inneholde spor av melk.'), [{ id: '1', ...vegan }])
    expect(r.flag).toBe('green')
    expect(r.insights.map((i) => i.id)).toContain('diet_traces')
  })
  it('E471 og vitamin D3 gir gult for veganere', () => {
    expect(evaluate(label('Hvetemel, vann, gjær, emulgator (E471), salt.'), vegan).flag).toBe('yellow')
    expect(evaluate(label('Hvetemel, vann, gjær, emulgator (E471), salt.'), vegetar).flag).toBe('green')
  })
  it('honningmelon og kakaosmør er ikke dyreprodukter', () => {
    expect(evaluate(label('Honningmelon, eple, kakaosmør, sukker.'), vegan).flag).toBe('green')
  })
  it('andre språk', () => {
    expect(evaluate(label('Zutaten: Weizenmehl, Schweinefleisch, Salz.'), vegetar).flag).toBe('red')
    expect(evaluate(label('Ingredientes: harina, azúcar, miel.'), vegan).flag).toBe('red')
    expect(evaluate(label('Ingrédients : farine, beurre, sel.'), vegan).flag).toBe('red')
    expect(evaluate(label('Ainesosat: vehnäjauho, kananmuna, sokeri.'), vegetar).flag).toBe('green')
    expect(evaluate(label('Ingredienti: farina, funghi porcini, sale.'), vegetar).flag).toBe('green')
  })
  it('vegansk merket vare gir allergiforklaring ved melkeallergi', () => {
    const r = evaluateFamily(label('Vegansk. Sukker, kakaosmør. Kan inneholde spor av melk.'), [{ id: '1', ...emma }])
    expect(r.insights.map((i) => i.id)).toContain('vegan_not_free')
  })
  it('kombinert med allergi', () => {
    const r = evaluate(label('Pasta (durumhvete, egg), peanøtter.'), { ...vegan, allergens: [{ key: 'peanut', severity: 'severe' }] })
    expect(r.flag).toBe('red')
  })
})
