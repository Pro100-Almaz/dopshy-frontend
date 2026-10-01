<script setup lang="ts">
import { computed } from 'vue'
import { MapPin, Clock, Phone, Mail, Navigation, Dumbbell } from 'lucide-vue-next'
import InstagramIcon from '../components/InstagramIcon.vue'
import { useLang } from '../i18n'
import { CONTACTS, INSTAGRAM } from '../data/site'
import PageHero from '../components/PageHero.vue'
import Section from '../components/Section.vue'
import MapBlock from '../components/MapBlock.vue'
import Reveal from '../components/Reveal.vue'

const { t } = useLang()

const rows = computed(() => {
  const c = t.value.contacts
  return [
    { icon: MapPin, label: c.address, value: c.addressValue, href: CONTACTS.twogis },
    { icon: Clock, label: c.hours, value: c.hoursValue },
    { icon: Phone, label: c.phone, value: CONTACTS.phone, href: CONTACTS.phoneHref },
    { icon: Mail, label: c.email, value: CONTACTS.email, href: CONTACTS.emailHref },
    { icon: Dumbbell, label: 'BOXY ACADEMY', value: c.boxingFloor },
  ] as { icon: typeof MapPin; label: string; value: string; href?: string }[]
})
</script>

<template>
  <PageHero
    :kicker="t.contacts.kicker"
    :title="t.contacts.title"
    :lead="t.contacts.addressValue"
    image="facade"
    alt="Фасад DOPȘÝ ARENA — FUTBOL MEKTEBI и BOXY ACADEMY"
  />
  <Section>
    <div class="grid gap-5 lg:grid-cols-[1fr_24rem]">
      <Reveal>
        <MapBlock class="h-[32rem]" />
      </Reveal>
      <Reveal :delay="0.08">
        <div class="flex h-full flex-col gap-3">
          <ul class="divide-y divide-line rounded-2xl border border-line bg-surface">
            <li v-for="r in rows" :key="r.label">
              <component
                :is="r.href ? 'a' : 'div'"
                :href="r.href"
                :target="r.href?.startsWith('http') ? '_blank' : undefined"
                :rel="r.href ? 'noopener noreferrer' : undefined"
                :class="['flex min-h-18 items-center gap-4 px-5', r.href && 'hover:bg-surface-2']"
              >
                <component :is="r.icon" class="size-5 shrink-0 text-acid" aria-hidden="true" />
                <span>
                  <span class="block text-xs text-fg-dim">{{ r.label }}</span>
                  <span class="font-semibold text-fg">{{ r.value }}</span>
                </span>
              </component>
            </li>
          </ul>
          <a
            :href="CONTACTS.twogis"
            target="_blank"
            rel="noopener noreferrer"
            class="flex min-h-14 items-center justify-center gap-2 rounded-full bg-acid font-semibold text-acid-ink hover:bg-acid-soft"
          >
            <Navigation class="size-5" aria-hidden="true" />
            {{ t.contacts.route }}
          </a>
          <ul class="grid gap-2">
            <li v-for="d in ['arena', 'school', 'boxing'] as const" :key="d">
              <a
                :href="INSTAGRAM[d].url"
                target="_blank"
                rel="noopener noreferrer"
                class="flex min-h-13 items-center gap-3 rounded-full border border-line-2 px-5 text-sm text-fg hover:border-fg-dim"
              >
                <InstagramIcon class="size-4 text-acid" aria-hidden="true" />@{{ INSTAGRAM[d].handle }}
                <span class="ml-auto text-fg-dim">{{ t.insta.names[d] }}</span>
              </a>
            </li>
          </ul>
        </div>
      </Reveal>
    </div>
  </Section>
</template>
