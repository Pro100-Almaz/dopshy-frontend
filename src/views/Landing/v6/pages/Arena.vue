<script setup lang="ts">
import { useLang, fmt } from '../i18n'
import { BOOKING_PATH, to } from '../routes'
import { FIELDS } from '../data/site'
import PageHero from '../components/PageHero.vue'
import Conditions from '../components/Conditions.vue'
import Prices from '../components/Prices.vue'
import Reviews from '../components/Reviews.vue'
import InstaFeed from '../components/InstaFeed.vue'
import Section from '../components/Section.vue'
import Picture from '../components/Picture.vue'
import Reveal from '../components/Reveal.vue'
import PhotoGrid from '../components/PhotoGrid.vue'
import Marquee from '../components/Marquee.vue'

const { t } = useLang()

const photos = [
  { name: 'hall-main', alt: 'Главный зал под куполом', span: 'wide' },
  { name: 'hall-line', alt: 'Разметка газона крупным планом', span: 'tall' },
  { name: 'hall-glass', alt: 'Зал со стеклянным торцом' },
  { name: 'hall-balcony', alt: 'Зал с балконом и раздевалками' },
  { name: 'hall-wall', alt: 'Стена с логотипом DOPȘÝ', span: 'wide' },
  { name: 'hall-goal', alt: 'Ворота и штрафная площадь' },
] as const
</script>

<template>
  <PageHero
    :kicker="t.arena.kicker"
    :title="t.arena.title"
    :lead="t.arena.lead"
    image="hall-main"
    alt="Главный зал DOPȘÝ ARENA"
  >
    <div class="flex flex-wrap gap-3">
      <RouterLink
        :to="BOOKING_PATH"
        class="inline-flex min-h-13 items-center rounded-full bg-acid px-7 font-semibold text-acid-ink hover:bg-acid-soft"
      >
        {{ t.nav.book }}
      </RouterLink>
      <RouterLink
        :to="to('arena', 'prices')"
        class="inline-flex min-h-13 items-center rounded-full border border-line-2 px-7 font-semibold text-fg hover:border-fg-dim"
      >
        {{ t.prices.title }}
      </RouterLink>
    </div>
  </PageHero>
  <Marquee tone="dark" />

  <Conditions tone="ink" />
  <Prices variant="arena" tone="ink2" />
  <Section id="booking" :kicker="t.booking.kicker" :title="t.booking.title">
    <div class="grid gap-4 md:grid-cols-3">
      <Reveal v-for="(f, i) in FIELDS" :key="f.id" :delay="i * 0.06">
        <article class="overflow-hidden rounded-2xl border border-line bg-surface">
          <Picture
            :name="f.image"
            :alt="`${t.booking.field} ${f.n}`"
            sizes="(max-width: 767px) 92vw, 30vw"
            class="aspect-[4/3] w-full object-cover"
          />
          <div class="p-5">
            <h3 class="font-display text-2xl text-fg">{{ t.booking.field }} {{ f.n }}</h3>
            <p class="mt-1 text-fg-muted">
              {{ f.format }} · {{ fmt(t.booking.players, { n: f.players }) }}
            </p>
          </div>
        </article>
      </Reveal>
    </div>
    <div class="mt-8">
      <RouterLink :to="BOOKING_PATH" class="v6-button v6-button--primary">
        {{ t.nav.book }}
      </RouterLink>
    </div>
  </Section>
  <Section :kicker="t.common.photo" :title="t.arena.fields" tone="ink2">
    <PhotoGrid :close-label="t.checkout.close" :items="photos as any" />
  </Section>
  <Reviews division="arena" />
  <InstaFeed only="arena" tone="ink2" />
</template>
