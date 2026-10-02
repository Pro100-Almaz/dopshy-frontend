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

// Booking lives on the Arena page (components/Booking.vue), as in the design.
export const BOOKING_PATH = to('arena', 'booking')

export const ASSETS = '/landing/'
