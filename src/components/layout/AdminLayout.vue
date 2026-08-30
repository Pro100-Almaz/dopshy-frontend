<template>
  <div class="h-dvh overflow-hidden xl:flex">
    <app-sidebar />
    <Backdrop />
    <!-- Колонка контента — собственный контейнер прокрутки (h-dvh + overflow-y-auto).
         Так sticky-шапка гарантированно закрепляется сверху на любом устройстве,
         а не зависит от оконного скролла (на мобильных он «отклеивал» шапку). -->
    <div
      class="flex h-dvh min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto transition-all duration-300 ease-in-out"
      :class="[isExpanded || isHovered ? 'lg:ml-[290px]' : 'lg:ml-[90px]']"
    >
      <app-header />
      <div class="p-4 mx-auto w-full max-w-(--breakpoint-2xl) md:p-6">
        <slot></slot>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, onUnmounted } from 'vue'
import AppSidebar from './AppSidebar.vue'
import AppHeader from './AppHeader.vue'
import { useSidebar } from '@/composables/useSidebar'
import Backdrop from './Backdrop.vue'
const { isExpanded, isHovered } = useSidebar()

onMounted(() => {
  document.documentElement.classList.add('admin-shell-lock-scroll')
  document.body.classList.add('admin-shell-lock-scroll')
})

onUnmounted(() => {
  document.documentElement.classList.remove('admin-shell-lock-scroll')
  document.body.classList.remove('admin-shell-lock-scroll')
})
</script>

<style>
html.admin-shell-lock-scroll,
body.admin-shell-lock-scroll {
  height: 100%;
  overflow: hidden;
}
</style>
