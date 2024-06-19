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

export const downloadFileV2 = async (url: string, targetFile: string = `invoice.pdf`): Promise<void> => {
  const responseToReadable = (fetchResponse: Response): Readable => {
    const reader = fetchResponse.body?.getReader()
    if (!reader) throw new Error(`Failed to get reader from response body`)

    const readableStream = new Readable({
      async read() {
        try {
          const { done, value } = await reader.read()
          if (done) {
            this.push(null)
          } else {
            this.push(Buffer.from(value))
          }
        } catch (error: any) {
          this.destroy(error)
        }
      },
    })

    return readableStream
  }

  const fetchResponse = await fetch(url)
  if (!fetchResponse.ok) {
    throw new Error(`Failed to fetch URL: ${fetchResponse.statusText}`)
  }

  let filename = targetFile
  const disposition = fetchResponse.headers.get(`content-disposition`)
  if (disposition && [`inline`, `attachment`].some(x => disposition.includes(x))) {
    const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/
    const matches = filenameRegex.exec(disposition)
    if (matches && matches[1]) {
      filename = matches[1].replace(/['"]/g, ``)
    }
  }

  const resStream = responseToReadable(fetchResponse)
  const location = join(process.cwd(), filename)
  const fileStream = fs.createWriteStream(location, { autoClose: true })

  return new Promise((resolve, reject) => {
    resStream.pipe(fileStream)
    resStream.on(`error`, reject)
    fileStream.on(`finish`, resolve)
    fileStream.on(`error`, reject)
  })
}
