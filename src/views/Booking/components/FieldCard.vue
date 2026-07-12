<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { ArrowRight, Home, Sun } from 'lucide-vue-next'
import type { Field } from '@/types'
import { formatPrice, FIELD_TYPE_LABEL } from '@/services/booking'

const props = defineProps<{
  field: Field
  date: string
}>()

const to = { path: `/booking/${props.field.id}`, query: { date: props.date } }
</script>

<template>
  <RouterLink
    :to="to"
    class="group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-sm transition-all duration-200 hover:border-success-300 hover:shadow-theme-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success-600"
  >
    <!-- Photo -->
    <div class="relative aspect-[16/10] overflow-hidden bg-gray-100">
      <img
        :src="field.photos[0]"
        :alt="`${field.name} — ${field.surface}`"
        loading="lazy"
        class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
      <div class="absolute left-3 top-3 flex gap-2">
        <span
          class="rounded-full bg-success-600 px-2.5 py-1 text-xs font-bold leading-none text-white"
          >{{ FIELD_TYPE_LABEL[field.type] }}</span
        >
        <span
          class="inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-gray-700 backdrop-blur-sm"
        >
          <component :is="field.indoor ? Home : Sun" class="h-3.5 w-3.5" aria-hidden="true" />
          {{ field.indoor ? 'Крытое' : 'Открытое' }}
        </span>
      </div>
    </div>

    <!-- Body -->
    <div class="flex flex-1 flex-col gap-3 p-5">
      <div>
        <h3 class="text-lg font-bold text-gray-900">{{ field.name }}</h3>
        <p class="mt-1.5 text-sm text-gray-500">{{ field.surface }} · {{ field.capacity }}</p>
      </div>

      <ul class="flex flex-wrap gap-1.5">
        <li
          v-for="a in field.amenities.slice(0, 4)"
          :key="a"
          class="rounded-full border border-gray-200 px-2.5 py-0.5 text-xs text-gray-600"
        >
          {{ a }}
        </li>
      </ul>

      <div class="mt-auto flex items-end justify-between pt-2">
        <div>
          <span class="text-xs text-gray-500">от</span>
          <span class="ml-1 text-xl font-bold text-gray-900">{{
            formatPrice(field.pricePerHour)
          }}</span>
          <span class="text-sm text-gray-500">/час</span>
        </div>
        <span
          class="inline-flex items-center gap-1.5 rounded-full bg-success-600 px-4 py-2 text-sm font-semibold leading-none text-white transition-transform duration-200 group-hover:gap-2.5"
        >
          Выбрать
          <ArrowRight class="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
    </div>
  </RouterLink>
</template>
