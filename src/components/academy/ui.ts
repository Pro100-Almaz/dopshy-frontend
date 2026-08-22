/**
 * Словарь классов поверхностей и контролов академии.
 *
 * Одинаковая кнопка на трёх страницах должна выглядеть одинаково — раньше
 * каждая страница собирала свою строку утилит, и «Оформить» отличался от
 * «Сохранить» без причины. Здесь один источник: поверхности, поля, кнопки.
 */

/** Карточка / панель: единственный уровень поднятия на рабочих экранах. */
export const panel =
  'rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]'

/** Шапка панели с нижней границей. */
export const panelHeader =
  'flex flex-col items-start gap-3 border-b border-gray-200 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between sm:px-6'

export const panelTitle = 'text-base font-semibold text-gray-900 dark:text-white'

export const panelHint = 'mt-0.5 text-theme-xs text-gray-600 dark:text-gray-400'

/** Поле ввода. */
export const input =
  'h-11 w-full rounded-lg border border-gray-300 bg-white px-3.5 text-sm text-gray-900 placeholder:text-gray-500 focus-ring focus:border-pitch-500 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-500 dark:disabled:bg-gray-800'

/** Компактное поле для фильтров. */
export const inputSm =
  'h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-500 focus-ring focus:border-pitch-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-500'

export const select =
  'h-10 w-full appearance-none rounded-lg border border-gray-300 bg-white pl-3 pr-9 text-sm text-gray-900 focus-ring focus:border-pitch-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white'

export const label =
  'mb-1.5 block text-theme-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400'

const buttonBase =
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-medium transition-colors duration-150 focus-ring disabled:cursor-not-allowed disabled:opacity-55'

export const buttonSize = {
  sm: 'h-9 px-3 text-theme-xs',
  md: 'h-11 px-4 text-theme-sm',
} as const

/** Основное действие: единственная зелёная кнопка в блоке. */
export const buttonPrimary = `${buttonBase} bg-pitch-600 text-white hover:bg-pitch-700 active:bg-pitch-800`

/** Второстепенное действие рядом с основным. */
export const buttonSecondary = `${buttonBase} border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 active:bg-gray-100 dark:border-gray-700 dark:bg-transparent dark:text-gray-200 dark:hover:bg-white/[0.04]`

/** Действие без рамки — для плотных строк таблицы. */
export const buttonGhost = `${buttonBase} text-gray-700 hover:bg-gray-100 active:bg-gray-200 dark:text-gray-300 dark:hover:bg-white/[0.06]`

/** Разрушающее / отменяющее действие. */
export const buttonDanger = `${buttonBase} border border-error-200 bg-white text-error-700 hover:bg-error-50 active:bg-error-100 dark:border-error-500/30 dark:bg-transparent dark:text-error-400 dark:hover:bg-error-500/10`

/** Заголовок колонки таблицы. */
export const th =
  'px-5 py-3 text-left text-theme-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400 sm:px-6'

export const td = 'px-5 py-4 align-top sm:px-6'

export const tableRow =
  'border-b border-gray-200 transition-colors last:border-0 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/[0.02]'
