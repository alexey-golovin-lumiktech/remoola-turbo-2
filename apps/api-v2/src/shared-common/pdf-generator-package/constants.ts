import chromium from '@sparticuz/chromium';
import puppeteer, { type PDFOptions } from 'puppeteer-core';

import { type InvoiceInfoDetails, type InvoiceInfoDetailsKey } from './types';
import { envs } from '../../envs';

const detailsSample: InvoiceInfoDetails = { name: ``, address: ``, line1: ``, line2: `` };
export const detailsSampleKeys = Object.keys(detailsSample) as InvoiceInfoDetailsKey[];

// On Vercel the filesystem is read-only outside /tmp — omit `path` so callers receive the buffer directly.
// Locally we still write the file so existing dev/CLI tooling continues to work.
const commonPDFOptions = {
  margin: { top: `1cm`, left: `2cm`, right: `1cm`, bottom: `1cm` },
  printBackground: true,
  format: `A4`,
} as PDFOptions;

const isVercel = envs.VERCEL === 1;
const isProduction = envs.NODE_ENV === `production`;
const isStaging = envs.NODE_ENV === `staging`;
const mustExcludePath = isVercel || isProduction || isStaging;

export const pdfOptions = mustExcludePath ? commonPDFOptions : { ...commonPDFOptions, path: `out.pdf` };

export const pfdPageViewport = { width: 1240, height: 1754 };
const getPuppeteerLaunchOptions = async () => {
  const executablePath = await chromium.executablePath();
  return { args: chromium.args, executablePath: executablePath, headless: true };
};

export const getBrowser = async () => {
  const launchOptions = await getPuppeteerLaunchOptions();
  return puppeteer.launch(launchOptions);
};
