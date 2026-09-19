<script setup lang="ts">
/**
 * Консоль тестирования агентов.
 *
 * После правки промпта или флоу проверить агента раньше можно было только
 * реальным сообщением на рабочий WhatsApp-номер. Здесь тот же самый пайплайн
 * запускается из браузера, в песочнице, и показывает внутренности хода:
 * какие куски базы знаний подтянулись, куда ушла маршрутизация, какой системный
 * промпт был отправлен, сколько это стоило токенов и времени.
 */
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import {
  ChevronDown,
  FlaskConical,
  LoaderCircle,
  Plus,
  RefreshCw,
  Send,
  Trash2,
} from 'lucide-vue-next'

import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import StateBlock from '@/components/academy/StateBlock.vue'
import Modal from '@/components/ui/Modal.vue'
import {
  buttonDanger,
  buttonGhost,
  buttonPrimary,
  buttonSecondary,
  buttonSize,
  input,
  panel,
  panelHeader,
  panelHint,
  panelTitle,
  select,
} from '@/components/academy/ui'
import {
  BOT_LABELS,
  BOT_ORDER,
  createSession,
  deleteSession,
  getSession,
  listSessions,
  resetSession,
  sendMessage,
  type AgentMessage,
  type AgentTestSession,
  type BotName,
  type TraceEvent,
} from '@/services/agentTest'

const currentPageTitle = 'Тест агента'

const sessions = ref<AgentTestSession[]>([])
const activeId = ref<number | null>(null)
const messages = ref<AgentMessage[]>([])
/** Трассировка последнего хода каждого ответа — ключ: индекс в messages. */
const traces = ref<Record<number, { trace: TraceEvent[]; elapsed_ms: number }>>({})

const loadingList = ref(true)
const listError = ref('')
const loadingThread = ref(false)
const threadError = ref('')
const sending = ref(false)
const turnError = ref('')

const draft = ref('')
const newBot = ref<BotName>('dopsy_bot')
const creating = ref(false)
const confirmDelete = ref<AgentTestSession | null>(null)
const busyAction = ref(false)
const openTrace = ref<number | null>(null)

const transcript = ref<HTMLElement | null>(null)

const activeSession = computed(() => sessions.value.find((s) => s.id === activeId.value) || null)

const listState = computed<'loading' | 'error' | 'empty' | 'ready'>(() => {
  if (loadingList.value) return 'loading'
  if (listError.value) return 'error'
  return sessions.value.length ? 'ready' : 'empty'
})

function errText(e: unknown, fallback: string): string {
  return e instanceof Error && e.message ? e.message : fallback
}

async function loadSessions() {
  loadingList.value = true
  listError.value = ''
  try {
    sessions.value = await listSessions()
    if (activeId.value && !sessions.value.some((s) => s.id === activeId.value)) {
      activeId.value = null
      messages.value = []
    }
    if (!activeId.value && sessions.value.length) await openSession(sessions.value[0].id)
  } catch (e) {
    listError.value = errText(e, 'Не удалось загрузить диалоги')
  } finally {
    loadingList.value = false
  }
}

async function openSession(id: number) {
  activeId.value = id
  loadingThread.value = true
  threadError.value = ''
  turnError.value = ''
  traces.value = {}
  openTrace.value = null
  try {
    const data = await getSession(id)
    messages.value = data.messages || []
    await scrollToEnd()
  } catch (e) {
    threadError.value = errText(e, 'Не удалось загрузить историю диалога')
  } finally {
    loadingThread.value = false
  }
}

async function onCreate() {
  creating.value = true
  try {
    const session = await createSession(newBot.value)
    sessions.value = [session, ...sessions.value]
    await openSession(session.id)
  } catch (e) {
    listError.value = errText(e, 'Не удалось создать диалог')
  } finally {
    creating.value = false
  }
}

async function onSend() {
  const text = draft.value.trim()
  if (!text || !activeId.value || sending.value) return

  sending.value = true
  turnError.value = ''
  // Оптимистично показываем своё сообщение — ход агента занимает секунды.
  messages.value = [...messages.value, { role: 'user', content: text }]
  draft.value = ''
  await scrollToEnd()

  try {
    const result = await sendMessage(activeId.value, text)
    messages.value = result.messages?.length
      ? result.messages
      : [...messages.value, ...result.replies.map((content) => ({ role: 'assistant' as const, content }))]
    traces.value = {
      ...traces.value,
      [messages.value.length - 1]: { trace: result.trace || [], elapsed_ms: result.elapsed_ms },
    }
  } catch (e) {
    turnError.value = errText(e, 'Агент не ответил')
  } finally {
    sending.value = false
    await scrollToEnd()
  }
}

async function onReset() {
  if (!activeId.value) return
  busyAction.value = true
  try {
    await resetSession(activeId.value)
    messages.value = []
    traces.value = {}
    openTrace.value = null
    turnError.value = ''
  } catch (e) {
    turnError.value = errText(e, 'Не удалось сбросить диалог')
  } finally {
    busyAction.value = false
  }
}

async function onDelete() {
  const target = confirmDelete.value
  if (!target) return
  busyAction.value = true
  try {
    await deleteSession(target.id)
    sessions.value = sessions.value.filter((s) => s.id !== target.id)
    confirmDelete.value = null
    if (activeId.value === target.id) {
      activeId.value = null
      messages.value = []
      if (sessions.value.length) await openSession(sessions.value[0].id)
    }
  } catch (e) {
    listError.value = errText(e, 'Не удалось удалить диалог')
  } finally {
    busyAction.value = false
  }
}

async function scrollToEnd() {
  await nextTick()
  const el = transcript.value
  if (el) el.scrollTop = el.scrollHeight
}

function onComposerKeydown(event: KeyboardEvent) {
  // Enter отправляет, Shift+Enter — перенос строки.
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    onSend()
  }
}

function botLabel(name: string): string {
  return BOT_LABELS[name as BotName] || name
}

function sessionTitle(s: AgentTestSession): string {
  return s.title || `${botLabel(s.bot_name)} · #${s.id}`
}

function traceFor(index: number) {
  return traces.value[index]
}

function tokensOf(trace: TraceEvent[]): number {
  return trace.reduce((sum, e) => sum + (e.total_tokens || 0), 0)
}

function llmCalls(trace: TraceEvent[]): TraceEvent[] {
  return trace.filter((e) => e.kind === 'llm_call')
}

function ragEvents(trace: TraceEvent[]): TraceEvent[] {
  return trace.filter((e) => e.kind === 'rag')
}

function routeEvents(trace: TraceEvent[]): TraceEvent[] {
  return trace.filter((e) => e.kind === 'route' || e.kind === 'branch')
}

function errorEvents(trace: TraceEvent[]): TraceEvent[] {
  return trace.filter((e) => e.kind === 'error')
}

watch(activeId, () => {
  draft.value = ''
})

onMounted(loadSessions)
</script>

<template>
  <AdminLayout>
    <PageBreadcrumb :pageTitle="currentPageTitle" />

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-[19rem_minmax(0,1fr)]">
      <!-- Список диалогов -->
      <section :class="panel" class="flex flex-col lg:max-h-[calc(100vh-12rem)]">
        <div :class="panelHeader">
          <div>
            <h2 :class="panelTitle">Диалоги</h2>
            <p :class="panelHint">Один диалог — одна память агента</p>
          </div>
        </div>

        <div class="space-y-2 border-b border-gray-200 px-5 py-4 dark:border-gray-800 sm:px-6">
          <select v-model="newBot" :class="select" aria-label="Выберите агента">
            <option v-for="name in BOT_ORDER" :key="name" :value="name">
              {{ BOT_LABELS[name] }}
            </option>
          </select>
          <button
            type="button"
            :class="[buttonPrimary, buttonSize.md, 'w-full']"
            :disabled="creating"
            @click="onCreate"
          >
            <LoaderCircle v-if="creating" class="size-4 animate-spin" />
            <Plus v-else class="size-4" />
            Новый диалог
          </button>
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto custom-scrollbar">
          <StateBlock
            :state="listState"
            :error="listError"
            :rows="4"
            emptyTitle="Диалогов пока нет"
            emptyHint="Выберите агента выше и начните новый диалог."
            @retry="loadSessions"
          >
            <ul class="p-2">
              <li v-for="s in sessions" :key="s.id">
                <button
                  type="button"
                  class="group flex w-full items-start gap-2 rounded-lg px-3 py-2.5 text-left transition-colors"
                  :class="
                    s.id === activeId
                      ? 'bg-pitch-50 dark:bg-pitch-500/10'
                      : 'hover:bg-gray-50 dark:hover:bg-white/[0.04]'
                  "
                  @click="openSession(s.id)"
                >
                  <span class="min-w-0 flex-1">
                    <span
                      class="block truncate text-theme-sm font-medium"
                      :class="
                        s.id === activeId
                          ? 'text-pitch-700 dark:text-pitch-400'
                          : 'text-gray-900 dark:text-white'
                      "
                    >
                      {{ sessionTitle(s) }}
                    </span>
                    <span class="mt-0.5 block truncate text-theme-xs text-gray-500 dark:text-gray-400">
                      +{{ s.test_phone }}
                    </span>
                  </span>
                  <span
                    :class="[buttonGhost, 'size-8 shrink-0 rounded-md p-0 opacity-0 group-hover:opacity-100']"
                    role="button"
                    aria-label="Удалить диалог"
                    @click.stop="confirmDelete = s"
                  >
                    <Trash2 class="size-4" />
                  </span>
                </button>
              </li>
            </ul>
          </StateBlock>
        </div>
      </section>

      <!-- Переписка -->
      <section :class="panel" class="flex min-h-[32rem] flex-col lg:max-h-[calc(100vh-12rem)]">
        <div :class="panelHeader">
          <div class="min-w-0">
            <h2 :class="panelTitle">
              {{ activeSession ? botLabel(activeSession.bot_name) : 'Выберите диалог' }}
            </h2>
            <p :class="panelHint">
              <span
                class="mr-1.5 inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 font-medium text-orange-700 dark:bg-orange-500/10 dark:text-orange-400"
              >
                <FlaskConical class="size-3" />
                Песочница
              </span>
              Брони и заявки отсюда помечены тестовыми: они не занимают слоты, не
              попадают в таблицы и не шлют сообщений клиентам.
            </p>
          </div>
          <button
            v-if="activeSession"
            type="button"
            :class="[buttonSecondary, buttonSize.sm]"
            :disabled="busyAction"
            @click="onReset"
          >
            <RefreshCw class="size-4" />
            Сбросить
          </button>
        </div>

        <!-- Лента сообщений -->
        <div ref="transcript" class="min-h-0 flex-1 overflow-y-auto custom-scrollbar px-5 py-4 sm:px-6">
          <StateBlock
            v-if="!activeSession || loadingThread || threadError"
            :state="loadingThread ? 'loading' : threadError ? 'error' : 'empty'"
            :error="threadError"
            :rows="4"
            emptyTitle="Диалог не выбран"
            emptyHint="Создайте новый диалог или выберите существующий слева."
            @retry="activeId && openSession(activeId)"
          />

          <template v-else>
            <p
              v-if="!messages.length"
              class="py-10 text-center text-theme-sm text-gray-500 dark:text-gray-400"
            >
              Напишите агенту как обычный клиент — например, «Хочу забронировать поле на завтра в 19:00».
            </p>

            <ul class="space-y-3">
              <li
                v-for="(m, i) in messages"
                :key="`${i}-${m.role}`"
                class="flex"
                :class="m.role === 'user' ? 'justify-end' : 'justify-start'"
              >
                <div class="max-w-[85%] sm:max-w-[75%]">
                  <div
                    class="whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-theme-sm"
                    :class="
                      m.role === 'user'
                        ? 'bg-pitch-600 text-white'
                        : 'bg-gray-100 text-gray-900 dark:bg-white/[0.06] dark:text-gray-100'
                    "
                  >
                    {{ m.content }}
                  </div>

                  <!-- Разбор хода -->
                  <div v-if="traceFor(i)" class="mt-1.5">
                    <button
                      type="button"
                      class="inline-flex items-center gap-1 text-theme-xs text-gray-500 transition-colors hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                      @click="openTrace = openTrace === i ? null : i"
                    >
                      <ChevronDown
                        class="size-3.5 transition-transform"
                        :class="openTrace === i ? 'rotate-180' : ''"
                      />
                      {{ traceFor(i)!.elapsed_ms }} мс
                      <template v-if="tokensOf(traceFor(i)!.trace)">
                        · {{ tokensOf(traceFor(i)!.trace) }} токенов
                      </template>
                      · разбор хода
                    </button>

                    <div
                      v-if="openTrace === i"
                      class="mt-2 space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-3 text-theme-xs dark:border-gray-800 dark:bg-white/[0.02]"
                    >
                      <!-- Ошибка -->
                      <div
                        v-for="(e, k) in errorEvents(traceFor(i)!.trace)"
                        :key="`err-${k}`"
                        class="rounded-lg bg-error-50 p-2 font-mono text-error-700 dark:bg-error-500/10 dark:text-error-400"
                      >
                        {{ e.error }}
                      </div>

                      <!-- Маршрутизация -->
                      <div v-if="routeEvents(traceFor(i)!.trace).length">
                        <p class="mb-1 font-semibold text-gray-700 dark:text-gray-300">Маршрут</p>
                        <ul class="space-y-0.5 text-gray-600 dark:text-gray-400">
                          <li v-for="(e, k) in routeEvents(traceFor(i)!.trace)" :key="`r-${k}`">
                            <template v-if="e.kind === 'branch'">
                              ветка: <b>{{ e.pipeline }}</b>
                              <template v-if="e.session_state">
                                · шаг флоу: <b>{{ e.session_state }}</b>
                              </template>
                            </template>
                            <template v-else>
                              {{ e.router }} → интент <b>{{ e.intent }}</b>, язык
                              <b>{{ e.lang }}</b>
                            </template>
                          </li>
                        </ul>
                      </div>

                      <!-- База знаний -->
                      <div v-for="(e, k) in ragEvents(traceFor(i)!.trace)" :key="`rag-${k}`">
                        <p class="mb-1 font-semibold text-gray-700 dark:text-gray-300">
                          База знаний · {{ e.chunks?.length || 0 }} фрагм.
                        </p>
                        <ul class="space-y-1">
                          <li
                            v-for="(c, ci) in e.chunks || []"
                            :key="ci"
                            class="rounded-lg bg-white p-2 dark:bg-white/[0.04]"
                          >
                            <span class="block font-medium text-gray-700 dark:text-gray-300">
                              {{ c.source }} <span class="text-gray-400">· {{ c.scope }}</span>
                            </span>
                            <span class="mt-0.5 block whitespace-pre-wrap text-gray-600 dark:text-gray-400">
                              {{ c.text }}
                            </span>
                          </li>
                        </ul>
                      </div>

                      <!-- Вызовы модели -->
                      <div v-for="(e, k) in llmCalls(traceFor(i)!.trace)" :key="`llm-${k}`">
                        <p class="mb-1 font-semibold text-gray-700 dark:text-gray-300">
                          {{ e.model }}
                          <span class="font-normal text-gray-500 dark:text-gray-400">
                            · {{ e.elapsed_ms }} мс
                            <template v-if="e.total_tokens">
                              · {{ e.prompt_tokens }}+{{ e.completion_tokens }}={{ e.total_tokens }}
                              токенов
                            </template>
                          </span>
                        </p>
                        <p
                          v-if="e.tool_calls?.length"
                          class="mb-1 text-gray-600 dark:text-gray-400"
                        >
                          вызов инструмента:
                          <b>{{ e.tool_calls.map((t) => t.name).join(', ') }}</b>
                        </p>
                        <details v-if="e.system_prompt" class="group">
                          <summary
                            class="cursor-pointer text-gray-600 underline-offset-2 hover:underline dark:text-gray-400"
                          >
                            системный промпт ({{ e.system_prompt.length }} симв.)
                          </summary>
                          <pre
                            class="mt-1 max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-white p-2 font-mono text-gray-700 dark:bg-white/[0.04] dark:text-gray-300"
                            >{{ e.system_prompt }}</pre
                          >
                        </details>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            </ul>

            <div v-if="sending" class="mt-3 flex items-center gap-2 text-theme-xs text-gray-500 dark:text-gray-400">
              <LoaderCircle class="size-4 animate-spin" />
              Агент печатает…
            </div>
          </template>
        </div>

        <!-- Композер -->
        <div class="border-t border-gray-200 px-5 py-4 dark:border-gray-800 sm:px-6">
          <p
            v-if="turnError"
            class="mb-2 rounded-lg bg-error-50 px-3 py-2 text-theme-xs text-error-700 dark:bg-error-500/10 dark:text-error-400"
          >
            {{ turnError }}
          </p>
          <form class="flex items-end gap-2" @submit.prevent="onSend">
            <textarea
              v-model="draft"
              rows="1"
              :disabled="!activeSession || sending"
              placeholder="Сообщение от имени клиента…  Enter — отправить, Shift+Enter — перенос строки"
              :class="[input, 'h-auto min-h-11 resize-y py-2.5']"
              @keydown="onComposerKeydown"
            />
            <button
              type="submit"
              :class="[buttonPrimary, buttonSize.md]"
              :disabled="!activeSession || sending || !draft.trim()"
            >
              <LoaderCircle v-if="sending" class="size-4 animate-spin" />
              <Send v-else class="size-4" />
              <span class="sr-only sm:not-sr-only">Отправить</span>
            </button>
          </form>
        </div>
      </section>
    </div>

    <!-- Подтверждение удаления -->
    <Modal v-if="confirmDelete" :fullScreenBackdrop="true" @close="confirmDelete = null">
      <template #body>
        <div
          class="relative z-10 mx-4 my-8 w-full max-w-md rounded-2xl bg-white p-5 shadow-theme-xl dark:bg-gray-900 sm:p-6"
        >
          <h3 class="text-base font-semibold text-gray-900 dark:text-white">Удалить диалог?</h3>
          <p class="mt-2 text-theme-sm text-gray-600 dark:text-gray-400">
            «{{ sessionTitle(confirmDelete) }}» и все тестовые записи этого диалога —
            брони, заявки и история — будут удалены безвозвратно.
          </p>
          <div class="mt-5 flex justify-end gap-2">
            <button
              type="button"
              :class="[buttonSecondary, buttonSize.md]"
              :disabled="busyAction"
              @click="confirmDelete = null"
            >
              Отмена
            </button>
            <button
              type="button"
              :class="[buttonDanger, buttonSize.md]"
              :disabled="busyAction"
              @click="onDelete"
            >
              <LoaderCircle v-if="busyAction" class="size-4 animate-spin" />
              Удалить
            </button>
          </div>
        </div>
      </template>
    </Modal>
  </AdminLayout>
</template>
