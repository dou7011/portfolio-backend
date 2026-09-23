import { Hono } from 'hono'
import { authGuard } from '../../middleware/authGuard'
import { getImageController, uploadImageController } from './upload.controller'
import { permissionGuard } from '../../middleware/permissionGuard'
import { PERMISSIONS } from '../../constants/permissions'
import type { AppEnv } from '../../types'

// Upload 模組路由：提供上傳與讀取圖片的端點。
const upload = new Hono<AppEnv>({ strict: false })

// 上傳圖片，需先通過身份驗證與權限檢查。
upload.post(
    '/',
    authGuard,
    permissionGuard(PERMISSIONS.ARTICLE_WRITE),
    uploadImageController
)

// 讀取圖片，為公開端點。
upload.get('/images/:yearMonth/:filename', getImageController)

export default upload