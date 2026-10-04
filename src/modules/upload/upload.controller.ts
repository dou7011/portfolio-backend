import { Context } from 'hono'
import type { AppEnv } from '../../types'
import { logger } from '../../utils/logger'
import { fail, ok } from '../../utils/response'
import { getImageService, uploadImageService } from './upload.service'

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export const uploadImageController = async (c: Context<AppEnv>) => {
  try {
    const formData = await c.req.parseBody();
    const file = formData['image'];

    if (!(file instanceof File)) {
      return fail(c, 400, 'BAD_REQUEST', '請提供有效的圖片檔案');
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return fail(c, 400, 'BAD_REQUEST', '不支援的圖片檔案格式，僅接受 JPG, PNG, WEBP, GIF')
    }

    if (file.size > MAX_FILE_SIZE) {
      return fail(c, 400, 'BAD_REQUEST', '檔案大小超過上限 (10MB)')
    }

    const fileName = await uploadImageService(c.env.BUCKET, file)
    const imageUrl = `${c.env.CDN_URL}/${fileName}`
    
    return ok(c, { data: { url: imageUrl } });
  } catch (error: any) {
    logger.error('uploadImageController', error);
    return fail(c, 500, 'INTERNAL_ERROR', '圖片上傳失敗');
  }
}

export const getImageController = async (c: Context<AppEnv>) => {
  try {
    const { yearMonth, filename } = c.req.param()
    const object = await getImageService(c.env.BUCKET, yearMonth, filename)
    if (!object) {
      return c.notFound()
    }

    const headers = new Headers()
    object.writeHttpMetadata(headers as never)
    headers.set('etag', object.httpEtag)
    // 如果圖片在R2 沒有設定 Cache-Control，則幫它補上
    if (!headers.has('Cache-Control')) {
      headers.set('Cache-Control', 'public, max-age=31536000, immutable')
    }

    return c.body(object.body as never, 200, headers as never)
  } catch (error: unknown) {
    logger.error('getImageController', error)
    return fail(c, 500, 'INTERNAL_ERROR', '讀取圖片失敗')
  }
}