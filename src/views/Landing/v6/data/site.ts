export const CONTACTS = {
  phone: '+7 700 555 6000',
  phoneHref: 'tel:+77005556000',
  email: 'arena@dopsy.kz',
  emailHref: 'mailto:arena@dopsy.kz',
  twogis: 'https://go.2gis.com/CtEyF',
  twogisReviews: 'https://2gis.kz/astana/firm/70000001074875383/tab/reviews',
  coords: [51.130325, 71.369512] as [number, number],
} as const
export const DIVISION_PHONES = {
  boxing: { phone: '+7 700 555 2202', phoneHref: 'tel:+77005552202' },
  school: { phone: '+7 700 555 6006', phoneHref: 'tel:+77005556006' },
} as const
export const RATING = {
  score: 4.9,
  ratings: 2615,
  reviews: 848,
} as const
export type Zone = 'night' | 'day' | 'prime' | 'evening'
export const ZONE_ORDER: Zone[] = ['night', 'day', 'prime', 'evening']
export const ZONE_PRICE: Record<Zone, number> = {
  night: 12000,
  day: 14000,
  prime: 15000,
  evening: 14000,
}
export const ZONE_HOURS: Record<Zone, string> = {
  night: '00:00–06:59',
  day: '07:00–18:59',
  prime: '19:00–21:59',
  evening: '22:00–23:59',
}
export function zoneAt(hour: number): Zone {
  if (hour < 7) return 'night'
  if (hour < 19) return 'day'
  if (hour < 22) return 'prime'
  return 'evening'
}
export const priceAt = (hour: number) => ZONE_PRICE[zoneAt(hour)]
export const MIN_PRICE = Math.min(...Object.values(ZONE_PRICE))
export const FIELDS = [
  {
    id: 'f1',
    n: 1,
    format: '6×6',
    players: 12,
    image: 'hall-main',
  },
  {
    id: 'f2',
    n: 2,
    format: '5×5',
    players: 10,
    image: 'hall-glass',
  },
  {
    id: 'f3',
    n: 3,
    format: '5×5',
    players: 10,
    image: 'hall-balcony',
  },
] as const
export const SCHOOL = {
  ageFrom: 5,
  ageTo: 15,
  month: 25000,
  threeMonths: 70000,
} as const
export const BOXING = {
  kidsFrom: 7,
  kidsTo: 16,
  adultsFrom: 17,
} as const
export type Division = 'arena' | 'school' | 'boxing'
export type Review = {
  id: string
  division: Division
  author: string
  date: string
  lang: 'ru' | 'kk'
  text: string
  visits?: number
}
export const REVIEWS: Review[] = [
  {
    id: 'a1',
    division: 'arena',
    author: 'Султан И.',
    date: '2026-03-17',
    lang: 'ru',
    visits: 6,
    text: 'Играем тут каждую неделю. Качественное поле, хорошая вентиляция, отзывчивый персонал. Самое главное доступные цены.',
  },
  {
    id: 'a2',
    division: 'arena',
    author: 'Mansur Yertay',
    date: '2025-11-21',
    lang: 'ru',
    text: 'Хороший газон с нормальным отоплением, можно играть даже зимой. Хорошие раздевалки с душевой и магазином внутри.',
  },
  {
    id: 'a3',
    division: 'arena',
    author: 'arlan ramazan',
    date: '2026-02-28',
    lang: 'ru',
    visits: 2,
    text: 'Допшы арена самый крутое поле. Все есть магазин кафетерий. Внутри тепло, мы в турнир участвуем. Еще раз придем.',
  },
  {
    id: 'a4',
    division: 'arena',
    author: 'Бекзат Шамшиден',
    date: '2026-08-23',
    lang: 'kk',
    visits: 1,
    text: 'Допшы Арена басшылығына үлкен рақмет. Қайырымдылық шарасында аренаны тегін берді.',
  },
  {
    id: 'a5',
    division: 'arena',
    author: 'Abulkhair',
    date: '2025-12-21',
    lang: 'ru',
    text: 'Покрытие ровное, без ям и опасных участков, мяч катится стабильно. Разметка четкая и хорошо видна. Ворота крепкие, сетки целые.',
  },
  {
    id: 's1',
    division: 'school',
    author: 'Айгуль Бейсенова',
    date: '2026-08-30',
    lang: 'ru',
    visits: 4,
    text: 'Ребенок ходит на тренировки с огромным удовольствием, всегда возвращается с горящими глазами. Тренер умеет найти подход к каждому ребенку…',
  },
  {
    id: 's2',
    division: 'school',
    author: 'Айгерим',
    date: '2026-08-31',
    lang: 'ru',
    visits: 4,
    text: 'Наш тренер Данияр не только обучает детей футболу, но и воспитывает в них дисциплину, уверенность в себе, командный дух и стремление к победе.',
  },
  {
    id: 's3',
    division: 'school',
    author: 'Айбар Ерлан',
    date: '2026-08-30',
    lang: 'ru',
    visits: 3,
    text: 'Хожу уже сюда 2 года. Часто занимаем 1 место на турнирах. Тренеры очень хорошие.',
  },
  {
    id: 's4',
    division: 'school',
    author: 'Салтанат Ожекенова',
    date: '2026-04-22',
    lang: 'ru',
    text: 'Младший сын Арлен занимается футболом… Именно благодаря ей ребёнок влюбился в футбол.',
  },
  {
    id: 's5',
    division: 'school',
    author: 'Inabat Музалбек',
    date: '2026-02-26',
    lang: 'kk',
    visits: 3,
    text: 'Өте керемет, Данияр самай кайфовый тренер, көптеген қызықты сәттер болды.',
  },
  {
    id: 'b1',
    division: 'boxing',
    author: 'Игорь Син',
    date: '2026-09-02',
    lang: 'ru',
    visits: 9,
    text: 'Ходит сын на бокс. Все отлично! Тренер Адильханов Асхат Адильханович настоящий профи своего дела. Рекомендую!',
  },
  {
    id: 'b2',
    division: 'boxing',
    author: 'Салтанат Ожекенова',
    date: '2026-04-22',
    lang: 'ru',
    text: 'Старший сын Арсен занимается боксом на втором этаже. Тренер Тимур — наш абсолютный фаворит… стал увереннее, появилось умение постоять за себя.',
  },
  {
    id: 'b3',
    division: 'boxing',
    author: 'Sabilyan Bakyt',
    date: '2025-11-28',
    lang: 'ru',
    visits: 9,
    text: 'Атмосфера рабочая, оборудование в хорошем состоянии. Чувствуется дисциплина, но без лишнего давления.',
  },
]
export const INSTAGRAM: Record<
  Division,
  {
    handle: string
    url: string
    avatar: string
    followers: number
    posts: number
    key: 'arena' | 'fs' | 'boxy'
    postLinks: string[]
  }
> = {
  arena: {
    handle: 'dopsy_arena',
    url: 'https://www.instagram.com/dopsy_arena/',
    avatar: 'dopsy_arena',
    followers: 3228,
    posts: 307,
    key: 'arena',
    postLinks: [
      'p/DPxFAsLjKqe',
      'p/DPvTIvwjKwj',
      'p/DPxE_O4jBNF',
      'reel/DR9LTb5jLjt',
      'reel/DRz97ZSjJ2w',
      'reel/DRzSWk2DI9z',
    ].map((p) => `https://www.instagram.com/dopsy_arena/${p}/`),
  },
  school: {
    handle: 'fs.dopsy',
    url: 'https://www.instagram.com/fs.dopsy/',
    avatar: 'fs_dopsy',
    followers: 1768,
    posts: 59,
    key: 'fs',
    postLinks: [],
  },
  boxing: {
    handle: 'boxy.academy',
    url: 'https://www.instagram.com/boxy.academy/',
    avatar: 'boxy_academy',
    followers: 650,
    posts: 52,
    key: 'boxy',
    postLinks: [],
  },
}
