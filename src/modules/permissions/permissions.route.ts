import { Hono } from 'hono'
import { authGuard } from '../../middleware/authGuard'
import { permissionGuard } from '../../middleware/permissionGuard'
import { PERMISSIONS } from '../../constants/permissions'
import { getPermissionsController } from './permissions.controller'

const permissions = new Hono()

// 全域套用 authGuard (讓這份路由底下所有的 API 都必須先登入)
permissions.use('*', authGuard)

// 檢視權限列表 (需具備 permissions:read 權限)
permissions.get('/', permissionGuard(PERMISSIONS.PERMISSIONS_READ), getPermissionsController)

export default permissions