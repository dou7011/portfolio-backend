/**
 * Hono App 入口
 * 
 * 職責：
 * 1. 定義環境型別（Bindings）：D1 資料庫、JWT 密鑰、CORS 白名單
 * 2. 設定全域 CORS 中介層（動態白名單，來源由 wrangler.jsonc ALLOWED_ORIGINS 控制）
 * 3. 掛載各功能子路由模組（auth / resume / users）
 * 4. 提供基礎健康檢查端點 GET /
 */
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { D1Database } from '@cloudflare/workers-types'
import authApp from './modules/auth/auth.route'
import resumeApp from './modules/resume/resume.route'
import usersApp from './modules/users/users.route'

/** Cloudflare Workers 環境變數與資源綁定型別 */
type Bindings = {
  /** D1 資料庫，對應 wrangler.jsonc 中的 binding 名稱 */
  DB: D1Database
  /** JWT 簽章密鑰，透過 Cloudflare Workers Secret 注入 */
  JWT_SECRET: string
  /** CORS 允許的來源網域，以逗號分隔多個值，例如 "http://localhost:4200,https://example.com" */
  ALLOWED_ORIGINS: string
}

const app = new Hono<{ Bindings: Bindings }>({ strict: false })

// 全域啟用 CORS（所有路由 /*）
app.use(
  '/*',
  cors({
    /**
     * 動態 origin 驗證：
     * 從環境變數讀取逗號分隔的白名單，只允許白名單內的來源通過。
     * 回傳 origin 字串 = 允許；回傳 null = 瀏覽器攔截（CORS 錯誤）。
     */
    origin: (origin, c) => {
      // 1. 從環境變數讀取字串，並以逗號分隔轉換為陣列，同時清除多餘空白
      const whitelist = c.env.ALLOWED_ORIGINS.split(',').map(url => url.trim());

      // 2. 如果請求來源在白名單內，就回傳該來源 (允許通過)
      // (origin 必須存在才做檢查，避免非瀏覽器請求報錯)
      if (origin && whitelist.includes(origin)) {
        return origin; 
      }
      
      // 3. 如果不在白名單內，回傳 null (瀏覽器就會擋下 CORS)
      return null; 
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    
    // 如果前端 Angular 有設定 withCredentials: true，後端這裡就必須設為 true
    credentials: true, 
  })
)

// 健康檢查端點（無需驗證，供 Cloudflare 監控或前端確認服務狀態）
app.get('/', (c) => c.text('Portfolio Backend 運作正常！'))

// 子路由模組掛載（各模組路由定義在 src/modules/*/）
app.route('/api/auth', authApp)     // 所有發往 /api/auth/* 的請求會進到 auth.route.ts
app.route('/api/resume', resumeApp) // 所有發往 /api/resume/* 的請求會進到 resume.route.ts
app.route('/api/users', usersApp)   // 所有發往 /api/users/* 的請求會進到 users.route.ts

export default app