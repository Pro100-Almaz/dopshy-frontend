<template>
  <div>
    <div class="flex items-center justify-between mb-1.5">
      <label :for="id" class="block text-sm font-medium text-[#0F172A]">
        {{ label }}
      </label>
      <slot name="label-right" />
    </div>
    <div class="relative">
      <div
        v-if="$slots.icon"
        class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#94A3B8]"
      >
        <slot name="icon" />
      </div>
      <input
        :id="id"
        :type="type"
        :placeholder="placeholder"
        :value="modelValue"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        :class="[
          'h-12 w-full rounded-xl border bg-[#F8FAFC] text-sm text-[#0F172A] placeholder:text-[#94A3B8] transition-colors focus:outline-none focus:ring-3',
          $slots.icon ? 'pl-11' : 'pl-4',
          $slots.right ? 'pr-11' : 'pr-4',
          error
            ? 'border-red-400 focus:border-red-500 focus:ring-red-500/10'
            : 'border-[#E2E8F0] focus:border-[#10B981] focus:ring-[#10B981]/10',
        ]"
      />
      <div
        v-if="$slots.right"
        class="absolute right-4 top-1/2 -translate-y-1/2"
      >
        <slot name="right" />
      </div>
    </div>
    <p v-if="error" class="mt-1.5 text-xs text-red-500">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  id: string
  label: string
  type?: string
  placeholder?: string
  modelValue: string
  error?: string
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>
