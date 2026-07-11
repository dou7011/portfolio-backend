import { Hono } from 'hono'
import type { D1Database } from '@cloudflare/workers-types'
import { authGuard } from '../../middleware/authGuard'
import { getResumeController, updateResumeController } from './resume.controller'
import { permissionGuard } from '../../middleware/permissionGuard'

type Bindings = {
  DB: D1Database
  JWT_SECRET: string
}

const resume = new Hono<{ Bindings: Bindings }>({ strict: false })

// 前台公開讀取指定語言的履歷
resume.get('/:lang', getResumeController)

// 後台管理員更新履歷 (可更新英文或中文)
resume.put('/',
  authGuard,
  permissionGuard('resume:edit'),
  updateResumeController)

export default resume