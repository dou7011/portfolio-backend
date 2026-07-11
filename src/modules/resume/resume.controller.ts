<<<<<<< HEAD
/**
 * 履歷模組 Controller 層
 * 
 * 職責：處理 HTTP 請求的輸入驗證、呼叫 Service 層，並將結果轉換為 HTTP 回應。
 * 
 * getResumeController  — 公開讀取指定語言履歷
 * updateResumeController — 受保護更新履歷（需先通過 authGuard + permissionGuard）
 */
import { Context } from 'hono'
import type { D1Database } from '@cloudflare/workers-types'
import { getResumeByLang, updateResume } from './resume.service'

type Bindings = {
  DB: D1Database
  JWT_SECRET: string
}
=======
import { Context } from 'hono'
import { getResumeByLang, updateResume } from './resume.service'
import type { AppEnv } from '../../types'
import { fail, ok } from '../../utils/response'
>>>>>>> 6acacb3225d1aa4d7493b93905aabae99c081e77

/**
 * 處理讀取履歷的 HTTP 請求與回應
 */
<<<<<<< HEAD
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
=======
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
>>>>>>> 6acacb3225d1aa4d7493b93905aabae99c081e77
}

/**
 * 處理更新履歷的 HTTP 請求與回應
 */
<<<<<<< HEAD
export const updateResumeController = async (c: Context<{ Bindings: Bindings }>) => {
=======
export const updateResumeController = async (c: Context<AppEnv>) => {
>>>>>>> 6acacb3225d1aa4d7493b93905aabae99c081e77
  const body = await c.req.json()
  const { lang, title, summary, skills, experience, education, certifications } = body

  // 1. 驗證語言參數
  if (!lang || !['en', 'zh'].includes(lang)) {
<<<<<<< HEAD
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
    else {
      // 3.1. 更新履歷資料
      await updateResume(c.env.DB, { lang, title, summary, skills, experience, education, certifications })
    }

    // 4. 成功回傳 (200)
    return c.json({ success: true, data: resume })

  } catch (error: any) {
    // 5. 系統安全防護 (500)
    return c.json(
      { success: false, message: '伺服器內部發生錯誤，請稍後再試' },
      500
    )
=======
    return fail(c, 400, 'BAD_REQUEST', '語言參數無效 (必須是 "en" 或 "zh")')
  }

  try {
    await updateResume(c.env.DB, {
      lang, title, summary, skills, experience, education, certifications
    })
    
    return ok(c, { message: '履歷更新成功' })
  } catch (error: any) {
    return fail(c, 500, 'INTERNAL_ERROR', '伺服器內部發生錯誤，請稍後再試')
>>>>>>> 6acacb3225d1aa4d7493b93905aabae99c081e77
  }
}
