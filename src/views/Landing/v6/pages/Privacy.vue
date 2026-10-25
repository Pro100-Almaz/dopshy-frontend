<script setup lang="ts">
import { computed } from 'vue'
import { useLang } from '../i18n'
import { PRIVACY } from '../data/privacy'
import LegalDocument from '../components/LegalDocument.vue'

const { lang } = useLang()
const doc = computed(() => PRIVACY[lang.value])
</script>

<template>
  <LegalDocument :doc="doc" />
</template>
