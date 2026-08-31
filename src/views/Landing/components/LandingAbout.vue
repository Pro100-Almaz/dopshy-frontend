<script setup lang="ts">
import { Building2, CalendarClock, CreditCard, Headphones } from 'lucide-vue-next'

const audiences = [
  {
    title: 'Корпоративные клиенты',
    text: 'Для компаний, HR-команд и организаторов мероприятий, которым нужны понятные условия, документы, счета и предсказуемые слоты.',
  },
  {
    title: 'Любительские команды',
    text: 'Для друзей, игроков и команд, которые хотят быстро найти свободное время, узнать стоимость и забронировать поле без лишних шагов.',
  },
  {
    title: 'Постоянные гости',
    text: 'Для команд и компаний, которые бронируют регулярно и ждут более быстрого сервиса, знакомой поддержки и удобных альтернатив.',
  },
]

const operations = [
  { icon: CalendarClock, text: 'Бронирование по дате, времени, формату поля и количеству игроков.' },
  { icon: CreditCard, text: 'Предоплата подтверждает слот; остаток оплачивается на месте.' },
  { icon: Headphones, text: 'Менеджеры помогают с альтернативами, переносами и поддержкой в день игры.' },
]
</script>

<template>
  <section id="about" class="landing-snap-section bg-white py-24">
    <div class="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
      <div>
        <span class="mb-5 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-success-600">
          <Building2 class="h-4 w-4" />
          О нас
        </span>
        <h2 class="mb-6 text-4xl font-bebas leading-tight text-gray-900 md:text-5xl">
          АРЕНДА ФУТБОЛЬНЫХ ПОЛЕЙ И
          <span class="text-success-600">ОРГАНИЗАЦИЯ ИГР</span>
        </h2>
        <p class="max-w-xl text-sm leading-7 text-gray-500 md:text-base">
          Dopsy Arena сдаёт футбольные поля любительским командам, постоянным игрокам и
          корпоративным клиентам. Гости выбирают дату, время, формат поля и количество игроков, а
          команда арены ведёт доступность, предоплату, оплату на месте, отмены, переносы и
          поддержку перед матчем.
        </p>
      </div>

      <div class="space-y-6">
        <div class="grid gap-4 sm:grid-cols-3">
          <div
            v-for="item in operations"
            :key="item.text"
            class="rounded-2xl border border-gray-200 bg-gray-50 p-5"
          >
            <component :is="item.icon" class="mb-4 h-6 w-6 text-success-600" />
            <p class="text-xs leading-6 text-gray-600">
              {{ item.text }}
            </p>
          </div>
        </div>

        <div class="grid gap-4 md:grid-cols-3">
          <article
            v-for="audience in audiences"
            :key="audience.title"
            class="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm"
          >
            <h3 class="mb-3 text-sm font-bebas leading-snug text-gray-900">
              {{ audience.title }}
            </h3>
            <p class="text-xs leading-6 text-gray-500">
              {{ audience.text }}
            </p>
          </article>
        </div>
      </div>
    </div>
  </section>
</template>
