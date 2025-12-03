import type { InvoiceInfoDetails, InvoiceInfoDetailsKey } from './types';
import type { PDFOptions, LaunchOptions } from 'puppeteer';

export const outputHtmlPath = `out.html`;
export const outputPdfPath = `out.pdf`;

const detailsSample: InvoiceInfoDetails = { name: ``, address: ``, line1: ``, line2: `` };
export const detailsSampleKeys = Object.keys(detailsSample) as InvoiceInfoDetailsKey[];

type PuppeteerOptions = { launchOptions: LaunchOptions; pdfOptions: PDFOptions };
export const puppeteerOptions: PuppeteerOptions = {
  launchOptions: {
    headless: true,
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
};
