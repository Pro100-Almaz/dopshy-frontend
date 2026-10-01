import { computed, ref, watchEffect } from 'vue'
import ru, { type Dict } from './ru'
import kk from './kk'

export type Lang = 'ru' | 'kk'
const DICTS: Record<Lang, Dict> = { ru, kk }
const KEY = 'dopsy-lang'

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === 'ru' || saved === 'kk') return saved
  } catch {
    /* хранилище недоступно */
  }
  return navigator.language?.toLowerCase().startsWith('kk') ? 'kk' : 'ru'
}

const lang = ref<Lang>(initialLang())
const t = computed(() => DICTS[lang.value])
watchEffect(() => {
  document.documentElement.lang = lang.value
})

function setLang(l: Lang) {
  lang.value = l
  try {
    localStorage.setItem(KEY, l)
  } catch {
    /* хранилище недоступно */
  }
}

export function useLang() {
  return { lang, t, setLang }
}

export const fmt = (s: string, vars: Record<string, string | number>) =>
  s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''))
export const money = (n: number, l: Lang) =>
  `${n.toLocaleString(l === 'kk' ? 'kk-KZ' : 'ru-RU')} ₸`
export const num = (n: number, l: Lang) => n.toLocaleString(l === 'kk' ? 'kk-KZ' : 'ru-RU')
