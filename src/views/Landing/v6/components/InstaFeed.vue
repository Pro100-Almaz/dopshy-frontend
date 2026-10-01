<script setup lang="ts">
import { computed } from 'vue'
import { ArrowUpRight, Play } from 'lucide-vue-next'
import InstagramIcon from './InstagramIcon.vue'
import { num, useLang } from '../i18n'
import { INSTAGRAM, type Division } from '../data/site'
import images from '../data/images.json'
import { ASSETS } from '../routes'
import Section from './Section.vue'
import Reveal from './Reveal.vue'

const props = withDefaults(defineProps<{ only?: Division; tone?: 'ink' | 'ink2' }>(), {
  tone: 'ink2',
})

const counts = images as unknown as Record<string, { count?: number }>
const { t, lang } = useLang()

const accounts = computed(() =>
  (props.only ? [props.only] : (['arena', 'school', 'boxing'] as Division[])).map((d) => {
    const acc = INSTAGRAM[d]
    const limit = props.only ? 6 : 3
    return { d, acc, n: Math.min(counts[`ig-${acc.key}`]?.count ?? 0, limit) }
  }),
)
</script>

<template>
  <Section id="instagram" :kicker="t.insta.kicker" :title="t.insta.title" :tone="tone">
    <div :class="only ? 'max-w-xl' : 'grid gap-5 lg:grid-cols-3'">
      <Reveal v-for="({ d, acc, n }, i) in accounts" :key="d" :delay="i * 0.08">
        <div class="rounded-[1.75rem] border border-line bg-surface p-5 sm:p-6">
          <a
            :href="acc.url"
            target="_blank"
            rel="noopener noreferrer"
            class="group flex items-center gap-4"
          >
            <span class="rounded-full bg-linear-to-tr from-prime via-boxy to-acid p-[2px]">
              <img
                :src="`${ASSETS}img/ig/${acc.avatar}.webp`"
                alt=""
                width="56"
                height="56"
                loading="lazy"
                class="size-14 rounded-full border-2 border-surface object-cover"
              />
            </span>
            <span class="min-w-0 flex-1">
              <span class="flex items-center gap-1.5 font-semibold text-fg">
                @{{ acc.handle }}
                <ArrowUpRight
                  class="size-4 text-fg-dim transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  aria-hidden="true"
                />
              </span>
              <span class="block text-sm text-fg-muted">{{ t.insta.names[d] }}</span>
              <span class="block text-xs text-fg-dim">
                {{ num(acc.followers, lang) }} {{ t.insta.followers }} · {{ num(acc.posts, lang) }}
                {{ t.insta.posts }}
              </span>
            </span>
          </a>
          <ul class="mt-5 grid grid-cols-3 gap-1.5">
            <li v-for="j in n" :key="j">
              <a
                :href="acc.postLinks[j - 1] ?? acc.url"
                target="_blank"
                rel="noopener noreferrer"
                :aria-label="`@${acc.handle} — ${t.common.photo} ${j}`"
                class="group relative block aspect-[4/5] overflow-hidden rounded-lg bg-surface-2"
              >
                <img
                  :src="`${ASSETS}img/ig/${acc.key}-${j - 1}.webp`"
                  alt=""
                  loading="lazy"
                  class="size-full object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none"
                />
                <Play
                  v-if="acc.postLinks[j - 1]?.includes('/reel/')"
                  class="absolute top-2 right-2 size-4 fill-white text-white drop-shadow"
                  aria-hidden="true"
                />
              </a>
            </li>
          </ul>
          <a
            :href="acc.url"
            target="_blank"
            rel="noopener noreferrer"
            class="mt-4 flex min-h-11 items-center justify-center gap-2 rounded-full border border-line-2 text-sm font-semibold text-fg transition-colors hover:border-fg-dim"
          >
            <InstagramIcon class="size-4" aria-hidden="true" /> {{ t.insta.follow }}
          </a>
        </div>
      </Reveal>
    </div>
  </Section>
</template>
