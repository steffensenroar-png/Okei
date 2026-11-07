import { describe, expect, it } from 'vitest'
import { evaluate, splitTraces, ProductData, ProfileInput } from './rules'
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
    expect(evaluate({ mode: 'food', source: 'ai', found: true, likely: ['milk'] }, emma).flag).toBe('yellow')
  })
  it('profil uten allergier gir ikke grønt', () => {
    expect(evaluate(label('Sukker.'), { name: 'A', allergens: [] }).flag).toBe('yellow')
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
