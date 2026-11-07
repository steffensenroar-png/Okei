# Okei (lukket beta)

Ta bilde av maten og få rødt, gult eller grønt flagg mot dine og barnas allergier.

**Status:** beta 0.1 for intern test. Ikke for offentlig bruk. Okei er et oppslagsverk og erstatter ikke lege.

## Slik virker det

1. **Strekkode** slås opp i Kassalapp (norske kjeder), med Open Food Facts som reserve.
2. **Foto av ingrediensliste** transkriberes ordrett av AI (Claude).
3. **Foto av uemballert mat**: AI gjetter retten og vanlige allergener. Gir aldri grønt.
4. **Regelmotoren** (`lib/rules.ts` + `lib/allergens.ts`) setter flagget. AI avgjør aldri flagget.

Regler: rødt ved oppgitt allergen (eller spor ved alvorlig allergi), gult ved spor, tvetydige ingredienser,
uleselig etikett eller manglende data, grønt bare med data for alle profilens allergener og ingen treff.

## Stack

- Next.js 16 på Vercel (region arn1, Stockholm)
- Supabase (eu-north-1): Auth (Google + e-postlenke), Postgres med RLS
- Anthropic API for bildelesing
- Bilder lagres aldri

## Oppsett

1. Kjør `supabase/migrations/*.sql` i Supabase SQL Editor.
2. Legg til testere: `insert into public.beta_allowlist (email) values ('navn@eksempel.no');`
3. Sett miljøvariabler i Vercel (se `.env.example`).
4. Supabase Auth: legg Vercel-adressen inn som Site URL og Redirect URL (`https://<domene>/skann`).

## Utvikling

```bash
npm install
npm test        # regelmotoren
npm run dev
```

Synonymlisten i `lib/allergens.ts` må kvalitetssikres av klinisk ernæringsfysiolog før offentlig lansering.
