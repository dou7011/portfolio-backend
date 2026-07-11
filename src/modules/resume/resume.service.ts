<<<<<<< HEAD
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
=======
import type { D1Database } from '@cloudflare/workers-types'
>>>>>>> 6acacb3225d1aa4d7493b93905aabae99c081e77

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
<<<<<<< HEAD
    skills: safeJsonParse(resume.skills, []),
    experience: safeJsonParse(resume.experience, []),
    education: safeJsonParse(resume.education, []),
    certifications: safeJsonParse(resume.certifications, []),
=======
    skills: JSON.parse(resume.skills as string),
    experience: JSON.parse(resume.experience as string),
    education: JSON.parse(resume.education as string),
    certifications: JSON.parse(resume.certifications as string)
>>>>>>> 6acacb3225d1aa4d7493b93905aabae99c081e77
  }
}

/**
 * 更新或新增履歷資料
 */
export const updateResume = async (db: D1Database, data: ResumeData) => {
<<<<<<< HEAD
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
=======
  const { lang, title, summary, skills, experience, education, certifications } = data;

  // 🌟 使用 ON CONFLICT(lang) DO UPDATE SET 語法
  // 註：這需要資料庫的 lang 欄位具備 UNIQUE 限制
  await db.prepare(`
    INSERT INTO resumes (lang, title, summary, skills, experience, education, certifications, updated_at) 
    VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(lang) DO UPDATE SET
      title = excluded.title,
      summary = excluded.summary,
      skills = excluded.skills,
      experience = excluded.experience,
      education = excluded.education,
      certifications = excluded.certifications,
      updated_at = CURRENT_TIMESTAMP
  `).bind(
    lang,
    title ?? null,
    summary ?? null,
    skills ? JSON.stringify(skills) : '[]',
    experience ? JSON.stringify(experience) : '[]',
    education ? JSON.stringify(education) : '[]',
    certifications ? JSON.stringify(certifications) : '[]'
  ).run();
>>>>>>> 6acacb3225d1aa4d7493b93905aabae99c081e77
}