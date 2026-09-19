import { apiFetch } from './api'

/**
 * Консоль тестирования агентов.
 *
 * Бэкенд проксирует запросы боту, который прогоняет НАСТОЯЩИЙ пайплайн.
 * Диалог идёт в песочнице: брони и заявки помечаются `is_test`, не занимают
 * реальные слоты, не попадают в Google Sheets и не шлют WhatsApp-сообщений.
 */

export type BotName = 'dopsy_bot' | 'dopsy_fs_school' | 'dopsy_boxing'

/** Человеческие названия трёх агентов — порядок задаёт порядок в селекторе. */
export const BOT_LABELS: Record<BotName, string> = {
  dopsy_bot: 'Допшы · аренда полей',
  dopsy_fs_school: 'FS DOPȘÝ · футбольная академия',
  dopsy_boxing: 'Boxy Academy · бокс',
}

export const BOT_ORDER: BotName[] = ['dopsy_bot', 'dopsy_fs_school', 'dopsy_boxing']

export interface AgentTestSession {
  id: number
  bot_name: BotName
  phone_number_id: string
  test_phone: string
  chat_id: string
  title: string | null
  created_by: string | null
  created_at: string | null
  updated_at: string | null
}

export interface AgentMessage {
  role: 'user' | 'assistant'
  content: string
}

/** Одно событие трассировки. `kind` определяет, какие поля заполнены. */
export interface TraceEvent {
  kind: 'rag' | 'route' | 'llm_call' | 'branch' | 'error'
  at?: number
  // rag
  query?: string
  k?: number
  chunks?: { source?: string; scope?: string; text?: string }[]
  // route
  router?: string
  intent?: string
  lang?: string
  // branch
  bot?: string
  pipeline?: string
  session_state?: string | null
  session_params?: unknown
  // llm_call
  model?: string
  system_prompt?: string | null
  tools?: string[]
  tool_choice?: unknown
  temperature?: number
  reply?: string | null
  tool_calls?: { name: string; arguments: string }[]
  prompt_tokens?: number | null
  completion_tokens?: number | null
  total_tokens?: number | null
  elapsed_ms?: number
  // error
  error?: string
}

export interface TurnResult {
  sent: string
  replies: string[]
  trace: TraceEvent[]
  elapsed_ms: number
  messages: AgentMessage[]
}

/** Бот отвечает конвертом {ok, data} — разворачиваем его здесь. */
interface Envelope<T> {
  ok: boolean
  data: T
  message?: string
}

async function unwrap<T>(promise: Promise<Envelope<T>>): Promise<T> {
  const res = await promise
  if (!res.ok) throw new Error(res.message || 'Сервис бота вернул ошибку')
  return res.data
}

export function listSessions(): Promise<AgentTestSession[]> {
  return unwrap(apiFetch<Envelope<AgentTestSession[]>>('/agent-test/sessions'))
}

export function createSession(bot_name: BotName, title?: string): Promise<AgentTestSession> {
  return unwrap(
    apiFetch<Envelope<AgentTestSession>>('/agent-test/sessions', {
      method: 'POST',
      body: JSON.stringify(title ? { bot_name, title } : { bot_name }),
    }),
  )
}

export function getSession(
  id: number,
): Promise<{ session: AgentTestSession; messages: AgentMessage[] }> {
  return unwrap(
    apiFetch<Envelope<{ session: AgentTestSession; messages: AgentMessage[] }>>(
      `/agent-test/sessions/${id}`,
    ),
  )
}

export function sendMessage(id: number, text: string): Promise<TurnResult> {
  return unwrap(
    apiFetch<Envelope<TurnResult>>(`/agent-test/sessions/${id}/messages`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),
  )
}

export function resetSession(id: number): Promise<unknown> {
  return unwrap(
    apiFetch<Envelope<unknown>>(`/agent-test/sessions/${id}/reset`, { method: 'POST' }),
  )
}

export function deleteSession(id: number): Promise<unknown> {
  return unwrap(
    apiFetch<Envelope<unknown>>(`/agent-test/sessions/${id}`, { method: 'DELETE' }),
  )
}
