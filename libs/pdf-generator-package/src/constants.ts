import { type PDFOptions, type PuppeteerLaunchOptions } from 'puppeteer'

import { type InvoiceInfoDetails, type InvoiceInfoDetailsKey } from './types'

export const outputHtmlPath = `out.html`
export const outputPdfPath = `out.pdf`

const detailsSample: InvoiceInfoDetails = { name: ``, address: ``, line1: ``, line2: `` }
export const detailsSampleKeys = Object.keys(detailsSample) as InvoiceInfoDetailsKey[]

type PuppeteerOptions = { launchOptions: PuppeteerLaunchOptions; pdfOptions: PDFOptions }
export const puppeteerOptions: PuppeteerOptions = {
  launchOptions: {
    headless: `new`,
    slowMo: 10,
    args: [
      `--no-sandbox`,
      `--headless`,
      `--disable-gpu`,
      `--disable-dev-shm-usage`,
      `--disable-setuid-sandbox`,
      `--enable-logging`,
      `--v=1`,
    ],
  },
  pdfOptions: {
    path: outputPdfPath,
    margin: { top: `1cm`, left: `2cm`, right: `1cm`, bottom: `1cm` },
    printBackground: true,
    format: `A4`,
  },
}
