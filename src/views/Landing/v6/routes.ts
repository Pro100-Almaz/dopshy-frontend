export type LandingRoute = 'home' | 'arena' | 'school' | 'boxing' | 'contacts'

// `/boxing` is taken by the admin academy section, so the public boxing page lives at `/boxy`.
export const PATHS: Record<LandingRoute, string> = {
  home: '/',
  arena: '/arena',
  school: '/school',
  boxing: '/boxy',
  contacts: '/contacts',
}

export const to = (route: LandingRoute, section?: string) => ({
  path: PATHS[route],
  hash: section ? `#${section}` : '',
})

// Real booking flow (views/Booking) replaces the design's demo slot grid.
export const BOOKING_PATH = '/booking'

export const ASSETS = '/landing/'
