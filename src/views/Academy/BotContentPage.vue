<script setup lang="ts">
/**
 * Контент бота: цены, Kaspi-ссылка, номер администратора, FAQ на двух языках.
 *
 * ТЗ §9 — список открытых вопросов, без которых бот не запускается. Здесь он
 * не список в переписке, а форма с подсчётом готовности: видно, сколько
 * заполнено и что именно осталось.
 */
import { computed, onMounted, ref, watch } from 'vue'
import { Copy, Download, LoaderCircle, Plus, RotateCcw, Save, Trash2 } from 'lucide-vue-next'

import AdminLayout from '@/components/layout/AdminLayout.vue'
import { ChevronDownIcon } from '@/icons'
import AcademyHeader from '@/components/academy/AcademyHeader.vue'
import StatusPill from '@/components/academy/StatusPill.vue'
import {
  buttonDanger,
  buttonGhost,
  buttonPrimary,
  buttonSecondary,
  buttonSize,
  input,
  label as labelClass,
  panel,
  panelHeader,
  panelHint,
  panelTitle,
} from '@/components/academy/ui'
import { SPORTS, type SportKey } from '@/services/academy'
import { ModuleUnavailableError } from '@/services/academyPayments'
import {
  clearDraft,
  defaultContent,
  fetchBotContent,
  loadDraft,
  readiness,
  saveBotContent,
  saveDraft,
  toHandoffJson,
  type BotContent,
} from '@/services/botContent'

const props = defineProps<{ sport: SportKey }>()

const content = ref<BotContent>(defaultContent(props.sport))
const loading = ref(true)
/** true — сервер не отдаёт контент, работаем с черновиком в браузере. */
const localOnly = ref(false)
const saving = ref(false)
const savedAt = ref('')
const error = ref('')
const copied = ref(false)

const progress = computed(() => readiness(content.value))
const ready = computed(() => progress.value.missing.length === 0)

async function load() {
  loading.value = true
  error.value = ''
  try {
    content.value = await fetchBotContent(props.sport)
    localOnly.value = false
  } catch (e) {
    if (e instanceof ModuleUnavailableError) {
      localOnly.value = true
      content.value = loadDraft(props.sport) ?? defaultContent(props.sport)
    } else {
      error.value = e instanceof Error ? e.message : 'Не удалось загрузить контент бота'
      content.value = loadDraft(props.sport) ?? defaultContent(props.sport)
      localOnly.value = true
    }
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(() => props.sport, load)

async function save() {
  saving.value = true
  error.value = ''
  try {
    if (localOnly.value) {
      const ok = saveDraft(props.sport, content.value)
      if (!ok) throw new Error('Браузер не разрешил сохранить черновик')
    } else {
      await saveBotContent(props.sport, content.value)
    }
    savedAt.value = new Intl.DateTimeFormat('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date())
  } catch (e) {
    if (e instanceof ModuleUnavailableError) {
      localOnly.value = true
      saveDraft(props.sport, content.value)
      savedAt.value = 'черновик'
    } else {
      error.value = e instanceof Error ? e.message : 'Не удалось сохранить'
    }
  } finally {
    saving.value = false
  }
}

function reset() {
  clearDraft(props.sport)
  content.value = defaultContent(props.sport)
  savedAt.value = ''
}

async function copyJson() {
  try {
    await navigator.clipboard.writeText(toHandoffJson(props.sport, content.value))
    copied.value = true
    window.setTimeout(() => (copied.value = false), 2000)
  } catch {
    error.value = 'Буфер обмена недоступен — воспользуйтесь кнопкой «Скачать JSON»'
  }
}

function downloadJson() {
  const blob = new Blob([toHandoffJson(props.sport, content.value)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `dopsy-bot-${props.sport}.json`
  link.click()
  URL.revokeObjectURL(url)
}

function addTopic() {
  content.value.faq.push({
    id: `custom-${content.value.faq.length + 1}-${Math.random().toString(36).slice(2, 7)}`,
    topic: '',
    kz: '',
    ru: '',
    required: false,
  })
}

function removeTopic(id: string) {
  content.value.faq = content.value.faq.filter((item) => item.id !== id)
}

const textarea =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-theme-sm text-gray-900 placeholder:text-gray-500 focus-ring focus:border-pitch-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-500'
</script>

<template>
  <AdminLayout>
    <AcademyHeader
      :sport="sport"
      title="Контент бота"
      subtitle="Цены, Kaspi-ссылка, номер администратора и ответы FAQ на двух языках. Без них бот не запускается."
    >
      <template #actions>
        <button
          type="button"
          :class="[buttonSecondary, buttonSize.sm]"
          @click="copyJson"
        >
          <Copy class="h-3.5 w-3.5" aria-hidden="true" />
          {{ copied ? 'Скопировано' : 'Скопировать JSON' }}
        </button>
        <button type="button" :class="[buttonSecondary, buttonSize.sm]" @click="downloadJson">
          <Download class="h-3.5 w-3.5" aria-hidden="true" />
          Скачать JSON
        </button>
        <button type="button" :class="[buttonPrimary, buttonSize.sm]" :disabled="saving" @click="save">
          <LoaderCircle
            v-if="saving"
            class="h-3.5 w-3.5 animate-spin motion-reduce:animate-none"
            aria-hidden="true"
          />
          <Save v-else class="h-3.5 w-3.5" aria-hidden="true" />
          Сохранить
        </button>
      </template>
    </AcademyHeader>

    <div v-if="loading" class="space-y-4">
      <div class="skeleton h-20 rounded-2xl"></div>
      <div class="skeleton h-64 rounded-2xl"></div>
    </div>

    <template v-else>
      <p
        v-if="error"
        class="mb-5 rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-theme-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300"
        role="alert"
      >
        {{ error }}
      </p>

      <!-- Готовность к запуску -->
      <section
        :class="[panel, 'mb-6 px-5 py-4 sm:px-6']"
        :aria-label="`Готовность контента: ${progress.filled} из ${progress.total}`"
      >
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 :class="panelTitle">Готовность к запуску</h2>
            <p :class="panelHint">
              {{ SPORTS[sport].title }} · заполнено
              <strong class="font-semibold tabular-nums text-gray-900 dark:text-white"
                >{{ progress.filled }} из {{ progress.total }}</strong
              >
              обязательных полей.
            </p>
          </div>
          <StatusPill :tone="ready ? 'pitch' : 'warning'" size="md" :dot="ready">
            {{ ready ? 'Всё заполнено' : `Осталось ${progress.missing.length}` }}
          </StatusPill>
        </div>

        <div class="mt-4 h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            class="h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none"
            :class="ready ? 'bg-pitch-500' : 'bg-warning-500'"
            :style="{ width: `${Math.round((progress.filled / progress.total) * 100)}%` }"
          ></div>
        </div>

        <details v-if="progress.missing.length" class="group mt-3">
          <summary
            class="focus-ring inline-flex cursor-pointer items-center gap-1.5 rounded text-theme-xs font-semibold text-gray-700 marker:content-[''] dark:text-gray-300 [&::-webkit-details-marker]:hidden"
          >
            <ChevronDownIcon
              class="h-4 w-4 shrink-0 transition-transform duration-150 group-open:rotate-180 motion-reduce:transition-none"
            />
            Показать, что осталось заполнить
          </summary>
          <ul class="mt-2 space-y-1">
            <li
              v-for="item in progress.missing"
              :key="item"
              class="text-theme-xs text-gray-700 dark:text-gray-400"
            >
              — {{ item }}
            </li>
          </ul>
        </details>

        <p
          v-if="localOnly"
          class="mt-4 rounded-lg bg-warning-50 px-3 py-2 text-theme-xs text-warning-800 dark:bg-warning-500/10 dark:text-warning-200"
        >
          API контента бота ещё не готов, поэтому черновик хранится в этом браузере. Заполните поля
          и передайте JSON разработчику кнопкой выше — бот подхватит эти значения.
        </p>
        <p
          v-else-if="savedAt"
          class="mt-4 text-theme-xs text-gray-600 dark:text-gray-400"
          role="status"
        >
          Сохранено в {{ savedAt }}.
        </p>
      </section>

      <div class="grid gap-6 xl:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
        <!-- Цены и контакты -->
        <div class="space-y-6">
          <section :class="panel">
            <div class="border-b border-gray-200 px-5 py-4 dark:border-gray-800 sm:px-6">
              <h2 :class="panelTitle">Цены и оплата</h2>
              <p :class="panelHint">Бот называет сумму только из этих полей — сам ничего не считает.</p>
            </div>
            <div class="space-y-4 px-5 py-4 sm:px-6">
              <div>
                <label :class="labelClass" for="price-trial">Пробное занятие</label>
                <input
                  id="price-trial"
                  v-model="content.prices.trial"
                  type="text"
                  :class="input"
                  placeholder="например: бесплатно"
                />
              </div>
              <div>
                <label :class="labelClass" for="price-full">Абонемент, полная цена</label>
                <input
                  id="price-full"
                  v-model="content.prices.full"
                  type="text"
                  :class="input"
                  placeholder="например: 25 000 ₸ в месяц"
                />
              </div>
              <div>
                <label :class="labelClass" for="price-discount">Абонемент со скидкой</label>
                <input
                  id="price-discount"
                  v-model="content.prices.discounted"
                  type="text"
                  :class="input"
                  placeholder="например: 20 000 ₸ в месяц"
                />
              </div>
              <div>
                <label :class="labelClass" for="payment-day">День оплаты в месяце</label>
                <input
                  id="payment-day"
                  v-model="content.paymentDay"
                  type="text"
                  inputmode="numeric"
                  :class="input"
                  placeholder="например: 5"
                />
                <p class="mt-1.5 text-theme-xs text-gray-600 dark:text-gray-400">
                  В этот день бот напоминает об оплате; при неоплате повторяет через три дня.
                </p>
              </div>
              <div>
                <label :class="labelClass" for="kaspi">Kaspi-ссылка</label>
                <input
                  id="kaspi"
                  v-model="content.kaspiLink"
                  type="url"
                  :class="input"
                  placeholder="https://pay.kaspi.kz/..."
                />
                <p class="mt-1.5 text-theme-xs text-gray-600 dark:text-gray-400">
                  Ссылка статическая: интеграции с Kaspi API нет.
                </p>
              </div>
            </div>
          </section>

          <section :class="panel">
            <div class="border-b border-gray-200 px-5 py-4 dark:border-gray-800 sm:px-6">
              <h2 :class="panelTitle">Контакты</h2>
              <p :class="panelHint">Куда бот отправляет родителя, когда не справился сам.</p>
            </div>
            <div class="space-y-4 px-5 py-4 sm:px-6">
              <div>
                <label :class="labelClass" for="admin-phone">Номер администратора</label>
                <input
                  id="admin-phone"
                  v-model="content.adminPhone"
                  type="tel"
                  :class="input"
                  placeholder="+7 700 000 00 00"
                />
                <p class="mt-1.5 text-theme-xs text-gray-600 dark:text-gray-400">
                  Последний уровень фолбэка: бот даёт этот номер, если не понял вопрос дважды.
                </p>
              </div>
              <div>
                <label :class="labelClass" for="wa-number">WhatsApp-номер академии</label>
                <input
                  id="wa-number"
                  v-model="content.whatsappNumber"
                  type="tel"
                  :class="input"
                  placeholder="+7 700 000 00 00"
                />
              </div>
            </div>
          </section>
        </div>

        <!-- FAQ -->
        <section :class="panel">
          <div :class="panelHeader">
            <div>
              <h2 :class="panelTitle">Ответы FAQ</h2>
              <p :class="panelHint">
                Бот отвечает строго этими текстами — по-казахски или по-русски, в зависимости от
                языка родителя.
              </p>
            </div>
            <button type="button" :class="[buttonSecondary, buttonSize.sm]" @click="addTopic">
              <Plus class="h-3.5 w-3.5" aria-hidden="true" />
              Своя тема
            </button>
          </div>

          <ul class="divide-y divide-gray-200 dark:divide-gray-800">
            <li v-for="item in content.faq" :key="item.id" class="px-5 py-4 sm:px-6">
              <div class="mb-2.5 flex items-start justify-between gap-3">
                <div class="min-w-0 flex-1">
                  <input
                    v-if="!item.required"
                    v-model="item.topic"
                    type="text"
                    :class="input"
                    placeholder="Тема вопроса"
                    :aria-label="'Тема вопроса'"
                  />
                  <h3
                    v-else
                    class="text-theme-sm font-semibold text-gray-900 dark:text-white"
                  >
                    {{ item.topic }}
                  </h3>
                </div>
                <div class="flex shrink-0 items-center gap-2">
                  <StatusPill v-if="item.kz.trim() && item.ru.trim()" tone="pitch">
                    Готово
                  </StatusPill>
                  <StatusPill v-else-if="item.required" tone="warning">Нужен текст</StatusPill>
                  <button
                    v-if="!item.required"
                    type="button"
                    :class="[buttonGhost, buttonSize.sm]"
                    :aria-label="`Удалить тему ${item.topic || 'без названия'}`"
                    @click="removeTopic(item.id)"
                  >
                    <Trash2 class="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div class="grid gap-3 md:grid-cols-2">
                <div>
                  <label :class="labelClass" :for="`${item.id}-kz`">Қазақша</label>
                  <textarea
                    :id="`${item.id}-kz`"
                    v-model="item.kz"
                    rows="3"
                    :class="textarea"
                    placeholder="Ответ на казахском"
                  ></textarea>
                </div>
                <div>
                  <label :class="labelClass" :for="`${item.id}-ru`">Русский</label>
                  <textarea
                    :id="`${item.id}-ru`"
                    v-model="item.ru"
                    rows="3"
                    :class="textarea"
                    placeholder="Ответ на русском"
                  ></textarea>
                </div>
              </div>
            </li>
          </ul>

          <div class="flex flex-wrap justify-between gap-2 border-t border-gray-200 px-5 py-4 dark:border-gray-800 sm:px-6">
            <button type="button" :class="[buttonDanger, buttonSize.sm]" @click="reset">
              <RotateCcw class="h-3.5 w-3.5" aria-hidden="true" />
              Очистить всё
            </button>
            <button type="button" :class="[buttonPrimary, buttonSize.md]" :disabled="saving" @click="save">
              <LoaderCircle
                v-if="saving"
                class="h-4 w-4 animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
              <Save v-else class="h-4 w-4" aria-hidden="true" />
              Сохранить контент
            </button>
          </div>
        </section>
      </div>
    </template>
  </AdminLayout>
</template>
