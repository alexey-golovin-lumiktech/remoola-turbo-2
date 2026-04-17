import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import RootLayout, { metadata } from './layout';

describe(`admin-v2 root layout canonical MVP-2 metadata`, () => {
  it(`describes the app through canonical shell tiers rather than flattened breadth closure`, () => {
    expect(metadata.description).toBe(
      `Operational admin console with canonical MVP-2 shell framing across core ops, top-level breadth, later admin breadth, and nested finance investigation routes`,
    );
  });

  it(`renders the root document shell`, () => {
    const markup = renderToStaticMarkup(
      <RootLayout>
        <main>Root child content</main>
      </RootLayout>,
    );

    expect(markup).toContain(`Root child content`);
    expect(markup).toContain(`<html lang="en">`);
  });
});
