<script setup lang="ts">
import { useLang } from '../i18n'
import { BOOKING_PATH, to } from '../routes'
import PageHero from '../components/PageHero.vue'
import Conditions from '../components/Conditions.vue'
import Prices from '../components/Prices.vue'
import Reviews from '../components/Reviews.vue'
import InstaFeed from '../components/InstaFeed.vue'
import Section from '../components/Section.vue'
import PhotoGrid from '../components/PhotoGrid.vue'
import Marquee from '../components/Marquee.vue'
import Booking from '../components/Booking.vue'

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
  <Booking />
  <Section :kicker="t.common.photo" :title="t.arena.fields" tone="ink2">
    <PhotoGrid :close-label="t.checkout.close" :items="photos as any" />
  </Section>
  <Reviews division="arena" />
  <InstaFeed only="arena" tone="ink2" />
</template>
