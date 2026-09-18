import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      // Only the homepage and the booking sign-up page (/verify) are meant
      // to be discoverable via search. Everything else here is either a
      // code-gated page that should never be a search-landing target
      // (book, checkin) or a secondary page we'd rather not show as a
      // separate search result at all. Disallowing /book and /checkin by
      // path already blocks their ?code= variants too — robots.txt matches
      // by path prefix regardless of query string — so no separate ?code=
      // wildcard rule is needed (one would also catch /verify?code=, which
      // is the one link we want to stay indexable).
      disallow: [
        '/book',
        '/checkin',
        '/mentors',
        '/login',
        '/terms',
      ],
    },
  }
}
