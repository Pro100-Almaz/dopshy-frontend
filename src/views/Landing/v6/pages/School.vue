<script setup lang="ts">
import { Gift, Check } from 'lucide-vue-next'
import { useLang, money } from '../i18n'
import { to } from '../routes'
import { SCHOOL } from '../data/site'
import PageHero from '../components/PageHero.vue'
import Facts from '../components/Facts.vue'
import Section from '../components/Section.vue'
import Reveal from '../components/Reveal.vue'
import Picture from '../components/Picture.vue'
import PhotoGrid from '../components/PhotoGrid.vue'
import Reviews from '../components/Reviews.vue'
import InstaFeed from '../components/InstaFeed.vue'
import Enroll from '../components/Enroll.vue'

const { t, lang } = useLang()

const coaches = ['coach-1', 'coach-2', 'coach-3', 'coach-4']
const photos = [
  { name: 'school-drill', alt: 'Упражнение с мячом на тренировке', span: 'wide' },
  { name: 'school-kick', alt: 'Ученик ведёт мяч', span: 'tall' },
  { name: 'school-trio', alt: 'Трое учеников в форме DOPȘÝ' },
  { name: 'school-shot', alt: 'Удар по мячу' },
  { name: 'school-coach', alt: 'Тренер показывает упражнение детям', span: 'wide' },
  { name: 'school-ali', alt: 'Ученик в форме с номером 78' },
] as const
</script>

<template>
  <PageHero
    :kicker="t.school.kicker"
    :title="t.school.title"
    :lead="t.school.lead"
    image="school-drill"
    alt="Воспитанники футбольной школы DOPȘÝ"
  >
    <RouterLink
      :to="to('school', 'enroll')"
      class="inline-flex min-h-13 items-center rounded-full bg-acid px-7 font-semibold text-acid-ink hover:bg-acid-soft"
    >
      {{ t.school.enroll }}
    </RouterLink>
  </PageHero>
  <Facts
    :items="[
      { value: `${SCHOOL.ageFrom}–${SCHOOL.ageTo}`, label: t.school.facts.age },
      { value: '1', label: t.school.facts.base },
      { value: '🏆', label: t.school.facts.tournaments },
      { value: '4+', label: t.school.facts.coaches },
    ]"
  />

  <Section
    :kicker="t.school.coachesTitle"
    :title="t.school.coachesTitle"
    :lead="t.school.coachesLead"
  >
    <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Reveal v-for="(c, i) in coaches" :key="c" :delay="i * 0.06">
        <figure class="group overflow-hidden rounded-2xl border border-line bg-surface">
          <Picture
            :name="c"
            :alt="`${t.school.coachesTitle} DOPȘÝ`"
            sizes="(max-width: 1024px) 46vw, 23vw"
            class="aspect-[4/5] w-full object-cover transition-transform duration-700 group-hover:scale-105 motion-reduce:transition-none"
          />
        </figure>
      </Reveal>
    </div>
    <Reveal>
      <Picture
        name="coaches"
        alt="Тренерский состав школы вместе"
        sizes="(max-width: 1024px) 92vw, 80vw"
        class="mt-3 aspect-[3/2] w-full rounded-2xl border border-line object-cover sm:aspect-[21/9]"
      />
    </Reveal>
  </Section>

  <Section :kicker="t.common.photo" :title="t.school.gallery" tone="ink2">
    <PhotoGrid :close-label="t.checkout.close" :items="photos as any" />
  </Section>

  <Section id="enroll" :kicker="t.prices.kicker" :title="t.prices.schoolTitle">
    <Reveal>
      <div class="grid gap-4 md:grid-cols-3">
        <div class="rounded-[1.5rem] border border-line bg-surface p-7">
          <p class="text-fg-muted">{{ t.prices.trial }}</p>
          <p class="mt-2 font-display text-5xl text-acid">0 ₸</p>
        </div>
        <div class="rounded-[1.5rem] border border-line bg-surface p-7">
          <p class="text-fg-muted">{{ t.prices.schoolMonth }}</p>
          <p class="mt-2 font-display text-5xl text-fg">{{ money(SCHOOL.month, lang) }}</p>
        </div>
        <div class="relative rounded-[1.5rem] border-2 border-acid bg-acid/5 p-7">
          <p class="text-fg-muted">{{ t.prices.schoolThree }}</p>
          <p class="mt-2 font-display text-5xl text-fg">{{ money(SCHOOL.threeMonths, lang) }}</p>
          <p class="mt-3 flex items-center gap-2 text-sm text-acid">
            <Gift class="size-4" aria-hidden="true" />
            {{ t.prices.schoolGift }}
          </p>
        </div>
      </div>
      <div class="mt-6 flex flex-wrap items-center gap-4">
        <Enroll kind="school" />
        <span class="flex items-center gap-2 text-sm text-fg-muted">
          <Check class="size-4 text-acid" aria-hidden="true" />
          {{ SCHOOL.ageFrom }}–{{ SCHOOL.ageTo }} {{ t.enroll.years }}
        </span>
      </div>
    </Reveal>
  </Section>

  <Reviews division="school" tone="ink2" />
  <InstaFeed only="school" tone="ink" />
</template>
