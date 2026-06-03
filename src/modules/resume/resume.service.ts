import type { D1Database } from '@cloudflare/workers-types'

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
    skills: JSON.parse(resume.skills as string),
    experience: JSON.parse(resume.experience as string),
    education: JSON.parse(resume.education as string),
    certifications: JSON.parse(resume.certifications as string)
  }
}

/**
 * 更新或新增履歷資料
 */
export const updateResume = async (db: D1Database, data: ResumeData) => {
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
}