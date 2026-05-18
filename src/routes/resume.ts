import { Hono } from 'hono'
import type { D1Database } from '@cloudflare/workers-types'
import { authGuard } from '../middleware/authGuard'

type Bindings = {
  DB: D1Database
  JWT_SECRET: string
}

const resume = new Hono<{ Bindings: Bindings }>()

// 1. 前台公開讀取履歷 (取得 id = 1 的那筆資料)
resume.get('/', async (c) => {
  try {
    const data = await c.env.DB.prepare(
      'SELECT * FROM resumes WHERE id = 1'
    ).first()

    if (!data) {
      return c.json({ success: false, message: '找不到履歷資料' }, 404)
    }

    // 因為 SQLite 存的是 JSON 字串，讀出來時轉回 JSON 物件給前端
    return c.json({
      success: true,
      data: {
        ...data,
        skills: JSON.parse(data.skills as string),
        experience: JSON.parse(data.experience as string),
        education: JSON.parse(data.education as string),
        certifications: JSON.parse(data.certifications as string)
      }
    })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// 2. 後台管理員更新履歷
resume.put('/', authGuard, async (c) => {
  const db = c.env.DB
  const body = await c.req.json()
  const { title, summary, skills, experience, education, certifications } = body

  try {
    // 寫入時，將前端傳來的物件轉成 JSON 字串存入 TEXT 欄位
    await db.prepare(
      `UPDATE resumes SET 
        title = ?, 
        summary = ?, 
        skills = ?, 
        experience = ?, 
        education = ?, 
        certifications = ?, 
        updated_at = CURRENT_TIMESTAMP 
       WHERE id = 1`
    ).bind(
      title,
      summary,
      JSON.stringify(skills),
      JSON.stringify(experience),
      JSON.stringify(education),
      JSON.stringify(certifications)
    ).run()

  return c.json({ success: true, message: '履歷更新成功！' })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

export default resume