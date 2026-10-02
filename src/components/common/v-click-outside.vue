<script lang="ts">
import type { Directive } from 'vue'

type ClickOutsideElement = HTMLElement & { clickOutsideEvent?: (event: MouseEvent) => void }

const clickOutside: Directive<ClickOutsideElement, (event: MouseEvent) => void> = {
  created(el, binding) {
    el.clickOutsideEvent = (event) => {
      if (!(el === event.target || el.contains(event.target as Node))) {
        binding.value(event)
      }
    }
    document.addEventListener('click', el.clickOutsideEvent)
  },
  unmounted(el) {
    if (el.clickOutsideEvent) {
      document.removeEventListener('click', el.clickOutsideEvent)
    }
  },
}

export default clickOutside
</script>
