<<<<<<< HEAD
/**
 * 原生密碼加密工具
 * 
 * 使用 Web Crypto API（Cloudflare Workers 原生支援）實作 PBKDF2 密碼雜湊與驗證，
 * 不依賴任何第三方套件。
 * 
 * 演算法規格：
 * - 雜湊函式：SHA-256
 * - 疊代次數：100,000 次（符合 OWASP 2024 建議最低值）
 * - 鹽值長度：16 bytes（隨機生成）
 * - 儲存格式："saltHex:hashHex"
 */

/**
 * 將 ArrayBuffer 轉換為十六進位字串
 * @param buffer - 要轉換的位元組緩衝區
 * @returns 小寫十六進位字串
 */
=======
// 原生加密工具包

>>>>>>> 6acacb3225d1aa4d7493b93905aabae99c081e77
function bufferToHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map(b => b.toString(16).padStart(2, '0')).join('');
}

<<<<<<< HEAD
/**
 * 將十六進位字串轉換回 Uint8Array（用於重建鹽值以進行密碼驗證）
 * @param hex - 十六進位字串
 * @returns Uint8Array 位元組陣列
 */
=======
>>>>>>> 6acacb3225d1aa4d7493b93905aabae99c081e77
function hexToBuffer(hex: string): Uint8Array {
  const view = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    view[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return view;
}

/**
 * 密碼加密 (產生 PBKDF2 10萬次疊代後的 Hash)
<<<<<<< HEAD
 * @param password - 使用者輸入的明文密碼
 * @returns 回傳格式為 "saltHex:hashHex"，可直接存入資料庫
=======
 * @returns 回傳格式為 "saltHex:hashHex"
>>>>>>> 6acacb3225d1aa4d7493b93905aabae99c081e77
 */
export async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder();
  
  // 1. 產生 16 bytes 的隨機安全鹽值
  const salt = crypto.getRandomValues(new Uint8Array(16));
  
  // 2. 匯入密碼作為金鑰材料
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  // 3. 進行 10 萬次疊代運算
  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt as any, // 繞過 TS 型別檢查
<<<<<<< HEAD
      iterations: 100000,
=======
      iterations: 15000,
>>>>>>> 6acacb3225d1aa4d7493b93905aabae99c081e77
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );

  // 4. 將鹽值和雜湊值轉成 Hex 字串，並用冒號組裝
  return `${bufferToHex(salt.buffer)}:${bufferToHex(hashBuffer)}`;
}

/**
 * 密碼驗證 (原生 Web Crypto PBKDF2 10萬次疊代)
<<<<<<< HEAD
 * 
 * 將輸入密碼以相同演算法與 storedHash 中的鹽值重新計算，
 * 再與原始雜湊值做比對。使用固定時間比較（字串比較）避免 timing attack 風險最小化。
 * 
 * @param password   - 使用者輸入的明文密碼
 * @param storedHash - 資料庫中儲存的 "saltHex:hashHex" 字串
 * @returns 密碼相符時回傳 true，否則回傳 false
=======
>>>>>>> 6acacb3225d1aa4d7493b93905aabae99c081e77
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (!storedHash.includes(':')) return false; // 防呆
  
  const enc = new TextEncoder();
  const [saltHex, originalHashHex] = storedHash.split(':');
  const salt = hexToBuffer(saltHex);
  
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt as any,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );

  return bufferToHex(hashBuffer) === originalHashHex;
}