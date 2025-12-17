import * as fs from 'fs';

import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

import { outputHtmlPath, puppeteerOptions } from './constants';
import { getInvoiceHtml } from './templates';
import { type GeneratePdfParams, type Invoice } from './types';

export const generatePdf = async (params: GeneratePdfParams) => {
  const webUrl = (params.webUrl ?? ``).trim();
  const rawHtml = (params.rawHtml ?? ``).trim();
  if (webUrl.length === 0 && rawHtml.length === 0)
    throw new Error(`Params should contain one of from webUrl or rawHtml`);

  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: true,
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1240, height: 1754 });

  if (webUrl.length > 0) await page.goto(webUrl, { waitUntil: `networkidle0` });
  if (rawHtml.length > 0) await page.setContent(rawHtml, { waitUntil: `domcontentloaded` });

  await page.emulateMediaType(`screen`);
  const pdfBuffer = await page.pdf(puppeteerOptions.pdfOptions);
  await browser.close();
  return pdfBuffer;
};

export const invoiceToPdf = async (invoice: Invoice) => {
  const html = getInvoiceHtml(invoice);
  fs.writeFileSync(outputHtmlPath, html);
  const buffer = await generatePdf({ rawHtml: html });
  return { buffer, html };
};
