/**
 * JWT 身份驗證中介層
 * 
 * 職責：
 * 1. 從請求的 Authorization header 提取 Bearer token
 * 2. 驗證 JWT 簽章的合法性（HS256 演算法）
 * 3. 以 token 中的 user ID 查詢 DB，取得完整的角色與權限清單
 * 4. 確認帳號為啟用狀態（is_active = 1）
 * 5. 將 { id, email, roles, permissions } 注入 Hono Context，
 *    供下游 permissionGuard 與 controller 直接使用
 * 
 * 注意：此中介層每次請求都會執行一次五表 JOIN 查詢，
 * 高流量下可考慮改為在 JWT Payload 內嵌權限（見健檢報告第 3 項）。
 */
import { Next, Context } from 'hono'
import type { D1Database } from '@cloudflare/workers-types'
import { verify } from 'hono/jwt'

// 1. 外部環境綁定（Cloudflare Workers 注入）
type Bindings = {
  DB: D1Database
  JWT_SECRET: string
}

// 2. 跨中介層傳遞的變數型別（存放於 Hono Context 中）
type Variables = {
  /** authGuard 驗證後注入的使用者資料，包含角色與權限清單 */
  user: {
    id: number
    email: string
    roles: string[]
    permissions: string[]
  }
}

// 3. 組裝 Hono 泛型 Env（符合 Hono 官方標準模式）
type HonoEnv = {
  Bindings: Bindings
  Variables: Variables
}

/**
 * authGuard 中介層主體
 * 
 * 呼叫方式（掛在路由或全域）：
 *   route.use('*', authGuard)
 *   route.get('/:id', authGuard, myController)
 */
export const authGuard = async (c: Context<HonoEnv>, next: Next) => {
  // --- Step 1: 提取並基本驗證 Authorization header 格式 ---
  const authHeader = c.req.header('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ success: false, message: '未提供授權憑證' }, 401)
  }

  const token = authHeader.split(' ')[1]

  try {
    // --- Step 2: 驗證 JWT 簽章，取出 user ID ---
    const decodedPayload = await verify(token, c.env.JWT_SECRET, 'HS256') as { id: number }
    const userId = decodedPayload.id

    // --- Step 3: 查詢使用者完整的角色與權限清單（五表 JOIN）---
    const { results } = await c.env.DB.prepare(`
      SELECT 
        u.id, u.email, u.is_active, 
        r.name AS role_name, 
        p.action AS permission_action
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      LEFT JOIN permissions p ON rp.permission_id = p.id
      WHERE u.id = ?
    `).bind(userId).all();

    if (!results || results.length === 0) return c.json({ success: false, message: '帳號不存在' }, 401);

    const row = results[0] as any;

    // --- Step 4: 確認帳號為啟用狀態 ---
    if (row.is_active === 0) return c.json({ success: false, message: '帳號已被停用' }, 403);

    // --- Step 5: 去重後聚合角色與權限，注入 Context ---
    const roles = [...new Set(results.map((r: any) => r.role_name).filter(Boolean))];
    const permissions = [...new Set(results.map((r: any) => r.permission_action).filter(Boolean))];

    c.set('user', {
      id: Number(row.id),
      email: String(row.email),
      roles,
      permissions
    });

    await next();
  } catch (error) {
    // JWT 驗證失敗（簽章錯誤、格式錯誤、已過期）一律回 401
    return c.json({ success: false, message: '憑證無效或已過期' }, 401)
  }
}