// Ønsker: kostholdsvalg som ikke handler om sikkerhet. De påvirker aldri flagget, bare informasjon og alternativer.

import type { Nutrition, ProductData } from './rules'
import { fmt, Msg } from './i18n/core'

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
  msg?: Msg
}

const note = (key: keyof Wishes, ok: boolean | null, m: Msg, rawText?: string): WishNote => ({
  key,
  label: fmt('no', { k: `w.${key}` }),
  ok,
  text: rawText ?? fmt('no', m),
  msg: rawText ? undefined : m
})


const fmtNum = (n: number) => (Math.round(n * 10) / 10).toString().replace('.', ',')

export function evaluateWishes(product: ProductData, wishes: Wishes | null | undefined): WishNote[] {
  if (!wishes) return []
  const n: Nutrition = product.nutrition ?? {}
  const text = `${product.ingredientsText ?? ''}`
  const out: WishNote[] = []
  if (wishes.lowcarb != null) {
    const v = n.carbohydrates_g
    out.push(note('lowcarb', v == null ? null : v <= wishes.lowcarb, v == null ? { k: 'w.noCarbs' } : { k: 'w.carbs', p: { v: fmtNum(v), limit: wishes.lowcarb } }))
  }
  if (wishes.lowsugar != null) {
    const v = n.sugars_g
    out.push(note('lowsugar', v == null ? null : v <= wishes.lowsugar, v == null ? { k: 'w.noSugar' } : { k: 'w.sugar', p: { v: fmtNum(v), limit: wishes.lowsugar } }))
  }
  if (wishes.fiber) {
    const v = n.fiber_g
    // EU: «kilde til fiber» fra 3 g, «høyt fiberinnhold» fra 6 g per 100 g.
    out.push(
      note('fiber', v == null ? null : v >= 6, v == null ? { k: 'w.noFiber' } : { k: v >= 6 ? 'w.fiberHigh' : v >= 3 ? 'w.fiberSource' : 'w.fiberText', p: { v: fmtNum(v) } })
    )
  }
  if (wishes.wholegrain) {
    const g = product.grainInfo
    out.push(note('wholegrain', g ? /grovt|fullkorn|sammalt|whole ?grain|vollkorn|integral|complet|täysjyvä/i.test(g) && !/fint/i.test(g) : null, { k: 'w.noGrain' }, g ?? undefined))
  }
  if (wishes.keyhole) {
    out.push(note('keyhole', product.keyhole ? true : product.labels?.length || product.mode !== 'barcode' ? false : null, { k: product.keyhole ? 'w.keyholeYes' : 'w.keyholeNo' }))
  }
  return out
}

export function hasWishes(w: Wishes | null | undefined): boolean {
  return !!w && Object.values(w).some((v) => v !== null && v !== undefined && v !== false)
}
