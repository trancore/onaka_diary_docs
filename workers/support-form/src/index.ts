export interface Env {
  ALLOWED_ORIGIN: string
  GITHUB_OWNER: string
  GITHUB_REPOSITORY: string
  GITHUB_TOKEN: string
  TURNSTILE_SECRET_KEY: string
}

type FetchImplementation = typeof fetch
interface SupportRequest { email: string; subject: string; message: string; turnstileToken: string }
const maxRequestBytes = 16 * 1024
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default {
  fetch(request: Request, env: Env): Promise<Response> { return handleRequest(request, env) },
} satisfies ExportedHandler<Env>

export async function handleRequest(request: Request, env: Env, fetchImplementation: FetchImplementation = fetch): Promise<Response> {
  const origin = request.headers.get('Origin')
  if (origin !== env.ALLOWED_ORIGIN) return json({ error: '許可されていない送信元です。' }, 403)
  if (new URL(request.url).pathname !== '/support') return json({ error: '見つかりません。' }, 404, origin)
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(origin) })
  if (request.method !== 'POST') return json({ error: 'この操作は許可されていません。' }, 405, origin)
  if (request.headers.get('Content-Type')?.split(';')[0] !== 'application/json') return json({ error: '送信形式が正しくありません。' }, 415, origin)
  if (Number(request.headers.get('Content-Length') ?? 0) > maxRequestBytes) return json({ error: '入力内容が長すぎます。' }, 413, origin)

  const payload = await parseSupportRequest(request)
  if (!payload) return json({ error: '入力内容を確認してください。' }, 400, origin)
  if (!await verifyTurnstile(payload.turnstileToken, request, env, fetchImplementation)) return json({ error: '迷惑送信対策の確認に失敗しました。再度お試しください。' }, 403, origin)
  if (!await createGitHubIssue(payload, env, fetchImplementation)) return json({ error: '送信に失敗しました。時間をおいて再度お試しください。' }, 502, origin)
  return json({ success: true }, 201, origin)
}

async function parseSupportRequest(request: Request): Promise<SupportRequest | null> {
  try {
    const value = await request.json() as Partial<SupportRequest>
    const email = value.email?.trim(); const subject = value.subject?.trim(); const message = value.message?.trim(); const turnstileToken = value.turnstileToken?.trim()
    if (!email || !emailPattern.test(email) || email.length > 254 || !subject || subject.length > 120 || /[\r\n]/.test(subject) || !message || message.length > 4000 || !turnstileToken || turnstileToken.length > 2048) return null
    return { email, subject, message, turnstileToken }
  } catch { return null }
}

async function verifyTurnstile(token: string, request: Request, env: Env, fetchImplementation: FetchImplementation): Promise<boolean> {
  try {
    const response = await fetchImplementation('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: token, remoteip: request.headers.get('CF-Connecting-IP') ?? '' }) })
    const result = await response.json() as { success?: boolean; action?: string }
    return result.success === true && result.action === 'support_form'
  } catch { return false }
}

async function createGitHubIssue(payload: SupportRequest, env: Env, fetchImplementation: FetchImplementation): Promise<boolean> {
  try {
    const response = await fetchImplementation(`https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPOSITORY}/issues`, {
      method: 'POST', headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${env.GITHUB_TOKEN}`, 'Content-Type': 'application/json', 'User-Agent': 'onaka-diary-support-form', 'X-GitHub-Api-Version': '2022-11-28' },
      body: JSON.stringify({ title: `お問い合わせ: ${payload.subject}`, body: ['## お問い合わせ', '', `- 受付日時（UTC）: ${new Date().toISOString()}`, `- メールアドレス: ${payload.email}`, '', '### 内容', '', payload.message].join('\n') }),
    })
    return response.status === 201
  } catch { return false }
}

function json(body: object, status: number, origin?: string): Response {
  const headers = new Headers({ 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=UTF-8' })
  if (origin) for (const [key, value] of corsHeaders(origin)) headers.set(key, value)
  return new Response(JSON.stringify(body), { status, headers })
}

function corsHeaders(origin: string): Headers {
  return new Headers({ 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400', Vary: 'Origin' })
}
