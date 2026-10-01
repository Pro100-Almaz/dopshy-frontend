<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  Clock,
  Coffee,
  Flame,
  Lightbulb,
  MapPin,
  ParkingSquare,
  Phone,
  ShowerHead,
  Sprout,
} from 'lucide-vue-next'
import { useLang, money } from '../i18n'
import { BOOKING_PATH, to } from '../routes'
import { CONTACTS, SCHOOL, ZONE_HOURS, ZONE_ORDER, ZONE_PRICE } from '../data/site'
import HeroPicture from '../components/HeroPicture.vue'
import RotatingWord from '../components/RotatingWord.vue'
import Picture from '../components/Picture.vue'
import Section from '../components/Section.vue'
import Reviews from '../components/Reviews.vue'
import InstaFeed from '../components/InstaFeed.vue'
import MapBlock from '../components/MapBlock.vue'

const COPY = {
  ru: {
    address: 'Астана · Сыганак, 6ф',
    lead: 'Аренда поля, футбольная школа и бокс.\nТри направления — одна арена в Астане.',
    conditions: 'Посмотреть условия',
    directions: 'Выберите своё направление',
    underRoof: 'Всё в одном месте',
    details: 'Подробнее',
    tags: ['5×5 / 6×6 · 24/7', 'Дети 5–15 лет', 'Дети и взрослые'],
    photos: ['Футбольное поле', 'Раздевалки', 'Душевые'],
    photoNote: 'Фотографии нашей арены',
    pricing: 'Тарифы и занятия',
    pricingNote: 'Выберите формат, затем удобное время.',
    trial: 'Первое занятие',
    free: 'Бесплатно',
    group: 'В группе',
    personal: 'Индивидуально',
    boxingNote: 'Стоимость зависит от формата занятий. Уточните у администратора.',
    book: 'Выбрать время',
    enroll: 'Посмотреть занятия',
    map: 'До встречи на арене',
    route: 'Как добраться',
  },
  kk: {
    address: 'Астана · Сығанақ, 6ф',
    lead: 'Алаң жалдау, футбол мектебі және бокс.\nҮш бағыт — Астанадағы бір аренада.',
    conditions: 'Жағдайларды көру',
    directions: 'Өз бағытыңызды таңдаңыз',
    underRoof: 'Барлығы бір жерде',
    details: 'Толығырақ',
    tags: ['5×5 / 6×6 · 24/7', '5–15 жастағы балалар', 'Балалар мен ересектер'],
    photos: ['Футбол алаңы', 'Киім ауыстыру бөлмелері', 'Душ бөлмелері'],
    photoNote: 'Аренамыздың фотосуреттері',
    pricing: 'Тарифтер мен сабақтар',
    pricingNote: 'Алдымен форматты, содан кейін ыңғайлы уақытты таңдаңыз.',
    trial: 'Алғашқы сабақ',
    free: 'Тегін',
    group: 'Топпен',
    personal: 'Жеке',
    boxingNote: 'Бағасы сабақ форматына байланысты. Әкімшіден нақтылаңыз.',
    book: 'Уақыт таңдау',
    enroll: 'Сабақтарды көру',
    map: 'Аренада кездескенше',
    route: 'Қалай жетуге болады',
  },
}

const DIVISIONS = [
  { key: 'arena', image: 'hall-main' },
  { key: 'school', image: 'school-trio' },
  { key: 'boxing', image: 'box-ring' },
] as const

const FEATURES = [
  { key: 'turf', icon: Sprout },
  { key: 'light', icon: Lightbulb },
  { key: 'heat', icon: Flame },
  { key: 'lockers', icon: ShowerHead },
  { key: 'store', icon: Coffee },
  { key: 'parking', icon: ParkingSquare },
] as const

const PHOTOS = ['hall-goal', 'locker', 'shower'] as const

const { t, lang } = useLang()
const c = computed(() => COPY[lang.value])
const photo = ref(0)
</script>

<template>
  <div class="v6-home">
    <section class="v6-hero" aria-labelledby="v6-title">
      <div class="v6-hero__photo">
        <HeroPicture />
      </div>
      <div class="v6-hero__shade" aria-hidden="true" />
      <div class="v6-wrap v6-hero__inner">
        <div class="v6-hero__copy">
          <div class="v6-eyebrow">
            <span class="v6-live-dot" aria-hidden="true" />
            DOPȘÝ ARENA<span class="v6-eyebrow__separator">/</span>ASTANA
          </div>
          <h1 id="v6-title" :key="lang" class="v6-hero__title font-display">
            <span class="sr-only">
              {{ [t.hero.before, t.hero.words[0], t.hero.after].filter(Boolean).join(' ') }}
            </span>
            <span aria-hidden="true">
              <span v-if="t.hero.before" class="block">{{ t.hero.before }}</span>
              <RotatingWord :words="t.hero.words" />
              <span v-if="t.hero.after" class="block">{{ t.hero.after }}</span>
            </span>
          </h1>
          <p class="v6-hero__lead">{{ c.lead }}</p>
          <div class="v6-hero__actions">
            <RouterLink :to="to('home', 'directions')" class="v6-button v6-button--primary">
              {{ t.hero.ctaMore }}
              <ArrowDown :size="16" aria-hidden="true" />
            </RouterLink>
            <RouterLink :to="to('home', 'conditions')" class="v6-text-link">
              {{ c.conditions }}
              <ArrowRight :size="16" aria-hidden="true" />
            </RouterLink>
          </div>
        </div>
      </div>
      <div class="v6-hero__bottom">
        <div class="v6-wrap v6-hero__facts">
          <RouterLink :to="to('contacts')">
            <MapPin :size="15" aria-hidden="true" />
            {{ c.address }}
            <ArrowUpRight :size="14" aria-hidden="true" />
          </RouterLink>
          <span>
            <Clock :size="15" aria-hidden="true" />
            24/7 <span class="v6-fact-detail">· {{ t.hero.sticker247 }}</span>
          </span>
          <span class="v6-fact-formats">
            3 {{ t.hero.stickerFields }}
            <i aria-hidden="true" />
            5×5 / 6×6
          </span>
        </div>
      </div>
    </section>

    <section
      id="directions"
      class="v6-directions v6-wrap"
      aria-labelledby="v6-directions-title"
    >
      <div class="v6-section-heading">
        <h2 id="v6-directions-title" class="font-display">{{ c.directions }}</h2>
        <span>{{ c.underRoof }}</span>
      </div>
      <div class="v6-directions__grid">
        <RouterLink
          v-for="({ key, image }, i) in DIVISIONS"
          :key="key"
          :to="to(key)"
          :class="`v6-direction v6-direction--${key}`"
        >
          <Picture
            :name="image"
            :alt="t.directions[key].title"
            sizes="(max-width: 767px) 92vw, 32vw"
            class="v6-direction__photo"
            priority
          />
          <span class="v6-direction__shade" aria-hidden="true" />
          <span class="v6-direction__top">
            <span class="v6-direction__tag">{{ c.tags[i] }}</span>
            <span class="v6-direction__number">0{{ i + 1 }}</span>
          </span>
          <span class="v6-direction__body">
            <span class="v6-direction__title font-display">{{ t.directions[key].title }}</span>
            <span class="v6-direction__text">{{ t.directions[key].text }}</span>
            <span class="v6-direction__link">
              {{ c.details }}
              <ArrowUpRight :size="16" aria-hidden="true" />
            </span>
          </span>
        </RouterLink>
      </div>
    </section>

    <Section
      id="conditions"
      :kicker="t.conditions.kicker"
      :title="t.conditions.title"
      tone="ink2"
      class="v6-conditions"
    >
      <template #action>
        <span class="v6-caption">{{ c.photoNote }}</span>
      </template>
      <div class="v6-conditions__grid">
        <div>
          <figure class="v6-conditions__photo">
            <Picture
              :name="PHOTOS[photo]"
              :alt="c.photos[photo]"
              sizes="(max-width: 767px) 92vw, 44vw"
              class="size-full object-cover"
            />
            <figcaption>
              <span>{{ c.photos[photo] }}</span>
              <span>0{{ photo + 1 }} / 03</span>
            </figcaption>
          </figure>
          <div class="v6-photo-controls" role="group" :aria-label="t.common.photo">
            <button
              v-for="(name, i) in PHOTOS"
              :key="name"
              type="button"
              :aria-pressed="photo === i"
              @click="photo = i"
            >
              {{ c.photos[i] }}
            </button>
          </div>
        </div>
        <ul class="v6-features">
          <li v-for="{ key, icon } in FEATURES" :key="key">
            <component :is="icon" :size="21" aria-hidden="true" :stroke-width="1.6" />
            <div>
              <h3>{{ t.conditions.items[key].title }}</h3>
              <p>{{ t.conditions.items[key].text }}</p>
            </div>
          </li>
        </ul>
      </div>
    </Section>

    <Section id="prices" :kicker="t.prices.kicker" :title="c.pricing">
      <template #action>
        <p class="v6-caption">{{ c.pricingNote }}</p>
      </template>
      <div class="v6-prices">
        <article class="v6-price-card v6-price-card--arena">
          <div class="v6-price-card__heading">
            <span>01 / ARENA</span>
            <h3 class="font-display">{{ t.prices.arenaTitle }}</h3>
            <p>5×5 / 6×6 · {{ t.prices.perHour.replace('/', '') }}</p>
          </div>
          <dl class="v6-rates">
            <div v-for="z in ZONE_ORDER" :key="z" :class="z === 'prime' ? 'v6-rate--prime' : ''">
              <dt>
                <span>{{ t.prices.zones[z] }}</span>
                <small>{{ ZONE_HOURS[z] }}</small>
              </dt>
              <dd>{{ money(ZONE_PRICE[z], lang) }}</dd>
            </div>
          </dl>
          <RouterLink :to="BOOKING_PATH" class="v6-button v6-button--primary">
            {{ c.book }}
            <ArrowUpRight :size="16" aria-hidden="true" />
          </RouterLink>
        </article>
        <article class="v6-price-card">
          <div class="v6-price-card__heading">
            <span>02 / DOPȘÝ SCHOOL</span>
            <h3 class="font-display">{{ t.prices.schoolTitle }}</h3>
            <p>{{ SCHOOL.ageFrom }}–{{ SCHOOL.ageTo }} {{ t.enroll.years }}</p>
          </div>
          <dl class="v6-rates v6-rates--school">
            <div>
              <dt>{{ t.prices.schoolMonth }}</dt>
              <dd>{{ money(SCHOOL.month, lang) }}</dd>
            </div>
            <div>
              <dt>{{ t.prices.schoolThree }}</dt>
              <dd>{{ money(SCHOOL.threeMonths, lang) }}</dd>
            </div>
            <div>
              <dt>{{ c.trial }}</dt>
              <dd class="v6-free">{{ c.free }}</dd>
            </div>
          </dl>
          <p class="v6-price-note">
            <Check :size="14" aria-hidden="true" />
            {{ t.prices.schoolThree }} — {{ t.prices.schoolGift }}
          </p>
          <RouterLink :to="to('school', 'enroll')" class="v6-button v6-button--outline">
            {{ c.enroll }}
            <ArrowUpRight :size="16" aria-hidden="true" />
          </RouterLink>
        </article>
        <article class="v6-price-card v6-price-card--boxing">
          <div class="v6-price-card__heading">
            <span>03 / BOXING</span>
            <h3 class="font-display">BOXY ACADEMY</h3>
            <p>{{ c.tags[2] }}</p>
          </div>
          <div class="v6-boxing-formats">
            <span>{{ c.group }}</span>
            <span>{{ c.personal }}</span>
          </div>
          <p class="v6-price-explainer">{{ c.boxingNote }}</p>
          <a :href="CONTACTS.phoneHref" class="v6-price-phone">{{ CONTACTS.phone }}</a>
          <RouterLink :to="to('boxing', 'enroll')" class="v6-button v6-button--outline">
            {{ t.prices.trial }}
            <ArrowUpRight :size="16" aria-hidden="true" />
          </RouterLink>
        </article>
      </div>
    </Section>

    <Reviews preview tone="ink2" />
    <InstaFeed tone="ink" />

    <Section id="map" :kicker="t.contacts.kicker" :title="c.map">
      <div class="v6-location">
        <MapBlock class="v6-location__map" />
        <div class="v6-location__details">
          <div>
            <MapPin :size="20" aria-hidden="true" />
            <div>
              <span>{{ t.contacts.address }}</span>
              <p>{{ t.contacts.addressValue }}</p>
            </div>
          </div>
          <div>
            <Clock :size="20" aria-hidden="true" />
            <div>
              <span>{{ t.contacts.hours }}</span>
              <p>{{ t.contacts.hoursValue }}</p>
            </div>
          </div>
          <div>
            <Phone :size="20" aria-hidden="true" />
            <div>
              <span>{{ t.contacts.phone }}</span>
              <a :href="CONTACTS.phoneHref">{{ CONTACTS.phone }}</a>
            </div>
          </div>
          <a
            :href="CONTACTS.twogis"
            target="_blank"
            rel="noopener noreferrer"
            class="v6-button v6-button--outline"
          >
            {{ c.route }}
            <ArrowUpRight :size="16" aria-hidden="true" />
          </a>
        </div>
      </div>
    </Section>
  </div>
</template>
