import { DeleteObjectCommand, ListObjectsCommand, S3Client } from '@aws-sdk/client-s3'

export const removeTestObjectsFromS3 = (Bucket: string, s3Client: S3Client) => {
  setTimeout(async () => {
    const list = await s3Client.send(new ListObjectsCommand({ Bucket }))
    if ((list.Contents ?? []).length == 0) return console.log(`Bucket ${Bucket} is empty`)
    for (const { Key } of list.Contents ?? []) console.log(`[remove]`, Key), await s3Client.send(new DeleteObjectCommand({ Bucket, Key }))
  }, 2000)
}
