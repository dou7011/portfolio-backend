/**
 * 安全 JSON 解析工具
 * 
 * 背景：D1 資料庫的 JSON 欄位（例如 resumes.skills）以字串形式儲存，
 * 若直接使用裸 JSON.parse()，遇到 null、空字串或格式錯誤的資料時
 * 會直接拋出例外，導致整支 API 回傳 500，影響所有使用者。
 * 
 * 此工具統一封裝解析邏輯，確保單筆髒資料不會中斷正常讀取流程。
 */

/**
 * 解析 JSON 字串，失敗時回傳預設值而非拋出例外。
 * 
 * @param value   - 待解析的原始值（通常來自 DB 欄位）
 * @param fallback - 解析失敗或輸入無效時的預設回傳值
 * @returns 解析成功的物件，或 fallback 值
 * 
 * @example
 * safeJsonParse('["TypeScript"]', [])  // => ['TypeScript']
 * safeJsonParse(null, [])               // => []
 * safeJsonParse('not json', [])         // => []，並輸出 console.warn
 */
export function safeJsonParse<T>(value: unknown, fallback: T): T {
    if (typeof value !== 'string' || value.trim() === '') return fallback;
    try {
        return JSON.parse(value) as T;
    } catch {
        console.warn('[safeJsonParse] 無法解析 JSON，回傳預設值。原始值：', value);
        return fallback;
    }
}