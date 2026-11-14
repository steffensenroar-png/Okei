// Abonnementer. Prisene er hypotesen fra planen og kan endres her.
export type PlanId = 'personal' | 'family'
export type Interval = 'month' | 'year'

export const PLANS: Record<PlanId, { name: string; month: number; year: number }> = {
  personal: { name: 'Okei Personlig', month: 49, year: 449 },
  family: { name: 'Okei Familie', month: 69, year: 599 }
}

export const isPlan = (v: unknown): v is PlanId => v === 'personal' || v === 'family'
export const isInterval = (v: unknown): v is Interval => v === 'month' || v === 'year'

/** Gratis prøveperiode for nye abonnenter, i dager. Endres her. */
export const TRIAL_DAYS = 14
