import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

/**
 * Turns a bank description into facts about the world. It is deliberately not
 * allowed to return a ruling: the rule table in src/lib/classify/engine.ts maps
 * these facts onto a verdict with a citation attached.
 */
const SYSTEM = `You identify what kind of economic activity a bank transaction represents.

You are NOT a religious authority and must never judge whether something is permitted or forbidden. Report only observable facts about the counterparty and the transaction. A separate rule engine applies the religious ruling.

For each transaction return:
- sourceType: how the money was earned
- counterparty: the organisation involved, expanded from any abbreviation you recognise
- industry: what that organisation primarily does
- involvesInterest: true only when the payment is a return on money lent or deposited
- certainty: 0 to 1, how confident you are. Use below 0.5 when the description is genuinely uninformative.
- reasoning: one short sentence

Descriptions have had digits and punctuation stripped, so they may look terse. If a description carries no usable signal, set industry to "unknown" and certainty below 0.5 rather than guessing.`

const SOURCE_TYPES = [
  'employment', 'business', 'investment', 'rental', 'gift',
  'interest', 'gambling', 'benefit', 'refund', 'transfer', 'other',
]

const INDUSTRIES = [
  'halal_general', 'conventional_banking', 'insurance_conventional', 'alcohol', 'pork',
  'gambling_hospitality', 'adult_entertainment', 'tobacco', 'weapons', 'mixed_retail', 'unknown',
]

const SCHEMA = {
  type: 'object',
  properties: {
    results: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          sourceType: { type: 'string', enum: SOURCE_TYPES },
          counterparty: { type: 'string' },
          industry: { type: 'string', enum: INDUSTRIES },
          involvesInterest: { type: 'boolean' },
          certainty: { type: 'number' },
          reasoning: { type: 'string' },
        },
        required: ['id', 'sourceType', 'counterparty', 'industry', 'involvesInterest', 'certainty', 'reasoning'],
        additionalProperties: false,
      },
    },
  },
  required: ['results'],
  additionalProperties: false,
}

type Item = { id: string; description: string }

export async function POST(request: Request) {
  const { items } = (await request.json()) as { items: Item[] }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { results: [], unavailable: true, reason: 'No API key configured. Running on rules only.' },
      { status: 200 },
    )
  }

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ results: [] })
  }

  const client = new Anthropic()

  // Amounts, dates and account numbers never leave the browser. Only the
  // already-normalized merchant string is sent.
  const payload = items.slice(0, 100).map((i) => ({ id: i.id, description: i.description }))

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 16000,
      system: SYSTEM,
      output_config: { format: { type: 'json_schema', schema: SCHEMA } },
      messages: [{ role: 'user', content: JSON.stringify(payload) }],
    })

    const text = response.content.find((b) => b.type === 'text')
    if (!text || text.type !== 'text') {
      return NextResponse.json({ results: [], unavailable: true, reason: 'Empty response.' })
    }

    return NextResponse.json(JSON.parse(text.text))
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ results: [], unavailable: true, reason: 'Rate limited. Try again shortly.' })
    }
    if (error instanceof Anthropic.APIError) {
      return NextResponse.json({ results: [], unavailable: true, reason: `Model unavailable (${error.status}).` })
    }
    throw error
  }
}
