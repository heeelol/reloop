// ReLoop — text embedding edge function (for semantic "search by need").
// Embeds an item's text on posting, and the user's query at search time,
// using OpenAI text-embedding-3-small (1536 dims). Returns the raw vector.

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
const MODEL = Deno.env.get('OPENAI_EMBED_MODEL') ?? 'text-embedding-3-small'

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
    const { input } = await req.json()
    if (!input || typeof input !== 'string') {
      return json({ error: 'Missing "input" string' }, 400)
    }
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: MODEL, input: input.slice(0, 4000) }),
    })
    if (!res.ok) {
      return json({ error: 'Embedding failed', detail: await res.text() }, 502)
    }
    const data = await res.json()
    return json({ embedding: data.data?.[0]?.embedding ?? null })
  } catch (err) {
    return json({ error: String(err) }, 500)
  }
})
