<script setup lang="ts">
import { useLang } from '../i18n'
import Section from './Section.vue'
import Reveal from './Reveal.vue'
import Picture from './Picture.vue'
import ConditionItem, { type Key } from './ConditionItem.vue'

withDefaults(defineProps<{ tone?: 'ink' | 'ink2' }>(), { tone: 'ink' })

const { t } = useLang()
</script>

<template>
  <Section id="conditions" :kicker="t.conditions.kicker" :title="t.conditions.title" :tone="tone">
    <div class="grid gap-4 lg:grid-cols-12">
      <Reveal class="lg:col-span-5">
        <figure
          class="relative h-full min-h-96 overflow-hidden rounded-[1.75rem] border border-line"
        >
          <Picture
            name="hall-goal"
            alt="Ворота и разметка на газоне арены"
            sizes="(max-width: 1024px) 92vw, 40vw"
            class="absolute inset-0 size-full object-cover"
          />
          <div
            aria-hidden="true"
            class="absolute inset-0 bg-linear-to-t from-ink/90 via-ink/20 to-transparent"
          />
          <figcaption class="absolute inset-x-0 bottom-0 p-4 sm:p-6">
            <ConditionItem k="turf" />
          </figcaption>
        </figure>
      </Reveal>

      <div class="grid gap-4 lg:col-span-7">
        <div class="grid gap-4 sm:grid-cols-3">
          <Reveal v-for="(k, i) in ['light', 'heat', 'open'] as Key[]" :key="k" :delay="0.05 * i">
            <ConditionItem :k="k" />
          </Reveal>
        </div>
        <div class="grid gap-4 sm:grid-cols-2">
          <Reveal>
            <figure class="h-full overflow-hidden rounded-2xl border border-line bg-surface">
              <Picture
                name="locker"
                alt="Раздевалка: деревянные скамьи, вешалки и душевые"
                sizes="(max-width: 640px) 92vw, 28vw"
                class="aspect-[4/3] w-full object-cover"
              />
              <figcaption class="p-2">
                <ConditionItem k="lockers" />
              </figcaption>
            </figure>
          </Reveal>
          <div class="grid gap-4">
            <Reveal :delay="0.05"><ConditionItem k="store" /></Reveal>
            <Reveal :delay="0.1"><ConditionItem k="parking" /></Reveal>
            <Reveal :delay="0.15">
              <div class="grid grid-cols-2 gap-4">
                <Picture
                  name="dryer"
                  alt="Фен в раздевалке"
                  sizes="200px"
                  class="aspect-square w-full rounded-2xl border border-line object-cover"
                />
                <Picture
                  name="shower"
                  alt="Душевая кабина"
                  sizes="200px"
                  class="aspect-square w-full rounded-2xl border border-line object-cover"
                />
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </div>
  </Section>
</template>
