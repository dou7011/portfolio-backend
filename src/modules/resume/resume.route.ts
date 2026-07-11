/**
 * 履歷模組路由定義
 * 
 * 掛載於 /api/resume（由 src/index.ts 設定前綴）
 * 
 * 路由清單：
 * - GET /api/resume/:lang  — 公開端點，讀取指定語言的履歷（lang: 'zh' | 'en'）
 * - PUT /api/resume        — 受保護端點，需 authGuard + resume:edit 權限，更新履歷內容
 */
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