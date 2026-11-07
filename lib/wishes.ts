// Ønsker: kostholdsvalg som ikke handler om sikkerhet. De påvirker aldri flagget, bare informasjon og alternativer.

import { normalize } from './allergens'
import type { Nutrition, ProductData } from './rules'

export interface Wishes {
  /** Maks gram karbohydrater per 100 g. */
  lowcarb?: number | null
  /** Maks gram sukker per 100 g. */
  lowsugar?: number | null
  fiber?: boolean
  wholegrain?: boolean
  keyhole?: boolean
  vegetarian?: boolean
  vegan?: boolean
}

export interface WishNote {
  key: keyof Wishes
  label: string
  ok: boolean | null
  text: string
}

const MEAT = /kjøtt|svin|storfe|okse|kylling|kalkun|lam\b|lammekjøtt|bacon|skinke|pølse|gelatin|karmin|e120|kollagen|fiskegelatin|ansjos|reke|laks|torsk|tunfisk|fisk|skalldyr|blekksprut|meat|pork|beef|chicken|gelatine|anchov|shrimp|salmon/
const ANIMAL = /melk|fløte|smør|ost\b|ost |myse|kasein|laktose|yoghurt|rømme|egg|honning|honey|milk|butter|cheese|whey|casein|cream/

function veg(text: string, vegan: boolean): boolean | null {
  if (!text.trim()) return null
  const t = normalize(text).replace(/kokosmelk|havremelk|soyamelk|mandelmelk|rismelk|melkefri|kakaosmør|peanøttsmør|melkesyre|eggfri/g, ' ')
  if (MEAT.test(t)) return false
  if (vegan && ANIMAL.test(t)) return false
  return true
}

const fmt = (n: number) => (Math.round(n * 10) / 10).toString().replace('.', ',')

export function evaluateWishes(product: ProductData, wishes: Wishes | null | undefined): WishNote[] {
  if (!wishes) return []
  const n: Nutrition = product.nutrition ?? {}
  const text = `${product.ingredientsText ?? ''}`
  const out: WishNote[] = []
  if (wishes.lowcarb != null) {
    const v = n.carbohydrates_g
    out.push({
      key: 'lowcarb',
      label: 'Lavkarbo',
      ok: v == null ? null : v <= wishes.lowcarb,
      text: v == null ? 'Fant ikke karbohydrater i dataene.' : `${fmt(v)} g karbohydrater per 100 g (din grense ${wishes.lowcarb} g).`
    })
  }
  if (wishes.lowsugar != null) {
    const v = n.sugars_g
    out.push({
      key: 'lowsugar',
      label: 'Lite sukker',
      ok: v == null ? null : v <= wishes.lowsugar,
      text: v == null ? 'Fant ikke sukkerinnhold i dataene.' : `${fmt(v)} g sukker per 100 g (din grense ${wishes.lowsugar} g).`
    })
  }
  if (wishes.fiber) {
    const v = n.fiber_g
    // EU: «kilde til fiber» fra 3 g, «høyt fiberinnhold» fra 6 g per 100 g.
    out.push({
      key: 'fiber',
      label: 'Fiber',
      ok: v == null ? null : v >= 6,
      text:
        v == null
          ? 'Fant ikke fiberinnhold i dataene.'
          : `${fmt(v)} g fiber per 100 g${v >= 6 ? ' (høyt fiberinnhold)' : v >= 3 ? ' (kilde til fiber)' : ''}.`
    })
  }
  if (wishes.wholegrain) {
    const g = product.grainInfo
    out.push({
      key: 'wholegrain',
      label: 'Grovt og fullkorn',
      ok: g ? /grovt|fullkorn|sammalt|whole ?grain/i.test(g) && !/fint/i.test(g) : null,
      text: g ? g : 'Fant ikke grovhet eller kornandel. Se etter Brødskalaen på pakken.'
    })
  }
  if (wishes.keyhole) {
    out.push({
      key: 'keyhole',
      label: 'Nøkkelhullet',
      ok: product.keyhole ? true : product.labels?.length || product.mode !== 'barcode' ? false : null,
      text: product.keyhole ? 'Merket med Nøkkelhullet.' : 'Ikke merket med Nøkkelhullet.'
    })
  }
  if (wishes.vegan || wishes.vegetarian) {
    const vegan = !!wishes.vegan
    const r = veg(text, vegan)
    out.push({
      key: vegan ? 'vegan' : 'vegetarian',
      label: vegan ? 'Vegansk' : 'Vegetar',
      ok: r,
      text: r == null ? 'Mangler ingrediensliste.' : r ? 'Fant ingen ingredienser fra dyr i listen.' : 'Inneholder ingredienser fra dyr.'
    })
  }
  return out
}

export function hasWishes(w: Wishes | null | undefined): boolean {
  return !!w && Object.values(w).some((v) => v !== null && v !== undefined && v !== false)
}
