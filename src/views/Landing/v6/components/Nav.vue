<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Menu, X } from 'lucide-vue-next'
import { useLang, type Lang } from '../i18n'
import { BOOKING_PATH, to, type LandingRoute } from '../routes'
import Logo from './Logo.vue'

const LINKS: LandingRoute[] = ['arena', 'school', 'boxing', 'contacts']
const LANGS: [Lang, string][] = [
  ['ru', 'RU'],
  ['kk', 'KZ'],
]

const { lang, t, setLang } = useLang()
const vroute = useRoute()
const current = computed(() => vroute.meta.landing as LandingRoute)

const scrolled = ref(false)
const open = ref(false)
const onScroll = () => (scrolled.value = window.scrollY > 16)
const onKey = (e: KeyboardEvent) => e.key === 'Escape' && (open.value = false)
onMounted(() => {
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('keydown', onKey)
  document.body.style.overflow = ''
})
watch(() => vroute.fullPath, () => (open.value = false))
watch(open, (v) => (document.body.style.overflow = v ? 'hidden' : ''))

const solid = computed(() => scrolled.value || open.value || current.value !== 'home')
</script>

<template>
  <header
    :class="[
      'fixed inset-x-0 top-0 z-50 transition-colors duration-300',
      solid ? 'border-b border-line bg-ink/85 backdrop-blur-xl' : 'border-b border-transparent',
    ]"
  >
    <nav
      :aria-label="t.nav.home"
      class="mx-auto flex h-18 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8"
    >
      <RouterLink
        :to="to('home')"
        class="shrink-0 py-2"
        :aria-label="`DOPȘÝ ARENA — ${t.nav.home}`"
        @click="open = false"
      >
        <Logo />
      </RouterLink>

      <ul class="hidden items-center gap-1 lg:flex">
        <li v-for="r in LINKS" :key="r">
          <RouterLink
            :to="to(r)"
            :aria-current="current === r ? 'page' : undefined"
            :class="[
              'relative flex min-h-11 items-center rounded-full px-4 text-sm font-medium transition-colors',
              current === r ? 'bg-surface-2 text-fg' : 'text-fg-muted hover:text-fg',
            ]"
          >
            {{ t.nav[r] }}
          </RouterLink>
        </li>
      </ul>

      <div class="flex items-center gap-2">
        <div
          role="group"
          :aria-label="t.nav.lang"
          class="hidden rounded-full border border-line-2 p-1 sm:flex"
        >
          <button
            v-for="[code, label] in LANGS"
            :key="code"
            type="button"
            :aria-pressed="lang === code"
            :lang="code"
            :class="[
              'min-h-9 min-w-11 rounded-full px-2.5 text-xs font-semibold tracking-wide transition-colors',
              lang === code ? 'bg-fg text-ink' : 'text-fg-muted hover:text-fg',
            ]"
            @click="setLang(code)"
          >
            {{ label }}
          </button>
        </div>
        <RouterLink
          :to="BOOKING_PATH"
          class="hidden min-h-11 items-center rounded-full bg-acid px-5 text-sm font-semibold text-acid-ink transition-colors hover:bg-acid-soft md:flex"
        >
          {{ t.nav.book }}
        </RouterLink>
        <button
          type="button"
          :aria-expanded="open"
          aria-controls="mobile-menu"
          :aria-label="open ? t.nav.menuClose : t.nav.menuOpen"
          class="flex size-11 items-center justify-center rounded-full text-fg transition-colors hover:bg-surface lg:hidden"
          @click="open = !open"
        >
          <X v-if="open" class="size-6" aria-hidden="true" />
          <Menu v-else class="size-6" aria-hidden="true" />
        </button>
      </div>
    </nav>

    <Transition
      enter-from-class="opacity-0 -translate-y-2"
      leave-to-class="opacity-0"
      enter-active-class="transition duration-200"
      leave-active-class="transition duration-150"
    >
      <div
        v-if="open"
        id="mobile-menu"
        class="h-[calc(100svh-4.5rem)] overflow-auto border-t border-line bg-ink lg:hidden"
      >
        <ul class="mx-auto max-w-7xl px-4 py-4 sm:px-6">
          <li v-for="r in ['home', ...LINKS] as LandingRoute[]" :key="r">
            <RouterLink
              :to="to(r)"
              :aria-current="current === r ? 'page' : undefined"
              class="flex min-h-16 items-center justify-between border-b border-line font-display text-3xl text-fg"
              @click="open = false"
            >
              {{ t.nav[r] }}
              <span v-if="current === r" class="size-2 rounded-full bg-acid" aria-hidden="true" />
            </RouterLink>
          </li>
        </ul>
        <div class="mx-auto flex max-w-7xl flex-col gap-4 px-4 pb-10 sm:px-6">
          <div
            role="group"
            :aria-label="t.nav.lang"
            class="flex self-start rounded-full border border-line-2 p-1"
          >
            <button
              v-for="[code, label] in LANGS"
              :key="code"
              type="button"
              :aria-pressed="lang === code"
              :lang="code"
              :class="[
                'min-h-9 min-w-11 rounded-full px-2.5 text-xs font-semibold tracking-wide transition-colors',
                lang === code ? 'bg-fg text-ink' : 'text-fg-muted hover:text-fg',
              ]"
              @click="setLang(code)"
            >
              {{ label }}
            </button>
          </div>
          <RouterLink
            :to="BOOKING_PATH"
            class="flex min-h-14 items-center justify-center rounded-full bg-acid font-semibold text-acid-ink"
          >
            {{ t.nav.book }}
          </RouterLink>
        </div>
      </div>
    </Transition>
  </header>
</template>
