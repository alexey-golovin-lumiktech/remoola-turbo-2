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

export const downloadFile2 = async (url, targetFile = `invoice.pdf`) => {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Download failed: ${res.status} ${res.statusText}`)
  }

  const readableStream = res.body
  const nodeStream = new Readable({
    read() {
      const reader = readableStream.getReader()
      reader.read().then(({ done, value }) => {
        if (done) this.push(null)
        else this.push(Buffer.from(value))
      })
    },
  })

  const filename = targetFile
  const disposition = res.headers.get(`content-disposition`)
  const [, match] = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition) || []
  const filenameRegex = /['"]?([^'"\s]+)['"]?/
  const matches = filenameRegex.exec(match || ``)
  const location = join(process.cwd(), matches ? matches[1] : filename)
  await new Promise((ok, fail) => {
    nodeStream.pipe(fs.createWriteStream(location, { autoClose: true }))
    nodeStream.on(`error`, fail)
    nodeStream.on(`end`, ok)
  })
}
