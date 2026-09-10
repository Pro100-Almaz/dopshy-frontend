<script setup lang="ts">
import { computed } from 'vue'

import AcademyHeader from '@/components/academy/AcademyHeader.vue'
import CustomersPage from '@/views/Pages/CustomersPage.vue'
import type { BotType } from '@/services/customer'
import type { SportKey } from '@/services/academy'

const props = defineProps<{ sport: SportKey }>()

const botType = computed<BotType>(() =>
  props.sport === 'boxing' ? 'boxing_academy' : 'football_academy',
)
</script>

<template>
  <CustomersPage :bot-type="botType">
    <template #header>
      <AcademyHeader
        :sport="sport"
        title="Клиентская база"
        subtitle="Контакты WhatsApp-бота выбранного направления академии."
      />
    </template>
  </CustomersPage>
</template>
