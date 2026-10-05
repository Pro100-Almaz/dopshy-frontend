<script setup lang="ts">
import { Phone } from 'lucide-vue-next'
import { useLang } from '../i18n'
import { to } from '../routes'
import { CONTACTS } from '../data/site'
import PageHero from '../components/PageHero.vue'
import Facts from '../components/Facts.vue'
import Section from '../components/Section.vue'
import PhotoGrid from '../components/PhotoGrid.vue'
import Reviews from '../components/Reviews.vue'
import InstaFeed from '../components/InstaFeed.vue'
import Enroll from '../components/Enroll.vue'
import Reveal from '../components/Reveal.vue'

const { t } = useLang()

const photos = [
  { name: 'box-gym', alt: 'Зал с грушами и постерами чемпионов', span: 'wide' },
  { name: 'box-bag', alt: 'Боксёрская груша BOXY', span: 'tall' },
  { name: 'box-ring-2', alt: 'Угол ринга' },
  { name: 'box-belt', alt: 'Чемпионский пояс на стене' },
  { name: 'box-flags', alt: 'Флаги Казахстана и Кубы в зале', span: 'wide' },
  { name: 'box-ring', alt: 'Ринг академии' },
] as const
</script>

<template>
  <div class="theme-boxy">
    <PageHero
      :kicker="t.boxing.kicker"
      :title="t.boxing.title"
      :lead="t.boxing.lead"
      image="box-ring"
      alt="Ринг BOXY ACADEMY"
      accent="boxy"
    >
      <div class="flex flex-wrap gap-3">
        <RouterLink
          :to="to('boxing', 'enroll')"
          class="inline-flex min-h-13 items-center rounded-full bg-boxy px-7 font-semibold text-white hover:brightness-110"
        >
          {{ t.boxing.enroll }}
        </RouterLink>
        <a
          :href="CONTACTS.phoneHref"
          class="inline-flex min-h-13 items-center gap-2 rounded-full border border-line-2 px-7 font-semibold text-fg hover:border-fg-dim"
        >
          <Phone class="size-4" aria-hidden="true" />
          +7 700 555 6000
        </a>
      </div>
    </PageHero>
    <Facts
      accent="boxy"
      :items="[
        { value: t.boxing.ageKids, label: t.boxing.facts.kids },
        { value: t.boxing.ageAdults, label: t.boxing.facts.adults },
        { value: t.boxing.formatValue, label: t.boxing.facts.format },
        { value: t.boxing.coachValue, label: t.boxing.facts.coach },
      ]"
    />
    <Section :kicker="t.common.photo" :title="t.boxing.hall">
      <PhotoGrid :close-label="t.checkout.close" :items="photos as any" />
    </Section>
    <Section id="enroll" tone="ink2">
      <Reveal>
        <div
          class="flex flex-col items-start gap-6 rounded-[2rem] border border-boxy/40 bg-boxy/10 p-8 sm:p-12 lg:flex-row lg:items-center lg:justify-between"
        >
          <div>
            <h2 class="font-display text-[clamp(2.2rem,5vw,3.6rem)] text-fg">
              {{ t.prices.trial }}
            </h2>
            <p class="measure mt-3 text-fg-muted">{{ t.prices.boxingText }}</p>
          </div>
          <Enroll kind="boxing" />
        </div>
      </Reveal>
    </Section>
    <Reviews division="boxing" />
    <InstaFeed only="boxing" tone="ink2" />
  </div>
</template>
