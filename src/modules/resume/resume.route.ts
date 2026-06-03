import { Hono } from 'hono'
import { authGuard } from '../../middleware/authGuard'
import { getResumeController, updateResumeController } from './resume.controller'
import { permissionGuard } from '../../middleware/permissionGuard'
import { PERMISSIONS } from '../../constants/permissions'
import type { AppEnv } from '../../types'

const resume = new Hono<AppEnv>({ strict: false })

// 前台公開讀取指定語言的履歷
resume.get('/:lang', getResumeController)

// 後台管理員更新履歷 (可更新英文或中文)
resume.put('/',
  authGuard,
  permissionGuard(PERMISSIONS.RESUME_UPDATE),
  updateResumeController)

export default resume