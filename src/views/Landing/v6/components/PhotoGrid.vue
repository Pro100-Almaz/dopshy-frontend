<script setup lang="ts">
import { computed, ref } from 'vue'
import { ChevronLeft, ChevronRight, X } from 'lucide-vue-next'
import Picture from './Picture.vue'
import Reveal from './Reveal.vue'

type Item = { name: string; alt: string; span?: 'wide' | 'tall' }

const props = defineProps<{ items: Item[]; closeLabel: string }>()

const open = ref<number | null>(null)
const cur = computed(() => (open.value === null ? null : props.items[open.value]))
const step = (d: number) => {
  if (open.value !== null) open.value = (open.value + d + props.items.length) % props.items.length
}
const vFocus = { mounted: (el: HTMLElement) => el.focus() }
const onKey = (e: KeyboardEvent) => {
  if (e.key === 'Escape') open.value = null
  if (e.key === 'ArrowRight') step(1)
  if (e.key === 'ArrowLeft') step(-1)
}
</script>

<template>
  <div
    class="grid grid-flow-row-dense auto-rows-[11rem] grid-cols-2 gap-3 sm:auto-rows-[14rem] lg:grid-cols-4"
  >
    <Reveal
      v-for="(it, i) in items"
      :key="it.name"
      :delay="(i % 4) * 0.05"
      :class="it.span === 'wide' ? 'col-span-2' : it.span === 'tall' ? 'row-span-2' : ''"
    >
      <button
        type="button"
        :aria-label="it.alt"
        class="group relative size-full overflow-hidden rounded-2xl border border-line"
        @click="open = i"
      >
        <Picture
          :name="it.name"
          :alt="it.alt"
          sizes="(max-width: 1024px) 46vw, 24vw"
          class="size-full object-cover transition-transform duration-700 group-hover:scale-105 motion-reduce:transition-none"
        />
      </button>
    </Reveal>
  </div>
  <Transition
    enter-from-class="opacity-0"
    leave-to-class="opacity-0"
    enter-active-class="transition-opacity duration-200"
    leave-active-class="transition-opacity duration-200"
  >
    <div
      v-if="cur"
      role="dialog"
      aria-modal="true"
      :aria-label="cur.alt"
      class="fixed inset-0 z-100 flex items-center justify-center bg-ink/95 p-4"
      @click="open = null"
      @keydown="onKey"
    >
      <Picture
        :key="cur.name"
        :name="cur.name"
        :alt="cur.alt"
        sizes="92vw"
        priority
        class="max-h-[82svh] w-auto max-w-full rounded-2xl object-contain"
      />
      <button
        v-focus
        type="button"
        :aria-label="closeLabel"
        class="absolute top-4 right-4 flex size-12 items-center justify-center rounded-full bg-surface text-fg"
        @click="open = null"
      >
        <X class="size-5" aria-hidden="true" />
      </button>
      <button
        type="button"
        aria-label="←"
        class="absolute left-3 flex size-12 items-center justify-center rounded-full bg-surface text-fg"
        @click.stop="step(-1)"
      >
        <ChevronLeft class="size-5" aria-hidden="true" />
      </button>
      <button
        type="button"
        aria-label="→"
        class="absolute right-3 flex size-12 items-center justify-center rounded-full bg-surface text-fg"
        @click.stop="step(1)"
      >
        <ChevronRight class="size-5" aria-hidden="true" />
      </button>
    </div>
  </Transition>
</template>
