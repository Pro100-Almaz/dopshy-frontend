<template>
  <div class="relative" ref="dropdownRef">
    <button
      class="flex items-center text-gray-700 dark:text-gray-400"
      @click.prevent="toggleDropdown"
    >
      <span
        class="mr-3 flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-[#10B981]/10 text-sm font-bold text-[#10B981]"
      >
        {{ userInitials }}
      </span>

      <span class="mr-1 block font-medium text-theme-sm">
        {{ displayName }}
      </span>

      <ChevronDownIcon :class="{ 'rotate-180': dropdownOpen }" />
    </button>

    <!-- Dropdown -->
    <div
      v-if="dropdownOpen"
      class="absolute right-0 mt-[17px] flex w-[260px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark"
    >
      <div>
        <span
          class="block font-medium text-gray-700 text-theme-sm dark:text-gray-400"
        >
          {{ authStore.user?.name || 'Admin' }}
        </span>
        <span
          class="mt-0.5 block text-theme-xs text-gray-500 dark:text-gray-400"
        >
          {{ authStore.user?.email || '' }}
        </span>
        <span
          class="mt-1 inline-flex rounded-md bg-[#10B981]/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-[#10B981]"
        >
          {{ authStore.user?.role?.replace('_', ' ') || 'admin' }}
        </span>
      </div>

      <ul
        class="flex flex-col gap-1 border-b border-gray-200 pb-3 pt-4 dark:border-gray-800"
      >
        <li v-for="item in menuItems" :key="item.href">
          <router-link
            :to="item.href"
            class="flex items-center gap-3 rounded-lg px-3 py-2 font-medium text-gray-700 text-theme-sm hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
          >
            <component
              :is="item.icon"
              :size="18"
              class="text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300"
            />
            {{ item.text }}
          </router-link>
        </li>
      </ul>
      <button
        @click="handleSignOut"
        class="mt-3 flex w-full items-center gap-3 rounded-lg px-3 py-2 font-medium text-gray-700 text-theme-sm hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
      >
        <LogOut
          :size="18"
          class="text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300"
        />
        Выйти
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { User, Settings, HelpCircle, LogOut } from 'lucide-vue-next'
import { ChevronDownIcon } from '@/icons'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

const dropdownOpen = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)

const displayName = computed(() => {
  return authStore.user?.name?.split(' ')[0] || 'Admin'
})

const userInitials = computed(() => {
  const name = authStore.user?.name || 'A'
  return name
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
})

const menuItems = [
  { href: '/profile', icon: User, text: 'Редактировать профиль' },
  { href: '/settings', icon: Settings, text: 'Настройки аккаунта' },
  { href: '/profile', icon: HelpCircle, text: 'Поддержка' },
]

const toggleDropdown = () => {
  dropdownOpen.value = !dropdownOpen.value
}

const closeDropdown = () => {
  dropdownOpen.value = false
}

const handleSignOut = () => {
  closeDropdown()
  authStore.logout()
}

const handleClickOutside = (event: MouseEvent) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    closeDropdown()
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>
