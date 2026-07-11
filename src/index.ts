/**
 * Hono App 入口。
 *
 * 此檔案負責設定全域 CORS、掛載各功能模組路由，並提供基礎健康檢查端點。
 */
import { Context, Hono } from 'hono'
import { cors } from 'hono/cors'
import authApp from './modules/auth/auth.route'
import resumeApp from './modules/resume/resume.route'
import usersApp from './modules/users/users.route'
import rolesApp from './modules/roles/roles.route'
import permissionsApp from './modules/permissions/permissions.route'
import type { AppEnv } from './types'

// 建立 Hono 應用實例，所有 API 入口都由此統一掛載。
const app = new Hono<AppEnv>({ strict: false })

// 全域 CORS 設定，依環境白名單限制可接受的來源。
app.use(
  '/*',
  cors({
    origin: (origin: string | undefined, c: Context<AppEnv>) => {
      const whitelist: string[] = []
      for (const rawUrl of c.env.ALLOWED_ORIGINS.split(',')) {
        const trimmedUrl = rawUrl.trim()
        if (trimmedUrl) {
          whitelist.push(trimmedUrl)
        }
      }
      if (origin && whitelist.includes(origin)) {
        return origin
      }
      return null
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
)

app.get('/', (c) => c.text('Portfolio Backend 運作正常！'))

app.route('/api/auth', authApp)
app.route('/api/resume', resumeApp)
app.route('/api/users', usersApp)
app.route('/api/roles', rolesApp)
app.route('/api/permissions', permissionsApp)

export default app