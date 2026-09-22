<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: { sitekey: string; action: string }) => string
      reset: (widgetId?: string) => void
    }
  }
}

const endpoint = import.meta.env.VITE_SUPPORT_API_URL?.trim()
const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim()
const email = ref('')
const subject = ref('')
const message = ref('')
const isSubmitting = ref(false)
const feedback = ref('')
const isSuccess = ref(false)
const turnstileContainer = ref<HTMLElement>()
const turnstileWidgetId = ref<string>()
const isConfigured = computed(() => Boolean(endpoint && siteKey))

onMounted(async () => {
  if (!isConfigured.value || !turnstileContainer.value) return
  try {
    await loadTurnstile()
    if (!window.turnstile || !siteKey) return
    turnstileWidgetId.value = window.turnstile.render(turnstileContainer.value, { sitekey: siteKey, action: 'support_form' })
  } catch {
    feedback.value = '迷惑送信対策を読み込めませんでした。時間をおいて再度お試しください。'
  }
})

async function submit() {
  if (!endpoint || !siteKey || isSubmitting.value) return
  const turnstileToken = document.querySelector<HTMLInputElement>('input[name="cf-turnstile-response"]')?.value
  if (!turnstileToken) {
    feedback.value = '迷惑送信対策の確認を完了してから送信してください。'
    return
  }
  isSubmitting.value = true
  feedback.value = ''
  try {
    const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.value, subject: subject.value, message: message.value, turnstileToken }) })
    if (!response.ok) throw new Error('support request failed')
    email.value = ''
    subject.value = ''
    message.value = ''
    window.turnstile?.reset(turnstileWidgetId.value)
    isSuccess.value = true
    feedback.value = 'お問い合わせを受け付けました。返信までしばらくお待ちください。'
  } catch {
    isSuccess.value = false
    feedback.value = '送信に失敗しました。時間をおいて再度お試しください。'
  } finally {
    isSubmitting.value = false
  }
}

function loadTurnstile(): Promise<void> {
  if (window.turnstile) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>('script[data-turnstile]')
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true })
      existingScript.addEventListener('error', () => reject(new Error('Turnstile could not load')), { once: true })
      return
    }
    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    script.defer = true
    script.dataset.turnstile = 'true'
    script.addEventListener('load', () => resolve(), { once: true })
    script.addEventListener('error', () => reject(new Error('Turnstile could not load')), { once: true })
    document.head.append(script)
  })
}
</script>

<template>
  <p v-if="!isConfigured" class="support-form__notice">現在、お問い合わせフォームを準備中です。</p>
  <form v-else class="support-form" @submit.prevent="submit">
    <label>メールアドレス<input v-model.trim="email" type="email" maxlength="254" autocomplete="email" required></label>
    <label>件名<input v-model.trim="subject" type="text" maxlength="120" required></label>
    <label>お問い合わせ内容<textarea v-model.trim="message" rows="8" maxlength="4000" required /></label>
    <div ref="turnstileContainer" />
    <button type="submit" :disabled="isSubmitting">{{ isSubmitting ? '送信中…' : '送信する' }}</button>
    <p v-if="feedback" :class="isSuccess ? 'support-form__success' : 'support-form__error'" role="status">{{ feedback }}</p>
  </form>
</template>
