import { DeleteObjectCommand, ListObjectsCommand, S3Client } from '@aws-sdk/client-s3'

export const removeTestObjectsFromS3 = (Bucket: string, s3Client: S3Client) => {
  setTimeout(async () => {
    console.log(`\n********************************************`)
    console.log(`[REMOVING_TEST_OBJECTS_FROM_S3 !!!!!!!!!!]`)
    const list = await s3Client.send(new ListObjectsCommand({ Bucket }))
    for (const { Key } of list.Contents ?? []) {
      const deleted = await s3Client.send(new DeleteObjectCommand({ Bucket, Key }))
      console.log(`[deleted]`, deleted)
    }
  }, 2000)
}
