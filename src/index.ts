import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { D1Database } from '@cloudflare/workers-types'
import authApp from './routes/auth'
import resumeApp from './routes/resume'

type Bindings = {
  DB: D1Database
  JWT_SECRET: string
}

const app = new Hono<{ Bindings: Bindings }>()

// 全域啟用 CORS
app.use('/*', cors({
  origin: '*', 
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

// 基礎網頁測試
app.get('/', (c) => c.text('Portfolio Backend 運作正常！'))

// 🔌 核心路由對接 (將子模組掛載到指定的網址前綴)
app.route('/api/auth', authApp)     // 所有發往 /api/auth/* 的請求會進到 auth.ts
app.route('/api/resume', resumeApp) // 所有發往 /api/resume/* 的請求會進到 resume.ts

export default app