import assert from 'node:assert/strict'
import { test } from 'node:test'
import { requestOrigin } from '../src/lib/request-origin.ts'

// metadataBase for the invite page: og:image is resolved against it, so a link opened on host A previews on host A
const headers = (map) => ({ get: (name) => map[name.toLowerCase()] ?? null })
const vercel = { VERCEL_PROJECT_PRODUCTION_URL: 'auswahl.athletesusa.org', VERCEL_URL: 'showcase-coordinator-abc123.vercel.app' }

test('a request on host A yields a base on host A, whatever Vercel lists as the production URL', () => {
  assert.equal(requestOrigin(headers({ 'x-forwarded-host': 'showcase-coordinator.vercel.app', 'x-forwarded-proto': 'https', host: 'internal' }), vercel).href, 'https://showcase-coordinator.vercel.app/')
  assert.equal(requestOrigin(headers({ 'x-forwarded-host': 'auswahl.athletesusa.org', 'x-forwarded-proto': 'https' }), vercel).href, 'https://auswahl.athletesusa.org/')
  assert.equal(new URL('/invite/t/opengraph-image', requestOrigin(headers({ host: 'showcase-coordinator.vercel.app' }), vercel)).href, 'https://showcase-coordinator.vercel.app/invite/t/opengraph-image')
})

test('host header only: https, except on localhost; a comma list takes its first entry', () => {
  assert.equal(requestOrigin(headers({ host: 'showcase-coordinator.vercel.app' }), {}).href, 'https://showcase-coordinator.vercel.app/')
  assert.equal(requestOrigin(headers({ host: 'localhost:3000' }), {}).href, 'http://localhost:3000/')
  assert.equal(requestOrigin(headers({ 'x-forwarded-host': 'a.example.test, proxy.internal', 'x-forwarded-proto': 'https, http' }), {}).href, 'https://a.example.test/')
})

test('no usable request: the Vercel URL, else nothing; a header that is not a host name is ignored', () => {
  assert.equal(requestOrigin(headers({}), vercel).href, 'https://auswahl.athletesusa.org/')
  assert.equal(requestOrigin(headers({}), { VERCEL_URL: 'showcase-coordinator-abc123.vercel.app' }).href, 'https://showcase-coordinator-abc123.vercel.app/')
  assert.equal(requestOrigin(headers({}), {}), undefined)
  assert.equal(requestOrigin(headers({ host: 'evil.test/path?x=1' }), vercel).href, 'https://auswahl.athletesusa.org/')
  assert.equal(requestOrigin(headers({ host: 'ok.test', 'x-forwarded-proto': 'javascript' }), vercel).href, 'https://auswahl.athletesusa.org/')
})
