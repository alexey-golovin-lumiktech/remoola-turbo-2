import { describe, expect, it } from '@jest/globals';
import { renderToStaticMarkup } from 'react-dom/server';

import { Panel } from './shell-panel';

describe(`Panel`, () => {
  it(`renders a section element`, () => {
    const html = renderToStaticMarkup(<Panel title="Test">child</Panel>);
    expect(html).toContain(`<section`);
  });

  it(`applies rounded-[28px] card class`, () => {
    const html = renderToStaticMarkup(<Panel title="Test">child</Panel>);
    expect(html).toContain(`rounded-[28px]`);
  });

  it(`renders title text`, () => {
    const html = renderToStaticMarkup(<Panel title="My Panel">child</Panel>);
    expect(html).toContain(`My Panel`);
  });

  it(`renders children`, () => {
    const html = renderToStaticMarkup(<Panel title="T">hello world</Panel>);
    expect(html).toContain(`hello world`);
  });

  it(`renders aside when provided`, () => {
    const html = renderToStaticMarkup(
      <Panel title="T" aside="5 items">
        child
      </Panel>,
    );
    expect(html).toContain(`5 items`);
  });

  it(`omits aside wrapper when aside is not provided`, () => {
    const html = renderToStaticMarkup(<Panel title="T">child</Panel>);
    expect(html).not.toContain(`text-xs text-(--app-text-faint)`);
  });
});
