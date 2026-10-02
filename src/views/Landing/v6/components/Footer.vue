<script setup lang="ts">
import { ArrowUpRight, Phone } from 'lucide-vue-next'
import { useLang } from '../i18n'
import { CONTACTS, INSTAGRAM } from '../data/site'
import { to } from '../routes'
import Logo from './Logo.vue'

const { t, lang } = useLang()
const year = new Date().getFullYear()
</script>

<template>
  <footer class="v6-footer">
    <div class="v6-wrap">
      <div class="v6-footer__contact">
        <div>
          <h2 class="font-display">
            {{ lang === 'kk' ? 'Сұрақтарыңыз бар ма?' : 'Остались вопросы?' }}
          </h2>
          <p>
            {{
              lang === 'kk'
                ? 'Әкімші алаң мен сабақтар туралы айтып береді.'
                : 'Администратор подскажет по полям и занятиям.'
            }}
          </p>
        </div>
        <a class="v6-button v6-button--primary" :href="CONTACTS.phoneHref">
          <Phone :size="16" aria-hidden="true" />
          {{ CONTACTS.phone }}
        </a>
      </div>
      <div class="v6-footer__grid">
        <div>
          <RouterLink :to="to('home')" :aria-label="t.nav.home"><Logo /></RouterLink>
          <p class="v6-footer__address">{{ t.contacts.addressValue }}</p>
        </div>
        <nav :aria-label="t.footer.nav">
          <h3>{{ t.footer.nav }}</h3>
          <RouterLink v-for="r in ['arena', 'school', 'boxing', 'contacts'] as const" :key="r" :to="to(r)">
            {{ t.nav[r] }}
          </RouterLink>
        </nav>
        <div>
          <h3>Instagram</h3>
          <a
            v-for="d in ['arena', 'school', 'boxing'] as const"
            :key="d"
            :href="INSTAGRAM[d].url"
            target="_blank"
            rel="noopener noreferrer"
          >
            @{{ INSTAGRAM[d].handle }}
            <ArrowUpRight :size="14" aria-hidden="true" />
          </a>
        </div>
      </div>
      <div class="v6-footer__bottom">
        <span>© {{ year }} DOPȘÝ ARENA</span>
      </div>
    </div>
  </footer>
</template>
