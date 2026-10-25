<script setup lang="ts">
import { ref } from 'vue'
import { useLang } from '../i18n'
import { CONTACTS } from '../data/site'

const { t } = useLang()
const ready = ref(false)

const [lat, lng] = CONTACTS.coords
const bbox = [lng - 0.008, lat - 0.005, lng + 0.008, lat + 0.005].join('%2C')
const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`
</script>

<template>
  <div class="relative overflow-hidden rounded-[1.75rem] border border-line bg-ink-2">
    <iframe
      :src="src"
      :title="t.contacts.mapLabel"
      loading="lazy"
      class="map-dark relative size-full min-h-80 border-0"
      @load="ready = true"
    />
    <div
      v-if="!ready"
      class="absolute inset-0 flex items-center justify-center text-sm text-fg-dim"
    >
      {{ t.contacts.loading }}
    </div>
  </div>
</template>
