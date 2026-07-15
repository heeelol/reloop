// ReLoop — item photo analysis edge function.
// Sends an uploaded photo to an OpenAI vision model, which returns a structured
// classification. CO2 saved is computed server-side from a fixed category table
// so the impact numbers stay consistent and defensible (not model-invented).

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
const MODEL = Deno.env.get('OPENAI_MODEL') ?? 'gpt-4o-mini'

const CATEGORIES = [
  'Furniture',
  'Electronics',
  'Clothing',
  'Books & Media',
  'Toys & Games',
  'Kitchen',
  'Garden',
  'Other',
] as const

type Category = (typeof CATEGORIES)[number]

// kg CO2e avoided by reusing rather than buying new + diverting from landfill.
const CO2: Record<Category, number> = {
  Furniture: 25,
  Electronics: 30,
  Clothing: 8,
  'Books & Media': 1.5,
  'Toys & Games': 3,
  Kitchen: 6,
  Garden: 10,
  Other: 5,
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  if (!OPENAI_API_KEY) return json({ error: 'OPENAI_API_KEY not configured' }, 500)

  try {
    const { image } = await req.json()
    if (!image || typeof image !== 'string') {
      return json({ error: 'Missing "image" (data URL or https URL)' }, 400)
    }

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        response_format: { type: 'json_object' },
        max_tokens: 300,
        messages: [
          {
            role: 'system',
            content:
              'You identify second-hand household items from a photo so a neighbour can give them away. ' +
              `Reply with strict JSON only: {"category": one of ${JSON.stringify(
                CATEGORIES,
              )}, "title": short listing title (max 6 words), "condition": one of ["like new","good","worn"], "confidence": number between 0 and 1 for how sure you are of the category, "reason": one short sentence a giver would find friendly}. ` +
              'Pick the single best category. Do not include any other keys.',
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'What is this item? Return the JSON.' },
              { type: 'image_url', image_url: { url: image } },
            ],
          },
        ],
      }),
    })

    if (!res.ok) {
      const detail = await res.text()
      return json({ error: 'Vision request failed', detail }, 502)
    }

    const data = await res.json()
    const raw = data?.choices?.[0]?.message?.content ?? '{}'
    let parsed: Record<string, unknown> = {}
    try {
      parsed = JSON.parse(raw)
    } catch {
      parsed = {}
    }

    const category: Category = (CATEGORIES as readonly string[]).includes(
      parsed.category as string,
    )
      ? (parsed.category as Category)
      : 'Other'

    const condition =
      parsed.condition === 'like new' ||
      parsed.condition === 'good' ||
      parsed.condition === 'worn'
        ? parsed.condition
        : 'good'
    // Slightly discount worn items — reuse value is a bit lower.
    const conditionFactor =
      condition === 'like new' ? 1 : condition === 'worn' ? 0.75 : 0.9
    const co2Saved = Math.round(CO2[category] * conditionFactor * 10) / 10

    // Clamp the model's self-reported confidence to [0,1]; default mid-high.
    const confidence =
      typeof parsed.confidence === 'number' && isFinite(parsed.confidence)
        ? Math.max(0, Math.min(1, parsed.confidence))
        : 0.8

    return json({
      category,
      condition,
      confidence,
      title:
        typeof parsed.title === 'string' && parsed.title.trim()
          ? parsed.title.trim()
          : 'Item to give away',
      co2Saved,
      reason:
        typeof parsed.reason === 'string' && parsed.reason.trim()
          ? parsed.reason.trim()
          : `Reusing this ${category.toLowerCase()} keeps a usable item out of landfill.`,
    })
  } catch (err) {
    return json({ error: String(err) }, 500)
  }
})
