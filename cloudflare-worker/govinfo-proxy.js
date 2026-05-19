/**
 * Legal Red Line — GovInfo CORS Proxy
 * Cloudflare Worker (free tier: 100 000 req/day)
 *
 * DEPLOY INSTRUCTIONS (one time, ~5 minutes):
 * ─────────────────────────────────────────────
 * 1. Go to https://dash.cloudflare.com  →  sign up free (no credit card)
 * 2. Left sidebar → "Workers & Pages" → "Create" → "Create Worker"
 * 3. Name it:  govinfo-proxy
 * 4. Click "Edit code", delete the default code, paste ALL of this file
 * 5. Click "Deploy"
 * 6. Copy the *.workers.dev URL shown at the top (e.g. govinfo-proxy.your-name.workers.dev)
 * 7. In legal-redline/src/services/api.js, replace the GOVINFO_PROXY line with your URL
 * ─────────────────────────────────────────────
 * How it works:
 *   Browser calls → https://govinfo-proxy.YOUR.workers.dev/packages/USCODE-2022-title26/granules?...
 *   Worker fetches → https://api.govinfo.gov/packages/USCODE-2022-title26/granules?...
 *   Adds CORS header → returns response to browser
 */

const GOVINFO_ORIGIN = 'https://api.govinfo.gov'

// Only allow requests from your GitHub Pages site (swap in your domain once live)
const ALLOWED_ORIGINS = [
  'https://jamisonsites.github.io',
  'http://localhost:5173',      // local dev
  'http://localhost:4173',      // local preview
]

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin') || ''

    // Handle preflight CORS requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(origin),
      })
    }

    // Only proxy GET requests
    if (request.method !== 'GET') {
      return new Response('Method not allowed', { status: 405 })
    }

    // Build the GovInfo URL: strip the worker prefix, keep path + query string
    const url        = new URL(request.url)
    const govInfoUrl = `${GOVINFO_ORIGIN}${url.pathname}${url.search}`

    try {
      const upstream = await fetch(govInfoUrl, {
        headers: { 'User-Agent': 'Legal-Red-Line/1.0' },
        cf: { cacheTtl: 3600, cacheEverything: true },  // cache responses 1 hr
      })

      // Forward the body and status, add CORS headers
      const response = new Response(upstream.body, {
        status:  upstream.status,
        headers: {
          'Content-Type':  upstream.headers.get('Content-Type') || 'application/json',
          'Cache-Control': 'public, max-age=3600',
          ...corsHeaders(origin),
        },
      })
      return response

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status:  502,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      })
    }
  },
}

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin':  allowed,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age':       '86400',
  }
}
