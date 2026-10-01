<script setup lang="ts">
import { ArrowUpRight, Phone } from 'lucide-vue-next'
import { CONTACTS, INSTAGRAM } from '../data/site'
import InstagramIcon from './InstagramIcon.vue'

defineProps<{ kind: 'school' | 'boxing' }>()
</script>

<template>
  <div class="flex flex-wrap items-center gap-4">
    <a :href="CONTACTS.phoneHref" class="v6-button v6-button--primary">
      <Phone :size="16" aria-hidden="true" />
      {{ CONTACTS.phone }}
    </a>
    <a
      :href="INSTAGRAM[kind].url"
      target="_blank"
      rel="noopener noreferrer"
      class="v6-button v6-button--outline"
    >
      <InstagramIcon class="size-4" aria-hidden="true" />
      @{{ INSTAGRAM[kind].handle }}
      <ArrowUpRight :size="16" aria-hidden="true" />
    </a>
  </div>
</template>
