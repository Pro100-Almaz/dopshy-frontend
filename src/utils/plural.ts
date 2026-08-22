/**
 * Русские числительные. «1 активных абонементов» в интерфейсе, который читают
 * каждый день, выглядит как недоделка, а форм в русском три — значит нужна
 * одна функция, а не три копии в трёх компонентах.
 */
export function plural(count: number, one: string, few: string, many: string): string {
  const mod10 = Math.abs(count) % 10
  const mod100 = Math.abs(count) % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few
  return many
}

/** Число вместе с согласованным словом: «3 места». */
export function pluralize(count: number, one: string, few: string, many: string): string {
  return `${count} ${plural(count, one, few, many)}`
}
