// «Godt å vite»: korte forklaringer som bygger kunnskap hos familien når et bestemt tilfelle dukker opp.
// Hver forklaring har en kilde, så familien kan lese mer selv.

export interface Insight {
  id: string
  title: string
  text: string
  source: { label: string; url: string }
}

const NCF_STOLAV = {
  label: 'Norsk cøliakiforening, sitert i St. Olavs cøliakikurs',
  url: 'https://stolav.no/4addfc/contentassets/939c0c50a60441ada1b894bd307b856c/glutenfritt-kosthold-lm-coliaki-oktober-2024.pdf'
}
const MATTILSYNET_GF = {
  label: 'Mattilsynet: merking av glutenfrie produkter',
  url: 'https://mattilsynet.no/mat-og-drikke/merking-av-mat/merking-av-glutenfrie-produkter'
}
const HDIR_ALLERGI = {
  label: 'Helsedirektoratet: kosthold ved matvareallergi',
  url: 'https://www.helsedirektoratet.no/faglige-rad/kosthold-ved-diagnoser-og-sykdomstilstander/rad-om-kosthold-ved-ulike-diagnoser-og-sykdomstilstander/kosthold-ved-matvareallergi-overfolsomhet'
}
const NAAF_MERKING = {
  label: 'NAAF om allergenmerking (matoppskrift.no)',
  url: 'https://www.matoppskrift.no/artikkel/kantiner-og-restauranter-maa-naa-merke-mat-som-serveres-for-allergener'
}
const NHI_FRUKT = {
  label: 'NHI: allergi mot frukt og bær',
  url: 'https://nhi.no/sykdommer/allergi/matvareallergi-og-intoleranse-kostrad/frukt-og-bar'
}
const APOTEK = {
  label: '1177: tilsetninger i legemidler',
  url: 'https://www.1177.se/Skane/behandling--hjalpmedel/behandling-med-lakemedel/om-lakemedel/tillsatser-i-lakemedel/'
}

export const INSIGHTS: Record<string, Insight> = {
  coeliac_traces: {
    id: 'coeliac_traces',
    title: 'Spor av gluten ved cøliaki',
    text:
      'De fleste med cøliaki tåler varer merket «kan inneholde spor av gluten» i moderate mengder. Produsenter som tester slike varer, finner som regel under 20 mg gluten per kg. Reagerer du på svært små mengder, velg «Svært sensitiv» under cøliaki i profilen. Da gir spor rødt.',
    source: NCF_STOLAV
  },
  coeliac_wheat_starch: {
    id: 'coeliac_wheat_starch',
    title: 'Glutenfri hvetestivelse',
    text:
      'Glutenfri hvetestivelse er hvetestivelse der glutenet er vasket bort, og den brukes i mange glutenfrie brød. De fleste med cøliaki tåler den. Har noen hveteallergi, gjelder ikke dette: da må hvete unngås helt.',
    source: NCF_STOLAV
  },
  coeliac_oats: {
    id: 'coeliac_oats',
    title: 'Havre og cøliaki',
    text:
      'Havre er i seg selv glutenfri, men blir lett forurenset av hvete, rug og bygg i åkeren og på møllen. Velg havre merket glutenfri. Den kan ha høyst 20 mg gluten per kg.',
    source: MATTILSYNET_GF
  },
  gluten_free_label: {
    id: 'gluten_free_label',
    title: 'Hva «glutenfri» betyr',
    text:
      'En vare merket «glutenfri» kan ha høyst 20 mg gluten per kg. Det er grensen regelverket bruker for at varen skal passe ved cøliaki.',
    source: MATTILSYNET_GF
  },
  traces_general: {
    id: 'traces_general',
    title: '«Kan inneholde spor»',
    text:
      'De fleste med matallergi tåler varer merket «kan inneholde spor». Den som er svært sensitiv, bør avklare med lege. I Okei setter du allergien til «Alvorlig» hvis spor skal gi rødt.',
    source: HDIR_ALLERGI
  },
  lactic_acid: {
    id: 'lactic_acid',
    title: 'Melkesyre er ikke melk',
    text: 'Melkesyre har navnet sitt fra syren, ikke fra melk, og regnes ikke som melkeallergen.',
    source: NAAF_MERKING
  },
  peanut_not_nut: {
    id: 'peanut_not_nut',
    title: 'Peanøtt er ikke en nøtt',
    text:
      'I merkereglene er peanøtt en belgfrukt og eget allergen, ikke en nøtt. Okei sjekker peanøtt for seg. Avklar med lege om nøtteallergien også gjelder peanøtt.',
    source: NAAF_MERKING
  },
  birch_cross: {
    id: 'birch_cross',
    title: 'Kryssreaksjon ved bjørkepollenallergi',
    text:
      'Omtrent 70 prosent med bjørkepollenallergi reagerer på noe mat, oftest rå frukt, grønnsaker og nøtter. Reaksjonen er vanligvis kløe i munnen. Mange tåler maten skrellet eller kokt, for eksempel eplekake eller hermetisk frukt.',
    source: NHI_FRUKT
  },
  ai_net: {
    id: 'ai_net',
    title: 'Ekstra kontroll fra AI',
    text:
      'Okei sjekker etiketten to ganger: med en fast ordliste og med AI som ser hvilke allergener som er uthevet. Her så AI-en et allergen som ordlisten ikke kjente igjen, ofte fordi etiketten er på et annet språk eller bruker et uvanlig ord. Svaret blir da strengere, aldri mildere. Les etiketten selv.',
    source: { label: 'EU-forordning 1169/2011: allergener skal utheves i ingredienslisten', url: 'https://eur-lex.europa.eu/legal-content/NO/TXT/?uri=CELEX:32011R1169' }
  },
  menu_ask: {
    id: 'menu_ask',
    title: 'Spør alltid personalet',
    text:
      'Spisesteder skal kunne opplyse om allergener også i mat som ikke er ferdigpakket. Menyen sier ikke noe om felles frityr, skjærebrett eller bakeplater, så si fra om allergien når du bestiller.',
    source: NAAF_MERKING
  },
  product_pharmacy: {
    id: 'product_pharmacy',
    title: 'Medisiner og hudprodukter',
    text:
      'Noen få legemidler inneholder hvetestivelse, og mange har laktose som hjelpestoff. Mengden er som regel liten. Spør alltid apoteket eller legen før du slutter med eller bytter en medisin.',
    source: APOTEK
  }
}
