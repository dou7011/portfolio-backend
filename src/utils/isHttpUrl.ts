// 僅允許 http(s) 協議，擋掉 javascript:、data: 等非預期 scheme。空字串視為「未填」。
export const isOptionalHttpUrl = (value: unknown): boolean => {
  if (value === undefined || value === null || value === '') return true
  if (typeof value !== 'string') return false
  try {
    const { protocol } = new URL(value.trim())
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}
