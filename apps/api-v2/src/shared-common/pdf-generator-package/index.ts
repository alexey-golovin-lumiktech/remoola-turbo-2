import { getBrowser, pdfOptions, pfdPageViewport } from './constants';
import { type GeneratePdfParams } from './types';

export const generatePdf = async (params: GeneratePdfParams) => {
  const webUrl = (params.webUrl ?? ``).trim();
  const rawHtml = (params.rawHtml ?? ``).trim();
  if (webUrl.length === 0 && rawHtml.length === 0)
    throw new Error(`Params should contain one of from webUrl or rawHtml`);

  const browser = await getBrowser();
  try {
    const page = await browser.newPage();
    await page.setViewport(pfdPageViewport);

    if (webUrl.length > 0) await page.goto(webUrl, { waitUntil: `networkidle0` });
    if (rawHtml.length > 0) await page.setContent(rawHtml, { waitUntil: `domcontentloaded` });

    await page.emulateMediaType(`screen`);
    return page.pdf(pdfOptions);
  } finally {
    await browser.close();
  }
};

export * from './types';
