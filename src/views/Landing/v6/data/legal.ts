/** Общая форма юридических страниц лендинга (политика, оферта). */
export type LegalBlock = { p: string } | { ul: string[] }

export interface LegalClause {
  title: string
  blocks: LegalBlock[]
  /** Дописать строку «куда направлять обращения» (`doc.requests`). */
  requestsEmail?: boolean
}

export interface LegalDoc {
  title: string
  /** Подзаголовок под h1, например «Договор об оказании услуг…». */
  subtitle?: string
  /** Строка с датой: «Дата последнего обновления: …». */
  updated: string
  clauses: LegalClause[]
  requests?: { label: string; email: string }
  /** Последний пронумерованный раздел — таблица контактов / реквизитов. */
  contactsTitle: string
  contacts: { label: string; value: string; href?: string }[]
}
