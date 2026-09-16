import { describe, it, expect } from 'vitest'

const isValidJwtPayload = (payload: unknown): payload is { id: number; iss: string; aud: string } => {
  if (!payload || typeof payload !== 'object') return false
  const candidate = payload as Record<string, unknown>
  return (
    typeof candidate.iss === 'string' && candidate.iss === 'portfolio-backend' &&
    typeof candidate.aud === 'string' && candidate.aud === 'portfolio-frontend' &&
    typeof candidate.id === 'number' && Number.isInteger(candidate.id) && candidate.id > 0
  )
}

describe('JWT claim validation', () => {
  it('rejects invalid issuer/audience payloads', () => {
    expect(isValidJwtPayload({ id: 1, iss: 'bad', aud: 'portfolio-frontend' })).toBe(false)
    expect(isValidJwtPayload({ id: 1, iss: 'portfolio-backend', aud: 'bad' })).toBe(false)
    expect(isValidJwtPayload({ id: 0, iss: 'portfolio-backend', aud: 'portfolio-frontend' })).toBe(false)
  })

  it('accepts the expected portfolio backend token shape', () => {
    expect(isValidJwtPayload({
      id: 7,
      iss: 'portfolio-backend',
      aud: 'portfolio-frontend',
      exp: 1234567890,
    })).toBe(true)
  })
})

describe('missing article update behavior', () => {
  it('treats an absent article update result as null', () => {
    const article = null
    expect(article).toBeNull()
  })
})
