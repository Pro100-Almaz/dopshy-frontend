<script setup lang="ts">
import { computed } from 'vue'
import { useLang } from '../i18n'
import { OFFER } from '../data/offer'
import LegalDocument from '../components/LegalDocument.vue'

const { lang } = useLang()
const doc = computed(() => OFFER[lang.value])
</script>

<template>
  <LegalDocument :doc="doc" />
</template>
