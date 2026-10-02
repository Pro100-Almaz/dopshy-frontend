<script setup lang="ts">
import { ref, watch } from 'vue'
import { X } from 'lucide-vue-next'

const props = defineProps<{ open: boolean; title: string; closeLabel: string }>()
const emit = defineEmits<{ close: [] }>()

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const panel = ref<HTMLElement>()

watch(
  () => props.open,
  (open, _, onCleanup) => {
    if (!open) return
    const opener = document.activeElement as HTMLElement | null
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const focusFirst = window.setTimeout(() => {
      panel.value?.querySelector<HTMLElement>('input, button, [tabindex="0"]')?.focus()
    }, 60)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') emit('close')
      if (e.key !== 'Tab' || !panel.value) return
      const items = [
        ...panel.value.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, select, textarea',
        ),
      ]
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    onCleanup(() => {
      window.clearTimeout(focusFirst)
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
      opener?.focus?.()
    })
  },
  { immediate: true },
)
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-from-class="opacity-0 modal-from"
      leave-to-class="opacity-0 modal-from"
      enter-active-class="transition-opacity duration-280"
      leave-active-class="transition-opacity duration-280"
    >
      <div
        v-if="open"
        class="group fixed inset-0 z-100 flex items-end justify-center bg-ink/80 backdrop-blur-sm sm:items-center sm:p-6"
        @mousedown.self="emit('close')"
      >
        <div
          ref="panel"
          role="dialog"
          aria-modal="true"
          :aria-label="title"
          :class="[
            'relative max-h-[92svh] w-full max-w-lg overflow-auto rounded-t-3xl border border-line bg-surface p-6 shadow-2xl sm:rounded-3xl sm:p-8',
            reduce
              ? ''
              : 'transition duration-280 ease-[cubic-bezier(0.22,1,0.36,1)] group-[.modal-from]:translate-y-10',
          ]"
        >
          <button
            type="button"
            :aria-label="closeLabel"
            class="absolute top-4 right-4 flex size-11 items-center justify-center rounded-full text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
            @click="emit('close')"
          >
            <X class="size-5" aria-hidden="true" />
          </button>
          <slot />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
