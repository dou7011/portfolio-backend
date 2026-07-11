/**
 * 原生密碼加密工具。
 *
 * 使用 Web Crypto API 實作 PBKDF2 雜湊與驗證，
 * 可直接在 Cloudflare Workers 上使用。
 */
function bufferToHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map(b => b.toString(16).padStart(2, '0')).join('')
}

function hexToBuffer(hex: string): Uint8Array {
  const view = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    view[i / 2] = parseInt(hex.substring(i, i + 2), 16)
  }
  return view
}

/**
 * 建立 PBKDF2 雜湊。
 */
export async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder()
  const salt = crypto.getRandomValues(new Uint8Array(16))

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  )

  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt as any,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  )

  return `${bufferToHex(salt.buffer)}:${bufferToHex(hashBuffer)}`
}

/**
 * 驗證使用者輸入密碼是否與雜湊相符。
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (!storedHash.includes(':')) return false

  const enc = new TextEncoder()
  const [saltHex, originalHashHex] = storedHash.split(':')
  const salt = hexToBuffer(saltHex)

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  )

  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt as any,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  )

  return bufferToHex(hashBuffer) === originalHashHex
}