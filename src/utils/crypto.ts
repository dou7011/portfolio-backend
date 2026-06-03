// 原生加密工具包

function bufferToHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function hexToBuffer(hex: string): Uint8Array {
  const view = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    view[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return view;
}

/**
 * 密碼加密 (產生 PBKDF2 10萬次疊代後的 Hash)
 * @returns 回傳格式為 "saltHex:hashHex"
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
      iterations: 15000,
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