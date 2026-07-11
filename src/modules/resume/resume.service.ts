// Resume 服務，封裝履歷查詢與 JSON 欄位的儲存與還原邏輯。
import type { D1Database } from '@cloudflare/workers-types'
import { safeJsonParse } from '../../utils/safeJsonParse'

interface ResumeData {
  lang: string
  title: string
  summary: string
  skills: any
  experience: any
  education: any
  certifications: any
}

/**
 * 根據語言查詢履歷資料。
 */
export const getResumeByLang = async (db: D1Database, lang: string) => {
  const { results } = await db.prepare(
    'SELECT * FROM resumes WHERE lang = ? LIMIT 1'
  ).bind(lang).all()

  if (results.length === 0) {
    return null
  }

  const resume = results[0] as any

  return {
    ...resume,
    skills: safeJsonParse(resume.skills, []),
    experience: safeJsonParse(resume.experience, []),
    education: safeJsonParse(resume.education, []),
    certifications: safeJsonParse(resume.certifications, []),
  }
}

/**
 * 更新或新增履歷資料。
 */
export const updateResume = async (db: D1Database, data: ResumeData) => {
  const { lang, title, summary, skills, experience, education, certifications } = data

  const { results } = await db.prepare(
    'SELECT id FROM resumes WHERE lang = ? LIMIT 1'
  ).bind(lang).all()

  if (results.length === 0) {
    await db.prepare(
      `INSERT INTO resumes (lang, title, summary, skills, experience, education, certifications, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
    ).bind(
      lang,
      title,
      summary,
      JSON.stringify(skills),
      JSON.stringify(experience),
      JSON.stringify(education),
      JSON.stringify(certifications)
    ).run()
  } else {
    await db.prepare(
      `UPDATE resumes SET
        title = ?,
        summary = ?,
        skills = ?,
        experience = ?,
        education = ?,
        certifications = ?,
        updated_at = CURRENT_TIMESTAMP
       WHERE lang = ?`
    ).bind(
      title,
      summary,
      JSON.stringify(skills),
      JSON.stringify(experience),
      JSON.stringify(education),
      JSON.stringify(certifications),
      lang
    ).run()
  }
}