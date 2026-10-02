<script setup lang="ts">
import { onBeforeUnmount, onMounted, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import { useLang } from './i18n'
import type { LandingRoute } from './routes'
import Nav from './components/Nav.vue'
import Footer from './components/Footer.vue'
import './landing.css'

const { t } = useLang()
const route = useRoute()

// landing.css is scoped to html.lv6 so the admin panel keeps its own look.
onMounted(() => document.documentElement.classList.add('lv6'))
onBeforeUnmount(() => document.documentElement.classList.remove('lv6', 'lv6-booking'))
watchEffect(() => {
  // Booking views share admin components; lv6-booking repaints their palette (landing.css).
  document.documentElement.classList.toggle('lv6-booking', !!route.meta.booking)
  const key = route.meta.landing as LandingRoute | undefined
  if (key) document.title = t.value.meta[key]
})

const focusMain = () => document.getElementById('main')?.focus()
</script>

<template>
  <div id="lv6-root" class="lv6-root">
    <a
      href="#main"
      class="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-100 focus:rounded-full focus:bg-acid focus:px-5 focus:py-3 focus:font-semibold focus:text-acid-ink"
      @click.prevent="focusMain"
    >
      {{ t.nav.skip }}
    </a>
    <Nav />
    <main id="main" tabindex="-1" class="outline-none">
      <RouterView v-slot="{ Component }">
        <Transition mode="out-in" enter-from-class="opacity-0" leave-to-class="opacity-0"
          enter-active-class="transition-opacity duration-200" leave-active-class="transition-opacity duration-200">
          <component :is="Component" />
        </Transition>
      </RouterView>
    </main>
    <Footer />
  </div>
</template>
