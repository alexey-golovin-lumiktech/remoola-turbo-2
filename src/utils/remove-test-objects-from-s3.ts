import { DeleteObjectCommand, ListObjectsCommand, S3Client } from '@aws-sdk/client-s3'

export const removeTestObjectsFromS3 = (Bucket: string, s3Client: S3Client) => {
  setTimeout(async () => {
    const list = await s3Client.send(new ListObjectsCommand({ Bucket }))
    for (const { Key } of list.Contents ?? []) await s3Client.send(new DeleteObjectCommand({ Bucket, Key }))
  }, 2000)
}
