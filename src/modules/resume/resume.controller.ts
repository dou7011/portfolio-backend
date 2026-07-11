import { Context } from 'hono'
import type { D1Database } from '@cloudflare/workers-types'
import { getResumeByLang, updateResume } from './resume.service'

type Bindings = {
  DB: D1Database
  JWT_SECRET: string
}

/**
 * 處理讀取履歷的 HTTP 請求與回應
 */
export const getResumeController = async (c: Context<{ Bindings: Bindings }>) => {
  const lang = c.req.param('lang') || 'zh'

  if (!['en', 'zh'].includes(lang)) {
    return c.json(
      { success: false, message: '語言參數無效 (必須是 "en" 或 "zh")' },
      400
    )
  }

  const resume = await getResumeByLang(c.env.DB, lang)

  if (!resume) {
    return c.json(
      { success: false, message: `找不到語言為 ${lang} 的履歷資料` },
      404
    )
  }

  return c.json({ success: true, data: resume })
}

/**
 * 處理更新履歷的 HTTP 請求與回應
 */
export const updateResumeController = async (c: Context<{ Bindings: Bindings }>) => {
  const body = await c.req.json()
  const { lang, title, summary, skills, experience, education, certifications } = body

  // 1. 驗證語言參數
  if (!lang || !['en', 'zh'].includes(lang)) {
    return c.json(
      { success: false, message: '語言參數無效 (必須是 "en" 或 "zh")' },
      400
    )
  }

  try {
    // 2. 呼叫 Service 撈取資料
    const resume = await getResumeByLang(c.env.DB, lang)

    // 3. 檢查是否存在 (404)
    if (!resume) {
      return c.json(
        { success: false, message: `找不到語言為 ${lang} 的履歷資料` },
        404
      )
    }

    // 4. 成功回傳 (200)
    return c.json({ success: true, data: resume })

  } catch (error: any) {
    // 5. 系統安全防護 (500)
    return c.json(
      { success: false, message: '伺服器內部發生錯誤，請稍後再試' },
      500
    )
  }
}
