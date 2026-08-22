/**
 * Карта «по этой строке идёт запрос».
 *
 * Списки академии сохраняют по одной строке за раз, и каждой нужен свой
 * спиннер. Держим это картой id → true и заменяем её целиком: так Vue
 * гарантированно видит изменение, а строки не мигают все разом.
 */
export type PendingMap<K extends string | number = string | number> = Partial<Record<K, boolean>>

export function setPending<K extends string | number>(
  map: PendingMap<K>,
  key: K,
  pending: boolean,
): PendingMap<K> {
  const next = { ...map }
  if (pending) {
    next[key] = true
  } else {
    delete next[key]
  }
  return next
}

export function isPending<K extends string | number>(map: PendingMap<K>, key: K): boolean {
  return map[key] === true
}
