// Cloudflare Worker entry point for "הביס הבא".
// - Routes /api/* to the JSON API (backed by D1)
// - Serves the static frontend (src/frontend) via the [assets] binding for everything else
//
// One Worker serves both the API and the site — simple to deploy, minimal moving parts.

import { handleRestaurants } from './routes/restaurants.js';

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  'access-control-allow-headers': 'content-type',
};

function withCors(resp) {
  const h = new Headers(resp.headers);
  for (const [k, v] of Object.entries(CORS)) h.set(k, v);
  return new Response(resp.body, { status: resp.status, headers: h });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;

    // Preflight
    if (request.method === 'OPTIONS' && pathname.startsWith('/api/')) {
      return new Response(null, { status: 204, headers: CORS });
    }

    // API routing
    if (pathname === '/api/restaurants' || pathname === '/api/restaurants/') {
      return withCors(await handleRestaurants(request, env, null));
    }
    const m = pathname.match(/^\/api\/restaurants\/([^/]+)\/?$/);
    if (m) {
      const id = decodeURIComponent(m[1]);
      return withCors(await handleRestaurants(request, env, id));
    }
    if (pathname === '/api/health') {
      return withCors(new Response(JSON.stringify({ ok: true, ts: new Date().toISOString() }), {
        headers: { 'content-type': 'application/json' },
      }));
    }
    if (pathname.startsWith('/api/')) {
      return withCors(new Response(JSON.stringify({ error: 'not found' }), {
        status: 404, headers: { 'content-type': 'application/json' },
      }));
    }

    // Everything else -> static frontend assets.
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }
    return new Response('Frontend assets binding (ASSETS) not configured.', { status: 500 });
  },
};
