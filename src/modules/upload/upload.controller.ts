import { Context } from 'hono'
import type { AppEnv } from '../../types'
import { logger } from '../../utils/logger'
import { fail, ok } from '../../utils/response'
import { getImageService, uploadImageService } from './upload.service'

export const uploadImageController = async (c: Context<AppEnv>) => {
  try {
    const formData = await c.req.parseBody();
    const file = formData['image'];

    if (!(file instanceof File)) {
      return fail(c, 400, 'BAD_REQUEST', '請提供有效的圖片檔案');
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

    return c.body(object.body as never, 200, headers as never)
  } catch (error: unknown) {
    logger.error('getImageController', error)
    return fail(c, 500, 'INTERNAL_ERROR', '讀取圖片失敗')
  }
}