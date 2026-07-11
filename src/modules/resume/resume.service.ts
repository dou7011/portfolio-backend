/**
 * 履歷模組 Service 層
 * 
 * 負責與 D1 資料庫互動：
 * - getResumeByLang：根據語言代碼查詢履歷，並安全地解析 JSON 欄位
 * - updateResume：先查詢是否存在，再執行 INSERT 或 UPDATE（UPSERT 邏輯）
 * 
 * JSON 欄位（skills / experience / education / certifications）
 * 統一透過 safeJsonParse 處理，避免髒資料導致整支 API 500。
 */
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
 * 根據語言查詢履歷資料
 */
export const getResumeByLang = async (db: D1Database, lang: string) => {
  const { results } = await db.prepare(
    'SELECT * FROM resumes WHERE lang = ? LIMIT 1'
  ).bind(lang).all()

  if (results.length === 0) {
    return null
  }

  const resume = results[0]

  // 解析 JSON 字串回物件
  return {
    ...resume,
    skills: safeJsonParse(resume.skills, []),
    experience: safeJsonParse(resume.experience, []),
    education: safeJsonParse(resume.education, []),
    certifications: safeJsonParse(resume.certifications, []),
  }
}

/**
 * 更新或新增履歷資料
 */
export const updateResume = async (db: D1Database, data: ResumeData) => {
  const { lang, title, summary, skills, experience, education, certifications } = data

  // 先檢查該語言的履歷是否存在
  const { results } = await db.prepare(
    'SELECT id FROM resumes WHERE lang = ? LIMIT 1'
  ).bind(lang).all()

  if (results.length === 0) {
    // 如果不存在，則新增
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
    // 如果存在，則更新
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