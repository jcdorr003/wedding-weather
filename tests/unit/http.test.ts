import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'
import { FetchError, friendlyError, getJSON } from '../../src/lib/api/http'
import { server, setupMockServer } from './msw'

setupMockServer()
const URL = 'https://api.weather.gov/test'

describe('getJSON', () => {
  it('retries server errors and returns the first good response', async () => {
    let calls = 0
    server.use(
      http.get(URL, () => (++calls < 3 ? new HttpResponse(null, { status: 503 }) : HttpResponse.json({ ok: true }))),
    )
    await expect(getJSON(URL)).resolves.toEqual({ ok: true })
    expect(calls).toBe(3)
  })

  it('gives up straight away on a client error', async () => {
    let calls = 0
    server.use(http.get(URL, () => (calls++, new HttpResponse(null, { status: 404 }))))
    await expect(getJSON(URL)).rejects.toMatchObject({ kind: 'http', status: 404 })
    expect(calls).toBe(1)
  })

  it('stops when the caller cancels', async () => {
    server.use(http.get(URL, () => new HttpResponse(null, { status: 503 })))
    const ctrl = new AbortController()
    const pending = getJSON(URL, { signal: ctrl.signal })
    ctrl.abort()
    await expect(pending).rejects.not.toBeInstanceOf(FetchError)
  })
})

describe('friendlyError', () => {
  it('explains each kind of failure in plain words', () => {
    expect(friendlyError(new FetchError('http', 503))).toMatch(/temporarily unavailable/)
    expect(friendlyError(new FetchError('http', 404))).toMatch(/error 404/)
    expect(friendlyError(new FetchError('timeout'))).toMatch(/responding slowly/)
    expect(friendlyError(new FetchError('empty'))).toMatch(/incomplete/)
    expect(friendlyError(new Error('boom'))).toMatch(/Couldn’t reach/)
  })
})
