import { Context } from 'hono'
import { getResumeByLang, updateResume } from './resume.service'
import type { AppEnv } from '../../types'
import { fail, ok } from '../../utils/response'

/**
 * 處理讀取履歷的 HTTP 請求與回應
 */
export const getResumeController = async (c: Context<AppEnv>) => {
  const lang = c.req.param('lang') || 'zh'

  if (!['en', 'zh'].includes(lang)) {
    return fail(c, 400, 'BAD_REQUEST', '語言參數無效 (必須是 "en" 或 "zh")')
  }
  try {
    const resume = await getResumeByLang(c.env.DB, lang)

    if (!resume) {
      return fail(c, 404, 'NOT_FOUND', `找不到語言為 ${lang} 的履歷資料`)
    }
    return ok(c, { data: resume })
  } catch (error: any) {
    return fail(c, 500, 'INTERNAL_ERROR', '伺服器內部發生錯誤，請稍後再試')
  }
}

/**
 * 處理更新履歷的 HTTP 請求與回應
 */
export const updateResumeController = async (c: Context<AppEnv>) => {
  const body = await c.req.json()
  const { lang, title, summary, skills, experience, education, certifications } = body

  // 1. 驗證語言參數
  if (!lang || !['en', 'zh'].includes(lang)) {
    return fail(c, 400, 'BAD_REQUEST', '語言參數無效 (必須是 "en" 或 "zh")')
  }

  try {
    await updateResume(c.env.DB, {
      lang, title, summary, skills, experience, education, certifications
    })
    
    return ok(c, { message: '履歷更新成功' })
  } catch (error: any) {
    return fail(c, 500, 'INTERNAL_ERROR', '伺服器內部發生錯誤，請稍後再試')
  }
}
