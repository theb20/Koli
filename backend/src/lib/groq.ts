/* ─────────────────────────────────────────────────────────────
   Client Groq — API compatible OpenAI (chat completions + tool use),
   utilisé par l'assistant du chatbox (voir routes/chat.ts). Modèle
   Llama 3.3 70B, quota gratuit (30 req/min, 1000/jour au moment de
   l'intégration — voir isDailyQuotaAvailable dans routes/chat.ts pour la
   protection côté serveur de ce quota partagé par tous les visiteurs).

   Configuration (backend/.env) : GROQ_API_KEY
   Tant que la variable est absente, isGroqConfigured() est false et
   l'appelant doit dégrader proprement (réponse générique, jamais bloquant
   pour l'affichage du chat).
───────────────────────────────────────────────────────────── */

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
// Le catalogue Groq change régulièrement (llama-3.3-70b-versatile, annoncé
// au moment de l'intégration, n'existait déjà plus au test) — vérifié en
// direct via GET /openai/v1/models avant de fixer ce nom, plutôt que de se
// fier à la documentation seule.
const MODEL = 'openai/gpt-oss-120b'

export function isGroqConfigured(): boolean {
  return Boolean(process.env.GROQ_API_KEY)
}

export type ToolCall = {
  id: string
  type: 'function'
  function: { name: string; arguments: string }
}

export type ChatMessage =
  | { role: 'system' | 'user'; content: string }
  | { role: 'assistant'; content: string | null; tool_calls?: ToolCall[] }
  | { role: 'tool'; tool_call_id: string; content: string }

export type ToolDefinition = {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}

type GroqResponse = {
  choices: Array<{
    message: { role: 'assistant'; content: string | null; tool_calls?: ToolCall[] }
    finish_reason: string
  }>
}

export async function chatCompletion(messages: ChatMessage[], tools?: ToolDefinition[]): Promise<GroqResponse> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error('Groq non configuré (GROQ_API_KEY manquant)')

  const res = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      ...(tools ? { tools, tool_choice: 'auto' } : {}),
      temperature: 0.3,
      max_tokens: 400,
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Groq: échec de la requête (HTTP ${res.status}) ${body}`)
  }
  return res.json() as Promise<GroqResponse>
}
