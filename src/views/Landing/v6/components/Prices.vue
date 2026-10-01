<script setup lang="ts">
import type { Component } from 'vue'
import { Flame, Gift, Moon, Phone, Sun, Sunset } from 'lucide-vue-next'
import { money, useLang } from '../i18n'
import { BOOKING_PATH, to } from '../routes'
import { CONTACTS, SCHOOL, ZONE_HOURS, ZONE_ORDER, ZONE_PRICE, type Zone } from '../data/site'
import Section from './Section.vue'
import Reveal from './Reveal.vue'

const ZICON: Record<Zone, Component> = { night: Moon, day: Sun, prime: Flame, evening: Sunset }

withDefaults(defineProps<{ variant?: 'arena' | 'all'; tone?: 'ink' | 'ink2' }>(), {
  variant: 'all',
  tone: 'ink2',
})

const { t, lang } = useLang()
const max = Math.max(...Object.values(ZONE_PRICE))
</script>

<template>
  <Section id="prices" :kicker="t.prices.kicker" :title="t.prices.title" :tone="tone">
    <div :class="variant === 'all' ? 'grid gap-5 lg:grid-cols-[1.4fr_1fr]' : ''">
      <Reveal>
        <div class="rounded-[1.75rem] border border-line bg-surface p-6 sm:p-8">
          <div class="flex flex-wrap items-baseline justify-between gap-3">
            <h3 class="font-display text-3xl text-fg">{{ t.prices.arenaTitle }}</h3>
            <RouterLink
              v-if="variant === 'all'"
              :to="BOOKING_PATH"
              class="inline-flex min-h-11 items-center rounded-full bg-acid px-5 text-sm font-semibold text-acid-ink hover:bg-acid-soft"
            >
              {{ t.prices.book }}
            </RouterLink>
          </div>

          <div class="mt-6 flex h-3 overflow-hidden rounded-full" aria-hidden="true">
            <span class="bg-fg-dim/50" :style="{ flex: 7 }" />
            <span class="bg-acid/60" :style="{ flex: 12 }" />
            <span class="bg-prime" :style="{ flex: 3 }" />
            <span class="bg-acid/35" :style="{ flex: 2 }" />
          </div>
          <div
            class="mt-1.5 flex justify-between text-[0.7rem] tabular-nums text-fg-dim"
            aria-hidden="true"
          >
            <span>00</span>
            <span>07</span>
            <span>19</span>
            <span>22</span>
            <span>24</span>
          </div>
          <ul
            :class="[
              'mt-6 grid gap-3',
              variant === 'arena' ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-2',
            ]"
          >
            <li
              v-for="z in ZONE_ORDER"
              :key="z"
              :class="[
                'relative flex flex-col gap-4 rounded-2xl border p-5',
                z === 'prime' ? 'border-prime/40 bg-prime/10' : 'border-line bg-surface-2/60',
              ]"
            >
              <div class="flex items-center justify-between">
                <span class="flex items-center gap-2 font-semibold text-fg">
                  <component
                    :is="ZICON[z]"
                    :class="['size-4.5', z === 'prime' ? 'text-prime' : 'text-acid']"
                    aria-hidden="true"
                  />
                  {{ t.prices.zones[z] }}
                </span>
                <span
                  :class="['text-xs tabular-nums', z === 'prime' ? 'text-fg-muted' : 'text-fg-dim']"
                >
                  {{ ZONE_HOURS[z] }}
                </span>
              </div>
              <p>
                <span class="font-display text-4xl text-fg tabular-nums">
                  {{ money(ZONE_PRICE[z], lang) }}
                </span>
                <span :class="['text-sm', z === 'prime' ? 'text-fg-muted' : 'text-fg-dim']">
                  {{ t.prices.perHour }}
                </span>
              </p>
              <span class="h-1 rounded-full bg-line" aria-hidden="true">
                <span
                  :class="['block h-full rounded-full', z === 'prime' ? 'bg-prime' : 'bg-acid']"
                  :style="{ width: `${(ZONE_PRICE[z] / max) * 100}%` }"
                />
              </span>
              <span v-if="z === 'prime'" class="text-xs font-medium text-prime">
                {{ t.prices.primeNote }}
              </span>
            </li>
          </ul>
        </div>
      </Reveal>

      <div v-if="variant === 'all'" class="grid gap-5">
        <Reveal :delay="0.08">
          <div class="h-full rounded-[1.75rem] border border-line bg-surface p-6 sm:p-8">
            <h3 class="font-display text-3xl text-fg">{{ t.prices.schoolTitle }}</h3>
            <dl class="mt-5 space-y-4">
              <div class="flex items-baseline justify-between gap-4 border-b border-line pb-4">
                <dt class="text-fg-muted">{{ t.prices.schoolMonth }}</dt>
                <dd class="font-display text-3xl text-fg tabular-nums">
                  {{ money(SCHOOL.month, lang) }}
                </dd>
              </div>
              <div class="flex items-baseline justify-between gap-4 border-b border-line pb-4">
                <dt class="text-fg-muted">
                  {{ t.prices.schoolThree }}
                  <span class="mt-1 flex items-center gap-1.5 text-xs text-acid">
                    <Gift class="size-3.5" aria-hidden="true" />
                    {{ t.prices.schoolGift }}
                  </span>
                </dt>
                <dd class="font-display text-3xl text-fg tabular-nums">
                  {{ money(SCHOOL.threeMonths, lang) }}
                </dd>
              </div>
            </dl>
            <RouterLink
              :to="to('school', 'enroll')"
              class="mt-5 inline-flex min-h-11 items-center rounded-full border border-line-2 px-5 text-sm font-semibold text-fg hover:border-fg-dim"
            >
              {{ t.prices.trial }} →
            </RouterLink>
          </div>
        </Reveal>
        <Reveal :delay="0.14">
          <div class="h-full rounded-[1.75rem] border border-boxy/40 bg-boxy/10 p-6 sm:p-8">
            <h3 class="font-display text-3xl text-fg">{{ t.prices.boxingTitle }}</h3>
            <p class="mt-3 text-sm text-fg-muted">{{ t.prices.boxingText }}</p>
            <a
              :href="CONTACTS.phoneHref"
              class="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-boxy px-5 text-sm font-semibold text-white hover:brightness-110"
            >
              <Phone class="size-4" aria-hidden="true" /> {{ t.prices.call }}
            </a>
          </div>
        </Reveal>
      </div>
    </div>
  </Section>
</template>
