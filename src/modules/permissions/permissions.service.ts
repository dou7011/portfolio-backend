// Permissions 服務，負責從資料庫讀取系統權限清單。
import type { D1Database } from '@cloudflare/workers-types'

export type PermissionItem = {
  id: number;
  action: string;
  description: string | null;
}

/**
 * 取得系統中所有的權限原子清單
 */
export const getAllPermissionsService = async (db: D1Database): Promise<PermissionItem[]> => {
  const { results } = await db.prepare(
    'SELECT id, action, description FROM permissions'
  ).all();

  return results as PermissionItem[];
}