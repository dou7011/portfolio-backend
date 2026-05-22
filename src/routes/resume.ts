import { Hono } from 'hono'
import type { D1Database } from '@cloudflare/workers-types'
import { authGuard } from '../middleware/authGuard'

type Bindings = {
  DB: D1Database
  JWT_SECRET: string
}

const resume = new Hono<{ Bindings: Bindings }>({ strict: false })

// 1. 前台公開讀取履歷 (取得 id = 1 的那筆資料)
resume.get('/', async (c) => {
  // 1. 取得網址上的 lang 參數，沒傳的話預設給 'zh'
  const lang = c.req.query('lang') || 'zh';
  
  // 2. 🌟 直接用 lang 欄位去資料庫搜尋，這比用 ID 找清楚太多了！
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM resumes WHERE lang = ? LIMIT 1'
  ).bind(lang).all();

  if (results.length === 0) {
    return c.json({ success: false, message: `找不到語言為 ${lang} 的履歷資料` }, 404);
  }

  const resume = results[0];

  // 3. 解析 JSON 字串回物件
  const parsedResume = {
    ...resume,
    skills: JSON.parse(resume.skills as string),
    experience: JSON.parse(resume.experience as string),
    education: JSON.parse(resume.education as string),
    certifications: JSON.parse(resume.certifications as string)
  };

  return c.json({ success: true, data: parsedResume });
});

// 2. 後台管理員更新履歷 (可更新英文或中文)
resume.put('/', authGuard, async (c) => {
  const db = c.env.DB
  const body = await c.req.json()
  const { lang, title, summary, skills, experience, education, certifications } = body

  // 驗證語言參數
  if (!lang || !['en', 'zh'].includes(lang)) {
    return c.json({ success: false, message: '語言參數無效 (必須是 "en" 或 "zh")' }, 400)
  }

  try {
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

    return c.json({ success: true, message: `${lang === 'en' ? '英文' : '中文'}履歷更新成功！` })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

export default resume