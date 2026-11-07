// AI leser bilder. AI setter aldri flagget: den transkriberer etiketter
// og gjetter hva uemballert mat er. Regelmotoren (lib/rules.ts) avgjør resten.

import Anthropic from '@anthropic-ai/sdk'
import { AllergenKey } from '../allergens'
import { Legibility, Nutrition, ProductData } from '../rules'

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5'

const ALLERGEN_KEYS: AllergenKey[] = [
  'milk', 'egg', 'peanut', 'nuts', 'gluten', 'soy', 'fish', 'crustaceans', 'molluscs', 'sesame', 'celery', 'mustard',
  'sulphites', 'lupin'
]

function client() {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('Mangler ANTHROPIC_API_KEY')
  return new Anthropic()
}

type ImageMedia = 'image/jpeg' | 'image/png' | 'image/webp'

// Noen modeller støtter ikke tvunget verktøyvalg (tool_choice: tool), så vi ber
// om verktøykallet i instruksen og faller tilbake på JSON i tekstsvaret.
async function callTool<T>(image: string, media: ImageMedia, prompt: string, tool: Anthropic.Tool): Promise<T> {
  const res = await client().messages.create({
    model: MODEL,
    max_tokens: 4000,
    system:
      `Du svarer alltid ved å kalle verktøyet ${tool.name} nøyaktig én gang, med alle påkrevde felter. ` +
      'Skriv ingen annen tekst.',
    tools: [tool],
    tool_choice: { type: 'auto' },
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: media, data: image } },
          { type: 'text', text: prompt }
        ]
      }
    ]
  })
  const block = res.content.find((b) => b.type === 'tool_use')
  if (block && block.type === 'tool_use') return block.input as T

  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
  const match = text.match(/\{[\s\S]*\}/)
  if (match) {
    try {
      return JSON.parse(match[0]) as T
    } catch {
      /* faller gjennom til feilen under */
    }
  }
  throw new Error('AI ga ikke strukturert svar')
}

const LABEL_TOOL: Anthropic.Tool = {
  name: 'report_label',
  description: 'Rapporter den ordrette teksten i ingredienslisten på bildet.',
  input_schema: {
    type: 'object',
    properties: {
      is_ingredient_list: { type: 'boolean', description: 'Viser bildet en ingrediensliste for mat?' },
      legibility: {
        type: 'string',
        enum: ['good', 'partial', 'poor'],
        description: 'good = hele listen er lesbar; partial = deler er uskarpe, avkuttet eller skjult; poor = kan ikke leses sikkert.'
      },
      product_name: { type: 'string', description: 'Produktnavn hvis det står på bildet, ellers tom streng.' },
      language: { type: 'string', description: 'Språket på etiketten, f.eks. no, sv, en.' },
      ingredients_text: {
        type: 'string',
        description: 'Ingredienslisten ordrett, med samme stavemåte. Ikke oversett, ikke rett, ikke legg til. Utelat «kan inneholde»-setninger her.'
      },
      may_contain_text: {
        type: 'string',
        description: 'Ordrett tekst om «kan inneholde spor av» eller lignende. Tom streng hvis det ikke finnes.'
      },
      gluten_free_claim: {
        type: 'boolean',
        description: 'true hvis pakken sier glutenfri/gluten-free eller viser symbolet med overstreket kornaks.'
      },
      nutrition_per_100g: {
        type: 'object',
        description: 'Næringsinnhold per 100 g/ml hvis næringstabellen er synlig. Utelat felt du ikke kan lese.',
        properties: {
          energy_kcal: { type: 'number' },
          carbohydrates_g: { type: 'number' },
          sugars_g: { type: 'number' },
          fiber_g: { type: 'number' },
          protein_g: { type: 'number' },
          fat_g: { type: 'number' },
          salt_g: { type: 'number' }
        }
      },
      grain_info: {
        type: 'string',
        description: 'Ordrett tekst om grovhet eller kornandel, f.eks. Brødskalaen «Ekstra grovt 75–100 %» eller «sammalt hvete 30 %». Tom streng hvis ingen.'
      },
      keyhole: { type: 'boolean', description: 'true hvis Nøkkelhull-symbolet er synlig.' },
      notes: { type: 'string', description: 'Kort merknad om hva som eventuelt ikke kunne leses.' }
    },
    required: ['is_ingredient_list', 'legibility', 'ingredients_text', 'may_contain_text']
  }
}

export async function readLabel(image: string, media: ImageMedia, kind: 'food' | 'product' = 'food'): Promise<ProductData> {
  const out = await callTool<{
    is_ingredient_list: boolean
    legibility: Legibility
    product_name?: string
    ingredients_text: string
    may_contain_text: string
    gluten_free_claim?: boolean
    nutrition_per_100g?: Nutrition
    grain_info?: string
    keyhole?: boolean
    notes?: string
  }>(
    image,
    media,
    (kind === 'product'
      ? 'Du transkriberer ingredienslister på medisiner, kosttilskudd og hudprodukter (også INCI-navn og hjelpestoffer i pakningsvedlegg) for en allergiapp. '
      : 'Du transkriberer ingredienslister på matvarer for en allergiapp. ') +
      'Skriv av teksten nøyaktig slik den står, på originalspråket. ' +
      'Gjett aldri ord du ikke kan lese: marker heller legibility som partial eller poor. ' +
      'Hvis bildet ikke viser en ingrediensliste, sett is_ingredient_list til false.',
    LABEL_TOOL
  )
  const isList = !!out.is_ingredient_list
  return {
    mode: kind === 'product' ? 'product' : 'label',
    name: out.product_name?.trim() || null,
    ingredientsText: isList ? out.ingredients_text : '',
    tracesText: isList ? out.may_contain_text : '',
    legibility: isList ? out.legibility : 'poor',
    glutenFreeClaim: !!out.gluten_free_claim,
    nutrition: cleanNutrition(out.nutrition_per_100g),
    grainInfo: out.grain_info?.trim() || null,
    keyhole: !!out.keyhole,
    source: kind === 'product' ? 'Foto av produktets ingrediensliste (tekst lest av AI)' : 'Foto av ingrediensliste (tekst lest av AI)',
    found: isList && !!out.ingredients_text?.trim()
  }
}

function cleanNutrition(n?: Nutrition): Nutrition | null {
  if (!n || typeof n !== 'object') return null
  const out: Nutrition = {}
  for (const k of Object.keys(n) as (keyof Nutrition)[]) {
    const v = Number(n[k])
    if (Number.isFinite(v) && v >= 0 && v < 10000) out[k] = v
  }
  return Object.keys(out).length ? out : null
}

const FOOD_TOOL: Anthropic.Tool = {
  name: 'report_food',
  description: 'Rapporter hva slags mat bildet trolig viser og hvilke allergener slik mat vanligvis inneholder.',
  input_schema: {
    type: 'object',
    properties: {
      is_food: { type: 'boolean' },
      dish_name_no: { type: 'string', description: 'Navn på retten/bakverket på norsk, f.eks. «skillingsbolle».' },
      confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
      typical_allergens: {
        type: 'array',
        items: { type: 'string', enum: ALLERGEN_KEYS },
        description: 'Allergener som vanligvis inngår i denne typen mat etter vanlige oppskrifter.'
      }
    },
    required: ['is_food', 'dish_name_no', 'confidence', 'typical_allergens']
  }
}

export async function guessFood(image: string, media: ImageMedia): Promise<ProductData> {
  const out = await callTool<{
    is_food: boolean
    dish_name_no: string
    confidence: 'low' | 'medium' | 'high'
    typical_allergens: AllergenKey[]
  }>(
    image,
    media,
    'Se på bildet av mat uten emballasje. Gjett hva det er, og list allergenene som vanligvis er med i slik mat ' +
      'etter vanlige norske oppskrifter. Ta heller med ett allergen for mye enn ett for lite.',
    FOOD_TOOL
  )
  return {
    mode: 'food',
    name: out.is_food ? out.dish_name_no : 'Ukjent',
    likely: (out.typical_allergens ?? []).filter((k) => ALLERGEN_KEYS.includes(k)),
    confidence: out.confidence,
    source: 'Bildegjenkjenning (gjetning)',
    found: !!out.is_food
  }
}

// ---------- Meny og allergenliste på spisested ----------

export interface MenuDish {
  name: string
  description: string
  allergens: AllergenKey[]
  allergenInfo: boolean
}

const MENU_TOOL: Anthropic.Tool = {
  name: 'report_menu',
  description: 'Rapporter rettene på menyen eller allergenlisten og hvilke allergener som er oppgitt for hver.',
  input_schema: {
    type: 'object',
    properties: {
      is_menu: { type: 'boolean', description: 'Viser bildet en meny, et menykort eller en allergenoversikt?' },
      place_name: { type: 'string', description: 'Navn på spisestedet hvis det står, ellers tom streng.' },
      dishes: {
        type: 'array',
        description: 'Hver rett slik den står. Maks 30.',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Rettens navn ordrett.' },
            description: { type: 'string', description: 'Beskrivelse/ingredienser ordrett hvis det står, ellers tom streng.' },
            allergens: {
              type: 'array',
              items: { type: 'string', enum: ALLERGEN_KEYS },
              description:
                'Allergener som er OPPGITT for retten på menyen (tall, koder eller ord oversatt via forklaringen). Ikke gjett.'
            },
            allergen_info: {
              type: 'boolean',
              description: 'true hvis menyen faktisk oppgir allergener for denne retten (også «ingen allergener»).'
            }
          },
          required: ['name', 'description', 'allergens', 'allergen_info']
        }
      }
    },
    required: ['is_menu', 'dishes']
  }
}

export async function readMenu(image: string, media: ImageMedia): Promise<{ place: string | null; dishes: MenuDish[] } | null> {
  const out = await callTool<{
    is_menu: boolean
    place_name?: string
    dishes: { name: string; description: string; allergens: AllergenKey[]; allergen_info: boolean }[]
  }>(
    image,
    media,
    'Du leser menyer og allergenoversikter på spisesteder for en allergiapp. Skriv av rettene ordrett. ' +
      'Oversett allergenkoder (tall 1–14, bokstaver eller symboler) ved hjelp av forklaringen på menyen. ' +
      'Oppgi bare allergener som faktisk står for retten. Står det ingen allergeninformasjon, sett allergen_info til false.',
    MENU_TOOL
  )
  if (!out.is_menu) return null
  const dishes = (out.dishes ?? []).slice(0, 30).map((d) => ({
    name: String(d.name ?? '').slice(0, 120),
    description: String(d.description ?? '').slice(0, 500),
    allergens: (d.allergens ?? []).filter((k) => ALLERGEN_KEYS.includes(k)),
    allergenInfo: !!d.allergen_info
  }))
  return { place: out.place_name?.trim() || null, dishes }
}
