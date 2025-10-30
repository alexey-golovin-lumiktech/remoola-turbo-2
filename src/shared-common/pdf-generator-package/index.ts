/* eslint-disable simple-import-sort/imports */
import puppeteer from 'puppeteer'
import * as fs from 'fs'
import { getInvoiceHtml } from './templates'
import type { InvoiceToPdfResult, Invoice, GeneratePdfParams } from './types'
import { outputHtmlPath, puppeteerOptions } from './constants'

export const generatePdf = async (params: GeneratePdfParams): Promise<Buffer> => {
  const webUrl = (params.webUrl ?? ``).trim()
  const rawHtml = (params.rawHtml ?? ``).trim()
  if (webUrl.length === 0 && rawHtml.length === 0) throw new Error(`Params should contain one of from webUrl or rawHtml`)

  const browser = await puppeteer.launch(puppeteerOptions.launchOptions)
  const page = await browser.newPage()

  if (webUrl.length > 0) await page.goto(webUrl, { waitUntil: `networkidle0` })
  if (rawHtml.length > 0) await page.setContent(rawHtml, { waitUntil: `domcontentloaded` })

  await page.emulateMediaType(`screen`)
  const pdfBuffer = await page.pdf(puppeteerOptions.pdfOptions)
  await browser.close()
  return pdfBuffer
}

export const invoiceToPdf = async (invoice: Invoice): Promise<InvoiceToPdfResult> => {
  const html = getInvoiceHtml(invoice)
  fs.writeFileSync(outputHtmlPath, html)
  const buffer = await generatePdf({ rawHtml: html })
  return { buffer, html }
}

export * from './types'
