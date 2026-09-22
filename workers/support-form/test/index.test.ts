import { describe, expect, it, vi } from 'vitest'
import { handleRequest, type Env } from '../src/index'

const env: Env = { ALLOWED_ORIGIN: 'https://trancore.github.io', GITHUB_OWNER: 'trancore', GITHUB_REPOSITORY: 'onaka_diary', GITHUB_TOKEN: 'test-token', TURNSTILE_SECRET_KEY: 'test-secret' }
const payload = { email: 'user@example.com', subject: '通知について', message: '通知が届きません。', turnstileToken: 'turnstile-token' }
const request = (body = payload, headers: HeadersInit = {}) => new Request('https://support.example.workers.dev/support', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: env.ALLOWED_ORIGIN, 'CF-Connecting-IP': '192.0.2.1', ...headers }, body: JSON.stringify(body) })

describe('handleRequest', () => {
  it('creates an issue after validating a support request', async () => {
    const fetchImplementation = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response(JSON.stringify({ success: true, action: 'support_form' }))).mockResolvedValueOnce(new Response('{}', { status: 201 }))
    const response = await handleRequest(request(), env, fetchImplementation)
    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({ success: true })
    expect(String(fetchImplementation.mock.calls[1][0])).toBe('https://api.github.com/repos/trancore/onaka_diary/issues')
  })
  it('rejects an unapproved origin before processing data', async () => {
    const fetchImplementation = vi.fn<typeof fetch>()
    expect((await handleRequest(request(payload, { Origin: 'https://attacker.example' }), env, fetchImplementation)).status).toBe(403)
    expect(fetchImplementation).not.toHaveBeenCalled()
  })
  it('rejects invalid input without creating an issue', async () => {
    const fetchImplementation = vi.fn<typeof fetch>()
    expect((await handleRequest(request({ ...payload, email: 'invalid' }), env, fetchImplementation)).status).toBe(400)
    expect(fetchImplementation).not.toHaveBeenCalled()
  })
  it('rejects a failed Turnstile verification', async () => {
    const fetchImplementation = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response(JSON.stringify({ success: false })))
    expect((await handleRequest(request(), env, fetchImplementation)).status).toBe(403)
  })
  it('returns a generic error when GitHub cannot create the issue', async () => {
    const fetchImplementation = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response(JSON.stringify({ success: true, action: 'support_form' }))).mockResolvedValueOnce(new Response('{}', { status: 500 }))
    expect((await handleRequest(request(), env, fetchImplementation)).status).toBe(502)
  })
})
