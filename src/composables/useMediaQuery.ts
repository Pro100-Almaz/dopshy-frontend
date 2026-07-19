import { ref, onMounted, onUnmounted, type Ref } from 'vue'

/**
 * Реактивный matchMedia. Возвращает ref, который true, пока запрос совпадает.
 * SSR-безопасен: до монтирования false, значение выставляется в onMounted.
 */
export function useMediaQuery(query: string): Ref<boolean> {
  const matches = ref(false)
  let mql: MediaQueryList | null = null

  function update() {
    matches.value = mql?.matches ?? false
  }

  onMounted(() => {
    mql = window.matchMedia(query)
    update()
    mql.addEventListener('change', update)
  })

  onUnmounted(() => {
    mql?.removeEventListener('change', update)
  })

  return matches
}
