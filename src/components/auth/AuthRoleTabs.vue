<template>
  <div class="flex flex-wrap gap-2">
    <button
      v-for="role in roles"
      :key="role.value"
      type="button"
      @click="$emit('update:modelValue', role.value)"
      :class="[
        'px-4 py-2 rounded-xl text-xs font-semibold tracking-wider border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#10B981]/30',
        modelValue === role.value
          ? 'border-[#10B981] text-[#10B981] bg-[#10B981]/[0.08]'
          : 'border-[#E2E8F0] text-[#94A3B8] bg-white hover:border-[#CBD5E1] hover:text-[#64748B]',
      ]"
    >
      {{ role.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: string
  roles: { label: string; value: string }[]
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>
