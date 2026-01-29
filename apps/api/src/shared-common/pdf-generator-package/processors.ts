import * as fs from 'fs';

import { getBrowser, outputHtmlPath, pdfOptions, pfdPageViewport } from './constants';
import { getInvoiceHtml } from './templates';
import { type GeneratePdfParams, type Invoice } from './types';

export const generatePdf = async (params: GeneratePdfParams) => {
  const webUrl = (params.webUrl ?? ``).trim();
  const rawHtml = (params.rawHtml ?? ``).trim();
  if (webUrl.length === 0 && rawHtml.length === 0)
    throw new Error(`Params should contain one of from webUrl or rawHtml`);

  const browser = await getBrowser();
  const page = await browser.newPage();
  await page.setViewport(pfdPageViewport);

  if (webUrl.length > 0) await page.goto(webUrl, { waitUntil: `networkidle0` });
  if (rawHtml.length > 0) await page.setContent(rawHtml, { waitUntil: `domcontentloaded` });

  await page.emulateMediaType(`screen`);
  const pdfBuffer = await page.pdf(pdfOptions);
  await browser.close();
  return pdfBuffer;
};

export const invoiceToPdf = async (invoice: Invoice) => {
  const html = getInvoiceHtml(invoice);
  fs.writeFileSync(outputHtmlPath, html);
  const buffer = await generatePdf({ rawHtml: html });
  return { buffer, html };
};
