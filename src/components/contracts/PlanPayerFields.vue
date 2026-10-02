<script setup lang="ts">
import type { PlanDraft } from '@/services/contracts'

const draft = defineModel<PlanDraft>({ required: true })

defineProps<{
  // Телефон договора — плательщик по умолчанию.
  fallbackPhone?: string
}>()
</script>

<template>
  <div class="grid gap-4 sm:grid-cols-2">
    <label class="grid gap-1.5 text-sm font-medium text-gray-700">
      Телефон плательщика
      <input
        v-model="draft.billing_phone"
        type="tel"
        :placeholder="fallbackPhone || '+7 700 123 45 67'"
        class="contract-input"
      />
      <span class="text-xs font-normal text-gray-500">
        {{ fallbackPhone ? 'Пусто — телефон договора' : 'Сюда уходят счета и ссылки на оплату' }}
      </span>
    </label>
    <label class="grid gap-1.5 text-sm font-medium text-gray-700">
      Способ оплаты
      <select v-model="draft.channel" class="contract-input">
        <option value="">Автоматически</option>
        <option value="kaspi_invoice">Только счёт в Kaspi</option>
        <option value="whatsapp_link">Ссылка в WhatsApp</option>
      </select>
      <span class="text-xs font-normal text-gray-500">
        Автоматически: счёт в Kaspi, если номер там зарегистрирован, иначе ссылка в WhatsApp.
      </span>
    </label>
  </div>
</template>
