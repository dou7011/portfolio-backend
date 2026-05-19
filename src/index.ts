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
app.use(
  '/*',
  cors({
    // 動態檢查來源 (origin)
    origin: (origin, c) => {
      // 1. 建立您的白名單 (包含本地開發網址與正式上線網址)
      const whitelist = [
        'http://localhost:4200',        // Angular 本地開發預設 Port
        'https://portfolio-frontend-4fl.pages.dev/',  // 您 Angular 正式上線的網域
      ];

      // 2. 如果請求來源在白名單內，就回傳該來源 (允許通過)
      if (whitelist.includes(origin)) {
        return origin; 
      }
      
      // 3. 如果不在白名單內，回傳 null 或不回傳 (瀏覽器就會擋下 CORS)
      return null; 
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    
    // 如果您的前端 Angular 有設定 withCredentials: true，後端這裡就必須設為 true
    credentials: true, 
  })
)

// 基礎網頁測試
app.get('/', (c) => c.text('Portfolio Backend 運作正常！'))

// 🔌 核心路由對接 (將子模組掛載到指定的網址前綴)
app.route('/api/auth', authApp)     // 所有發往 /api/auth/* 的請求會進到 auth.ts
app.route('/api/resume', resumeApp) // 所有發往 /api/resume/* 的請求會進到 resume.ts

export default app