// Resume 控制器，負責履歷資料的讀取與更新請求處理。
import { Context } from 'hono'
import { getResumeByLang, updateResume } from './resume.service'
import type { AppEnv } from '../../types'
import { logger } from '../../utils/logger'
import { fail, ok } from '../../utils/response'
import { parseJsonBody } from '../../utils/parseJsonBody'

/**
 * 處理讀取履歷的 HTTP 請求與回應。
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
    logger.error('getResumeController', `Error fetching resume for lang: ${lang}`, error)
    return fail(c, 500, 'INTERNAL_ERROR', '伺服器內部發生錯誤，請稍後再試')
  }
}

/**
 * 處理更新履歷的 HTTP 請求與回應。
 */
export const updateResumeController = async (c: Context<AppEnv>) => {
  const body = await parseJsonBody<Record<string, unknown>>(c)
  if (!body) {
    return fail(c, 400, 'BAD_REQUEST', '請提供有效的 JSON 請求內容')
  }

  const { lang, title, email, github, summary, skills, experience, education, certifications, projects } = body

  if (!lang || !['en', 'zh'].includes(String(lang))) {
    return fail(c, 400, 'BAD_REQUEST', '語言參數無效 (必須是 "en" 或 "zh")')
  }

  try {
    await updateResume(c.env.DB, {
      lang: String(lang),
      title: typeof title === 'string' ? title : '',
      email: typeof email === 'string' ? email : '',
      github: typeof github === 'string' ? github : '',
      summary: typeof summary === 'string' ? summary : '',
      skills: Array.isArray(skills) ? skills : [],
      experience: Array.isArray(experience) ? experience : [],
      education: Array.isArray(education) ? education : [],
      certifications: Array.isArray(certifications) ? certifications : [],
      projects: Array.isArray(projects) ? projects : [],
    })
    return ok(c, { message: '履歷更新成功' })
  } catch (error: any) {
    logger.error('updateResumeController', `Error updating resume for lang: ${lang}`, error)
    return fail(c, 500, 'INTERNAL_ERROR', '伺服器內部發生錯誤，請稍後再試')
  }
}
