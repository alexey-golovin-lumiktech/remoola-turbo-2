import * as fs from 'fs'
import { join } from 'path'
import { Readable } from 'stream'

export const downloadFile = async (url, targetFile = `invoice.pdf`) => {
  const responseToReadable = fetchResponse => {
    const reader = fetchResponse.body.getReader()
    const rs = new Readable()
    rs._read = async () => {
      const result = await reader.read()
      if (result.done) return rs.push(null)
      rs.push(Buffer.from(result.value))
    }
    return rs
  }

  const res = await fetch(url)
  let filename = targetFile
  const disposition = res.headers.get(`content-disposition`)
  if ([`inline`, `attachment`].some(x => disposition.includes(x))) {
    const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/
    const matches = filenameRegex.exec(disposition)
    if (matches != null && matches[1]) filename = matches[1].replace(/['"]/g, ``)
  }

  const resStream = responseToReadable(res)
  const location = join(process.cwd(), filename)
  const fileStream = fs.createWriteStream(location, { autoClose: true })
  return new Promise((ok, fail) => (resStream.pipe(fileStream), resStream.on(`error`, fail), fileStream.on(`finish`, ok)))
}
