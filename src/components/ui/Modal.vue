<template>
  <Teleport to="body">
    <!--
      A fixed frame the size of the visible screen (portrait or landscape). The frame itself never scrolls:
      the panel is capped to the frame's height (see `.app-modal` in main.css) and scrolls its own content,
      so the modal stays put while only the data inside it moves.
    -->
    <div
      class="app-modal fixed inset-0 z-[100000] flex items-center justify-center p-4 sm:p-6"
      @mousedown.self="pressedOutside = true"
      @click.self="onOutsideClick"
    >
      <div
        v-if="fullScreenBackdrop"
        class="app-modal-backdrop fixed inset-0 -z-10 h-full w-full bg-gray-400/50 backdrop-blur-[32px]"
        aria-hidden="true"
        @mousedown="pressedOutside = true"
        @click="onOutsideClick"
      ></div>
      <slot name="body"></slot>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface ModalProps {
  fullScreenBackdrop?: boolean
}

const props = defineProps<ModalProps>()
const emit = defineEmits(['close'])

// Close only when the press also started outside the panel, so dragging to select text inside a field doesn't close it.
const pressedOutside = ref(false)
function onOutsideClick() {
  if (props.fullScreenBackdrop && pressedOutside.value) emit('close')
  pressedOutside.value = false
}
</script>
