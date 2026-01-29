import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

import type { InvoiceInfoDetails, InvoiceInfoDetailsKey } from './types';

export const outputHtmlPath = `out.html` as const;
export const outputPdfPath = `out.pdf` as const;

const detailsSample: InvoiceInfoDetails = { name: ``, address: ``, line1: ``, line2: `` };
export const detailsSampleKeys = Object.keys(detailsSample) as InvoiceInfoDetailsKey[];

export const pdfOptions = {
  path: outputPdfPath,
  margin: { top: `1cm`, left: `2cm`, right: `1cm`, bottom: `1cm` },
  printBackground: true,
  format: `A4`,
} as const;
export const pdfPageWidthPx = 1240;
export const pdfPageHeightPx = 1754;
export const pdfPageDpi = 96;
export const pdfPageWidthInch = pdfPageWidthPx / pdfPageDpi;
export const pdfPageHeightInch = pdfPageHeightPx / pdfPageDpi;
export const pdfPageWidthCm = +(pdfPageWidthInch * 2.54).toFixed(2);
export const pdfPageHeightCm = +(pdfPageHeightInch * 2.54).toFixed(2);
export const pfdPageViewport = { width: pdfPageWidthPx, height: pdfPageHeightPx };
export const getPuppeteerLaunchOptions = async () => {
  const executablePath = await chromium.executablePath();
  return { args: chromium.args, executablePath: executablePath, headless: true };
};

export const getBrowser = async () => {
  const launchOptions = await getPuppeteerLaunchOptions();
  return puppeteer.launch(launchOptions);
};
