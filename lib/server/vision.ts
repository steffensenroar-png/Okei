// AI leser bilder. AI setter aldri flagget: den transkriberer etiketter
// og gjetter hva uemballert mat er. Regelmotoren (lib/rules.ts) avgjør resten.

import Anthropic from '@anthropic-ai/sdk'
import { AllergenKey } from '../allergens'
import { Legibility, ProductData } from '../rules'

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
      notes: { type: 'string', description: 'Kort merknad om hva som eventuelt ikke kunne leses.' }
    },
    required: ['is_ingredient_list', 'legibility', 'ingredients_text', 'may_contain_text']
  }
}

export async function readLabel(image: string, media: ImageMedia): Promise<ProductData> {
  const out = await callTool<{
    is_ingredient_list: boolean
    legibility: Legibility
    product_name?: string
    ingredients_text: string
    may_contain_text: string
    notes?: string
  }>(
    image,
    media,
    'Du transkriberer ingredienslister på matvarer for en allergiapp. Skriv av teksten nøyaktig slik den står. ' +
      'Gjett aldri ord du ikke kan lese: marker heller legibility som partial eller poor. ' +
      'Hvis bildet ikke viser en ingrediensliste, sett is_ingredient_list til false.',
    LABEL_TOOL
  )
  const isList = !!out.is_ingredient_list
  return {
    mode: 'label',
    name: out.product_name?.trim() || null,
    ingredientsText: isList ? out.ingredients_text : '',
    tracesText: isList ? out.may_contain_text : '',
    legibility: isList ? out.legibility : 'poor',
    source: 'Foto av ingrediensliste (tekst lest av AI)',
    found: isList && !!out.ingredients_text?.trim()
  }
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
