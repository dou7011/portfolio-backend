import { Hono } from 'hono'
import { authGuard } from '../../middleware/authGuard'
import { getResumeController, updateResumeController } from './resume.controller'
import { permissionGuard } from '../../middleware/permissionGuard'
import { PERMISSIONS } from '../../constants/permissions'
import type { AppEnv } from '../../types'

// Resume 模組路由：對外提供履歷的讀取與更新能力。
const resume = new Hono<AppEnv>({ strict: false })

// 依語系讀取履歷內容，為公開端點。
resume.get('/:lang', getResumeController)

// 更新履歷內容，需先通過身份驗證與權限檢查。
resume.put(
  '/',
  authGuard,
  permissionGuard(PERMISSIONS.RESUME_UPDATE),
  updateResumeController
)

export default resume