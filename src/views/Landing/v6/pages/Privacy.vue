<script setup lang="ts">
import { computed } from 'vue'
import { useLang } from '../i18n'
import { PRIVACY, PRIVACY_EMAIL } from '../data/privacy'

const { lang } = useLang()
const doc = computed(() => PRIVACY[lang.value])
</script>

<template>
  <section class="bg-ink pt-32 pb-20 sm:pt-40 sm:pb-28">
    <div class="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
      <header class="mb-12">
        <p
          class="mb-3 inline-flex items-center gap-2 text-xs font-semibold tracking-[0.18em] text-acid uppercase"
        >
          <span class="h-px w-6 bg-acid" aria-hidden="true" />
          dopsy.kz
        </p>
        <h1 class="font-display text-[clamp(2.1rem,5vw,3.6rem)] text-fg">{{ doc.title }}</h1>
        <p class="mt-4 text-sm text-fg-dim">{{ doc.updatedLabel }}: {{ doc.updated }}</p>
      </header>

      <ol class="space-y-10">
        <li v-for="(clause, i) in doc.clauses" :key="i">
          <h2 class="mb-4 text-xl font-semibold text-fg">{{ i + 1 }}. {{ clause.title }}</h2>
          <div class="space-y-3 text-base leading-relaxed text-fg-muted">
            <template v-for="(block, j) in clause.blocks" :key="j">
              <p v-if="'p' in block">{{ block.p }}</p>
              <ul v-else class="list-disc space-y-1.5 pl-6 marker:text-acid">
                <li v-for="item in block.ul" :key="item">{{ item }}</li>
              </ul>
            </template>
            <p v-if="clause.requestsEmail">
              {{ doc.requestsLabel }}
              <a :href="`mailto:${PRIVACY_EMAIL}`" class="font-semibold text-acid hover:underline">
                {{ PRIVACY_EMAIL }}</a
              >.
            </p>
          </div>
        </li>
        <li>
          <h2 class="mb-4 text-xl font-semibold text-fg">
            {{ doc.clauses.length + 1 }}. {{ doc.contactsTitle }}
          </h2>
          <dl class="divide-y divide-line rounded-2xl border border-line bg-surface">
            <div
              v-for="row in doc.contacts"
              :key="row.label"
              class="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:gap-6"
            >
              <dt class="text-sm text-fg-dim sm:w-44 sm:shrink-0">{{ row.label }}</dt>
              <dd class="font-semibold break-words text-fg">
                <a v-if="row.href" :href="row.href" class="hover:text-acid">{{ row.value }}</a>
                <template v-else>{{ row.value }}</template>
              </dd>
            </div>
          </dl>
        </li>
      </ol>
    </div>
  </section>
</template>
