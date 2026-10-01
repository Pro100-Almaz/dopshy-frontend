<script setup lang="ts">
import { computed, ref } from 'vue'
import { BadgeCheck, ExternalLink, Quote, Star } from 'lucide-vue-next'
import { fmt, num, useLang } from '../i18n'
import { CONTACTS, RATING, REVIEWS, type Division } from '../data/site'
import Section from './Section.vue'
import Reveal from './Reveal.vue'

type Filter = 'all' | Division

const props = withDefaults(
  defineProps<{ division?: Division; tone?: 'ink' | 'ink2'; preview?: boolean }>(),
  { tone: 'ink', preview: false },
)

const { t, lang } = useLang()
const filter = ref<Filter>(props.division ?? 'all')
const expanded = ref(false)

const list = computed(() =>
  REVIEWS.filter((x) => filter.value === 'all' || x.division === filter.value),
)
const visible = computed(() =>
  !props.preview || expanded.value
    ? list.value
    : filter.value === 'all'
      ? (['arena', 'school', 'boxing'] as const).flatMap((d) =>
          list.value.filter((x) => x.division === d).slice(0, 1),
        )
      : list.value.slice(0, 3),
)
const locale = computed(() => (lang.value === 'kk' ? 'kk-KZ' : 'ru-RU'))
const date = (d: string) =>
  new Date(d).toLocaleDateString(locale.value, { day: 'numeric', month: 'long', year: 'numeric' })
const pick = (f: Filter) => {
  filter.value = f
  expanded.value = false
}
</script>

<template>
  <Section id="reviews" :kicker="t.reviews.kicker" :title="t.reviews.title" :tone="tone">
    <template #action>
      <a
        :href="CONTACTS.twogisReviews"
        target="_blank"
        rel="noopener noreferrer"
        class="flex items-center gap-4 rounded-2xl border border-line bg-surface px-5 py-4 transition-colors hover:border-line-2"
      >
        <span class="font-display text-5xl text-fg">{{ RATING.score }}</span>
        <span class="text-sm">
          <span class="flex gap-0.5 text-prime" aria-hidden="true">
            <Star v-for="i in 5" :key="i" class="size-4 fill-current" />
          </span>
          <span class="mt-1 block text-fg-muted">
            {{ fmt(t.reviews.ratings, { n: num(RATING.ratings, lang) }) }} ·
            {{ fmt(t.reviews.reviews, { n: num(RATING.reviews, lang) }) }}
          </span>
          <span class="mt-0.5 flex items-center gap-1 font-semibold text-acid">
            {{ t.reviews.all }} <ExternalLink class="size-3.5" aria-hidden="true" />
          </span>
        </span>
      </a>
    </template>

    <div
      v-if="!division"
      role="tablist"
      :aria-label="t.reviews.title"
      class="mb-8 flex flex-wrap gap-2"
    >
      <button
        v-for="f in ['all', 'arena', 'school', 'boxing'] as Filter[]"
        :key="f"
        role="tab"
        type="button"
        :aria-selected="filter === f"
        :class="[
          'min-h-11 rounded-full border px-5 text-sm font-semibold transition-colors',
          filter === f ? 'border-fg bg-fg text-ink' : 'border-line-2 text-fg-muted hover:text-fg',
        ]"
        @click="pick(f)"
      >
        {{ t.reviews.tabs[f] }}
      </button>
    </div>

    <TransitionGroup
      tag="ul"
      class="columns-1 gap-5 sm:columns-2 lg:columns-3"
      enter-from-class="opacity-0 translate-y-3"
      leave-to-class="opacity-0"
      enter-active-class="transition duration-300 motion-reduce:transition-none"
      leave-active-class="transition duration-150 motion-reduce:transition-none"
    >
      <li v-for="item in visible" :key="item.id" class="mb-5 break-inside-avoid">
        <figure class="rounded-2xl border border-line bg-surface p-6">
          <div class="flex items-center justify-between">
            <span class="flex gap-0.5 text-prime" role="img" aria-label="5/5">
              <Star v-for="i in 5" :key="i" class="size-3.5 fill-current" aria-hidden="true" />
            </span>
            <Quote class="size-5 text-acid/40" aria-hidden="true" />
          </div>
          <blockquote :lang="item.lang" class="mt-4 text-[0.95rem] leading-relaxed text-fg">
            «{{ item.text }}»
          </blockquote>
          <figcaption class="mt-5 flex items-center gap-3 border-t border-line pt-4">
            <span
              class="flex size-10 items-center justify-center rounded-full bg-acid/15 font-semibold text-acid"
              aria-hidden="true"
            >
              {{ item.author.trim()[0]?.toUpperCase() }}
            </span>
            <span class="min-w-0 text-sm">
              <span class="block truncate font-semibold text-fg">{{ item.author }}</span>
              <span class="flex flex-wrap items-center gap-x-2 text-xs text-fg-dim">
                {{ date(item.date) }}
                <span class="inline-flex items-center gap-1 text-acid">
                  <BadgeCheck class="size-3.5" aria-hidden="true" />
                  {{ t.reviews.verified }}
                </span>
                <span v-if="item.visits">· {{ fmt(t.reviews.visits, { n: item.visits }) }}</span>
              </span>
            </span>
          </figcaption>
        </figure>
      </li>
    </TransitionGroup>
    <button
      v-if="preview && list.length > 3"
      type="button"
      class="v6-more-reviews"
      :aria-expanded="expanded"
      @click="expanded = !expanded"
    >
      {{
        expanded
          ? lang === 'kk'
            ? 'Жасыру'
            : 'Свернуть'
          : lang === 'kk'
            ? 'Тағы пікірлер'
            : 'Ещё отзывы'
      }}
      <span aria-hidden="true">{{ expanded ? '−' : `+${list.length - 3}` }}</span>
    </button>
    <Reveal>
      <p class="mt-2 text-xs text-fg-dim">{{ t.reviews.note }} 2ГИС, 2025–2026.</p>
    </Reveal>
  </Section>
</template>
