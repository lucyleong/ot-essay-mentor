import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      // Only the homepage and the booking sign-up page are meant to be
      // discoverable via search. Everything else here is either a
      // code-gated page (book, checkin — and any URL carrying a ?code=
      // access code should never be indexed) or a secondary page we'd
      // rather not show as a separate search result at all.
      disallow: [
        '/book',
        '/checkin',
        '/*?code=*',
        '/mentors',
        '/login',
        '/terms',
      ],
    },
  }
}
