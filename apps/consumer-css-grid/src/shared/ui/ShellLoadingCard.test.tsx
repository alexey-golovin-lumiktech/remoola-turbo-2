import { describe, expect, it } from '@jest/globals';
import { renderToStaticMarkup } from 'react-dom/server';

import { ShellLoadingCard } from './ShellLoadingCard';

describe(`ShellLoadingCard`, () => {
  it(`renders children inside a div with the loading card class`, () => {
    const html = renderToStaticMarkup(<ShellLoadingCard>Loading foo...</ShellLoadingCard>);
    expect(html).toContain(`Loading foo...`);
    expect(html).toContain(`rounded-[28px]`);
    expect(html).toContain(`bg-(--app-surface)`);
    expect(html).toContain(`shadow-(--app-shadow)`);
  });

  it(`renders as a div element`, () => {
    const html = renderToStaticMarkup(<ShellLoadingCard>x</ShellLoadingCard>);
    expect(html).toMatch(/^<div /);
  });
});
