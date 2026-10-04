import type { R2Bucket } from '@cloudflare/workers-types'

const createImageKey = (fileName: string, date = new Date()) => {
  const yearMonth = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`
  const fileExtension = fileName.split('.').pop() || 'png'
  const shortId = crypto.randomUUID().split('-')[0]

  return `images/${yearMonth}/${shortId}.${fileExtension}`
}

export const uploadImageService = async (bucket: R2Bucket, file: File) => {
  const key = createImageKey(file.name)

  await bucket.put(key, await file.arrayBuffer(), {
    httpMetadata: {
      contentType: file.type,
      cacheControl: 'public, max-age=2592000, immutable',
     },
  })

  return key
}

export const getImageService = (bucket: R2Bucket, yearMonth: string, filename: string) =>
  bucket.get(`images/${yearMonth}/${filename}`)