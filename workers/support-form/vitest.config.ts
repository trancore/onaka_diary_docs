import { defineConfig } from 'vitest/config'
export default defineConfig({ test: { include: ['workers/support-form/test/**/*.test.ts'] } })
