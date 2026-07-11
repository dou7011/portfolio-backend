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