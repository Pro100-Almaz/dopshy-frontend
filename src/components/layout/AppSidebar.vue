<template>
  <aside
    :class="[
      'fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-99999 border-r border-gray-200',
      {
        'lg:w-[290px]': isExpanded || isMobileOpen || isHovered,
        'lg:w-[90px]': !isExpanded && !isHovered,
        'translate-x-0 w-[290px]': isMobileOpen,
        '-translate-x-full': !isMobileOpen,
        'lg:translate-x-0': true,
      },
    ]"
    @mouseenter="!isExpanded && (isHovered = true)"
    @mouseleave="isHovered = false"
  >
    <!-- Brand Logo -->
    <div
      :class="[
        'py-8 flex',
        !isExpanded && !isHovered ? 'lg:justify-center' : 'justify-start',
      ]"
    >
      <router-link to="/" class="flex items-center gap-2.5">
        <div
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#10B981]"
        >
          <svg
            class="h-4.5 w-4.5 text-white"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M12 2 2 7l10 5 10-5-10-5Z" />
            <path d="m2 17 10 5 10-5" />
            <path d="m2 12 10 5 10-5" />
          </svg>
        </div>
        <span
          v-if="isExpanded || isHovered || isMobileOpen"
          class="text-base font-bold tracking-wide text-gray-900 dark:text-white"
        >
          DOPSY ARENA
        </span>
      </router-link>
    </div>

    <div
      class="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar"
    >
      <nav class="mb-6">
        <div class="flex flex-col gap-4">
          <div v-for="(menuGroup, groupIndex) in menuGroups" :key="groupIndex">
            <h2
              :class="[
                'mb-4 text-xs uppercase flex leading-[20px] text-gray-400',
                !isExpanded && !isHovered
                  ? 'lg:justify-center'
                  : 'justify-start',
              ]"
            >
              <template v-if="isExpanded || isHovered || isMobileOpen">
                {{ menuGroup.title }}
              </template>
              <HorizontalDots v-else />
            </h2>
            <ul class="flex flex-col gap-4">
              <li v-for="(item, index) in menuGroup.items" :key="item.name">
                <!-- Items with sub-items -->
                <button
                  v-if="item.subItems"
                  @click="toggleSubmenu(groupIndex, index)"
                  :class="[
                    'menu-item group w-full',
                    {
                      'menu-item-active': isSubmenuOpen(groupIndex, index),
                      'menu-item-inactive': !isSubmenuOpen(groupIndex, index),
                    },
                    !isExpanded && !isHovered
                      ? 'lg:justify-center'
                      : 'lg:justify-start',
                  ]"
                >
                  <span
                    :class="[
                      isSubmenuOpen(groupIndex, index)
                        ? 'menu-item-icon-active'
                        : 'menu-item-icon-inactive',
                    ]"
                  >
                    <component :is="item.icon" :size="20" />
                  </span>
                  <span
                    v-if="isExpanded || isHovered || isMobileOpen"
                    class="menu-item-text"
                    >{{ item.name }}</span
                  >
                  <span
                    v-if="item.badge && (isExpanded || isHovered || isMobileOpen)"
                    class="ml-auto mr-2 rounded-full bg-[#10B981]/10 px-2 py-0.5 text-[10px] font-bold uppercase text-[#10B981]"
                  >
                    {{ item.badge }}
                  </span>
                  <ChevronDownIcon
                    v-if="isExpanded || isHovered || isMobileOpen"
                    :class="[
                      'ml-auto w-5 h-5 transition-transform duration-200',
                      {
                        'rotate-180 text-brand-500': isSubmenuOpen(
                          groupIndex,
                          index,
                        ),
                      },
                    ]"
                  />
                </button>
                <!-- Direct link items -->
                <router-link
                  v-else-if="item.path"
                  :to="item.path"
                  :class="[
                    'menu-item group',
                    {
                      'menu-item-active': isActive(item.path),
                      'menu-item-inactive': !isActive(item.path),
                    },
                  ]"
                >
                  <span
                    :class="[
                      isActive(item.path)
                        ? 'menu-item-icon-active'
                        : 'menu-item-icon-inactive',
                    ]"
                  >
                    <component :is="item.icon" :size="20" />
                  </span>
                  <span
                    v-if="isExpanded || isHovered || isMobileOpen"
                    class="menu-item-text"
                    >{{ item.name }}</span
                  >
                  <span
                    v-if="item.badge && (isExpanded || isHovered || isMobileOpen)"
                    class="ml-auto rounded-full bg-[#10B981]/10 px-2 py-0.5 text-[10px] font-bold uppercase text-[#10B981]"
                  >
                    {{ item.badge }}
                  </span>
                </router-link>
                <!-- Submenu -->
                <transition
                  @enter="startTransition"
                  @after-enter="endTransition"
                  @before-leave="startTransition"
                  @after-leave="endTransition"
                >
                  <div
                    v-show="
                      isSubmenuOpen(groupIndex, index) &&
                      (isExpanded || isHovered || isMobileOpen)
                    "
                  >
                    <ul class="mt-2 space-y-1 ml-9">
                      <li v-for="subItem in item.subItems" :key="subItem.name">
                        <router-link
                          :to="subItem.path"
                          :class="[
                            'menu-dropdown-item',
                            {
                              'menu-dropdown-item-active': isActive(
                                subItem.path,
                              ),
                              'menu-dropdown-item-inactive': !isActive(
                                subItem.path,
                              ),
                            },
                          ]"
                        >
                          {{ subItem.name }}
                        </router-link>
                      </li>
                    </ul>
                  </div>
                </transition>
              </li>
            </ul>
          </div>
        </div>
      </nav>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Component } from 'vue'
import { useRoute } from 'vue-router'
import {
  LayoutDashboard,
  LayoutGrid,
  CalendarCheck,
  GraduationCap,
  BookOpen,
  Wallet,
  HardHat,
  Swords,
  BarChart3,
  Settings,
} from 'lucide-vue-next'
import { ChevronDownIcon, HorizontalDots } from '@/icons'
import { useSidebar } from '@/composables/useSidebar'

interface MenuItem {
  icon: Component
  name: string
  path?: string
  badge?: string
  subItems?: { name: string; path: string }[]
}

interface MenuGroup {
  title: string
  items: MenuItem[]
}

const route = useRoute()
const { isExpanded, isMobileOpen, isHovered, openSubmenu } = useSidebar()

const menuGroups: MenuGroup[] = [
  {
    title: 'Меню',
    items: [
      {
        icon: LayoutDashboard,
        name: 'Панель управления',
        path: '/',
      },
    ],
  },
  {
    title: 'Управление полями',
    items: [
      {
        icon: LayoutGrid,
        name: 'Слоты полей',
        path: '/field-slots',
      },
      {
        icon: CalendarCheck,
        name: 'Бронирования',
        path: '/bookings',
      },
    ],
  },
  {
    title: 'Академия',
    items: [
      {
        icon: GraduationCap,
        name: 'Ученики',
        path: '/students',
      },
      {
        icon: BookOpen,
        name: 'Занятия',
        path: '/lessons',
      },
    ],
  },
  {
    title: 'Финансы и персонал',
    items: [
      {
        icon: Wallet,
        name: 'Платежи',
        path: '/payments',
      },
      {
        icon: HardHat,
        name: 'Сотрудники',
        path: '/workers',
      },
    ],
  },
  {
    title: 'Прочее',
    items: [
      {
        icon: Swords,
        name: 'Бокс',
        path: '/boxing',
        badge: 'скоро',
      },
      {
        icon: BarChart3,
        name: 'Отчёты',
        path: '/reports',
      },
      {
        icon: Settings,
        name: 'Настройки',
        path: '/settings',
      },
    ],
  },
]

const isActive = (path: string) => route.path === path

const toggleSubmenu = (groupIndex: number, itemIndex: number) => {
  const key = `${groupIndex}-${itemIndex}`
  openSubmenu.value = openSubmenu.value === key ? null : key
}

const isAnySubmenuRouteActive = computed(() => {
  return menuGroups.some((group) =>
    group.items.some(
      (item) =>
        item.subItems &&
        item.subItems.some((subItem) => isActive(subItem.path)),
    ),
  )
})

const isSubmenuOpen = (groupIndex: number, itemIndex: number) => {
  const key = `${groupIndex}-${itemIndex}`
  const item = menuGroups[groupIndex].items[itemIndex]
  return (
    openSubmenu.value === key ||
    (isAnySubmenuRouteActive.value &&
      item.subItems?.some((subItem) => isActive(subItem.path)))
  )
}

const startTransition = (el: Element) => {
  const htmlEl = el as HTMLElement
  htmlEl.style.height = 'auto'
  const height = htmlEl.scrollHeight
  htmlEl.style.height = '0px'
  htmlEl.offsetHeight // force reflow
  htmlEl.style.height = height + 'px'
}

const endTransition = (el: Element) => {
  ;(el as HTMLElement).style.height = ''
}
</script>
