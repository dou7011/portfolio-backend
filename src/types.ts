/**
 * 全域共用型別定義
 * 
 * 這個檔案集中定義跨模組共用的型別，
 * 讓各 controller / middleware 不需重複宣告相同結構。
 */
import type { D1Database } from '@cloudflare/workers-types'

/**
 * 經 authGuard 驗證後，注入到 Hono Context 的使用者資料。
 * permissionGuard 直接從 Context 讀取此結構做 RBAC 判斷。
 */
export type AuthUser = {
  /** 使用者在 D1 資料庫中的主鍵 */
  id: number;
  /** 使用者信箱，也作為登入帳號 */
  email: string;
  /** 使用者所屬角色名稱陣列（例如 ['ADMIN']） */
  roles: string[];
  /** 使用者擁有的操作權限陣列（例如 ['resume:edit', 'user:read']） */
  permissions: string[];
}

/**
 * Hono app 的環境型別，泛型傳入後可讓 c.env 與 c.get() 獲得完整型別提示。
 * 
 * Bindings：Cloudflare Workers 的環境變數與資源綁定
 * Variables：透過 c.set() 在請求生命週期中傳遞的自訂資料
 */
export type AppEnv = {
  Bindings: {
    /** Cloudflare D1 資料庫綁定，對應 wrangler.jsonc 中的 binding 名稱 */
    DB: D1Database;
    /** JWT 簽章密鑰，透過 Cloudflare Workers Secret 注入 */
    JWT_SECRET: string;
  };
  Variables: {
    /** authGuard 驗證通過後注入，後續中介層與 controller 可直接讀取 */
    user: AuthUser;
  };
}