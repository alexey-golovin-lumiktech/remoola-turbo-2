import { describe, expect, it } from '@jest/globals';
import { renderToStaticMarkup } from 'react-dom/server';

import { ShellPagination } from './ShellPagination';

const noop = () => {};

describe(`ShellPagination`, () => {
  it(`renders Previous and Next buttons`, () => {
    const html = renderToStaticMarkup(<ShellPagination page={2} totalPages={5} onPrev={noop} onNext={noop} />);
    expect(html).toContain(`Previous`);
    expect(html).toContain(`Next`);
    expect(html).toMatch(/<button[^>]*type="button"/);
  });

  it(`disables Previous on the first page`, () => {
    const html = renderToStaticMarkup(<ShellPagination page={1} totalPages={5} onPrev={noop} onNext={noop} />);
    expect(html).toMatch(/<button[^>]*\bdisabled="[^"]*"[^>]*>Previous/);
    expect(html).not.toMatch(/<button[^>]*\bdisabled="[^"]*"[^>]*>Next/);
  });

  it(`disables Next on the last page`, () => {
    const html = renderToStaticMarkup(<ShellPagination page={5} totalPages={5} onPrev={noop} onNext={noop} />);
    expect(html).toMatch(/<button[^>]*\bdisabled="[^"]*"[^>]*>Next/);
    expect(html).not.toMatch(/<button[^>]*\bdisabled="[^"]*"[^>]*>Previous/);
  });

  it(`disables both when there is a single page`, () => {
    const html = renderToStaticMarkup(<ShellPagination page={1} totalPages={1} onPrev={noop} onNext={noop} />);
    expect(html).toMatch(/<button[^>]*\bdisabled="[^"]*"[^>]*>Previous/);
    expect(html).toMatch(/<button[^>]*\bdisabled="[^"]*"[^>]*>Next/);
  });
});
