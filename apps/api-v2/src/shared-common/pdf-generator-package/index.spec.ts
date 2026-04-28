type LoadPdfModulesOptions = {
  VERCEL?: number;
  NODE_ENV?: string;
};

type PdfConstantsModule = {
  getBrowser: () => Promise<unknown>;
  pdfOptions: Record<string, unknown>;
  pfdPageViewport: { width: number; height: number };
};

type PdfIndexModule = {
  generatePdf: (params: { rawHtml?: string; webUrl?: string }) => Promise<Uint8Array>;
};

type LoadedPdfModules = {
  constants: PdfConstantsModule;
  index: PdfIndexModule;
  executablePath: jest.Mock<Promise<string>, []>;
  launch: jest.Mock;
  browser: {
    close: jest.Mock;
    newPage: jest.Mock;
  };
  page: {
    emulateMediaType: jest.Mock;
    goto: jest.Mock;
    pdf: jest.Mock;
    setContent: jest.Mock;
    setViewport: jest.Mock;
  };
};

const loadPdfModules = async (options: LoadPdfModulesOptions = {}): Promise<LoadedPdfModules> => {
  jest.resetModules();

  const executablePath = jest.fn<Promise<string>, []>().mockResolvedValue(`/tmp/chromium`);
  const page = {
    emulateMediaType: jest.fn().mockResolvedValue(undefined),
    goto: jest.fn().mockResolvedValue(undefined),
    pdf: jest.fn().mockResolvedValue(Uint8Array.from([1, 2, 3])),
    setContent: jest.fn().mockResolvedValue(undefined),
    setViewport: jest.fn().mockResolvedValue(undefined),
  };
  const browser = {
    close: jest.fn().mockResolvedValue(undefined),
    newPage: jest.fn().mockResolvedValue(page),
  };
  const launch = jest.fn().mockResolvedValue(browser);

  jest.doMock(`../../envs`, () => ({
    envs: {
      VERCEL: options.VERCEL ?? 0,
      NODE_ENV: options.NODE_ENV ?? `development`,
    },
  }));
  jest.doMock(`@sparticuz/chromium`, () => ({
    __esModule: true,
    default: {
      args: [`--disable-gpu`, `--single-process`],
      executablePath,
    },
  }));
  jest.doMock(`puppeteer-core`, () => ({
    __esModule: true,
    default: {
      launch,
    },
  }));

  let constants!: PdfConstantsModule;
  let index!: PdfIndexModule;
  await jest.isolateModulesAsync(async () => {
    constants = (await import(`./constants`)) as unknown as PdfConstantsModule;
    index = (await import(`./index`)) as unknown as PdfIndexModule;
  });

  return { constants, index, executablePath, launch, browser, page };
};

describe(`pdf-generator-package`, () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    jest.dontMock(`../../envs`);
    jest.dontMock(`@sparticuz/chromium`);
    jest.dontMock(`puppeteer-core`);
  });

  it(`omits filesystem path from pdfOptions in Vercel-like runtime`, async () => {
    const { constants } = await loadPdfModules({ VERCEL: 1, NODE_ENV: `development` });

    expect(constants.pdfOptions).toMatchObject({
      format: `A4`,
      printBackground: true,
    });
    expect(constants.pdfOptions).not.toHaveProperty(`path`);
  });

  it(`uses chromium executablePath and passes launch options to puppeteer`, async () => {
    const { constants, executablePath, launch, browser } = await loadPdfModules({ NODE_ENV: `production` });

    const result = await constants.getBrowser();

    expect(executablePath).toHaveBeenCalledTimes(1);
    expect(launch).toHaveBeenCalledWith({
      args: [`--disable-gpu`, `--single-process`],
      executablePath: `/tmp/chromium`,
      headless: true,
    });
    expect(result).toBe(browser);
  });

  it(`renders rawHtml with production-like glue and closes browser on success`, async () => {
    const { constants, index, browser, page } = await loadPdfModules({ VERCEL: 1, NODE_ENV: `production` });
    const pdfPayload = Uint8Array.from([9, 8, 7]);
    page.pdf.mockResolvedValue(pdfPayload);

    const result = await index.generatePdf({ rawHtml: `<html><body>invoice</body></html>` });

    expect(browser.newPage).toHaveBeenCalledTimes(1);
    expect(page.setViewport).toHaveBeenCalledWith(constants.pfdPageViewport);
    expect(page.setContent).toHaveBeenCalledWith(`<html><body>invoice</body></html>`, {
      waitUntil: `domcontentloaded`,
    });
    expect(page.emulateMediaType).toHaveBeenCalledWith(`screen`);
    expect(page.pdf).toHaveBeenCalledWith(constants.pdfOptions);
    expect(browser.close).toHaveBeenCalledTimes(1);
    expect(result).toBe(pdfPayload);
  });

  it(`closes browser and rethrows when rendering fails`, async () => {
    const { index, browser, page } = await loadPdfModules({ VERCEL: 1, NODE_ENV: `production` });
    const renderError = new Error(`content failed`);
    page.setContent.mockRejectedValue(renderError);

    await expect(index.generatePdf({ rawHtml: `<html><body>broken</body></html>` })).rejects.toThrow(renderError);
    expect(browser.close).toHaveBeenCalledTimes(1);
    expect(page.pdf).not.toHaveBeenCalled();
  });
});
