<script setup lang="ts">
import { ASSETS } from '../routes'
import LogoMark from './LogoMark.vue'

defineProps<{ sub?: string }>()
</script>

<template>
  <span class="v6-client-logo">
    <span class="v6-client-logo__art" role="img" aria-label="DOPȘÝ ARENA">
      <LogoMark class="v6-client-logo__mark" />
      <svg viewBox="184 584 752 91" class="v6-client-logo__name" aria-hidden="true">
        <image :href="`${ASSETS}brand/lockup.webp`" width="1125" height="1125" />
      </svg>
    </span>
    <span v-if="sub" class="v6-client-logo__sub">{{ sub }}</span>
  </span>
</template>
