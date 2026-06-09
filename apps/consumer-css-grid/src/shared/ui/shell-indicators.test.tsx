import { describe, expect, it } from '@jest/globals';
import { renderToStaticMarkup } from 'react-dom/server';

import { ChecklistItem, StatusPill } from './shell-indicators';

describe(`StatusPill`, () => {
  it(`renders a span with the status text`, () => {
    const html = renderToStaticMarkup(<StatusPill status="Signed" />);
    expect(html).toContain(`<span`);
    expect(html).toContain(`Signed`);
  });

  it(`applies success tone classes for Signed`, () => {
    const html = renderToStaticMarkup(<StatusPill status="Signed" />);
    expect(html).toContain(`bg-(--app-success-soft)`);
  });

  it(`applies warning tone classes for Pending`, () => {
    const html = renderToStaticMarkup(<StatusPill status="Pending" />);
    expect(html).toContain(`bg-(--app-warning-soft)`);
  });

  it(`applies neutral tone classes for unknown status`, () => {
    const html = renderToStaticMarkup(<StatusPill status="SomeUnknownStatus" />);
    expect(html).toContain(`bg-(--app-surface-muted)`);
  });
});

describe(`ChecklistItem`, () => {
  it(`renders children text`, () => {
    const html = renderToStaticMarkup(<ChecklistItem>My task</ChecklistItem>);
    expect(html).toContain(`My task`);
  });

  it(`does not apply line-through when unchecked`, () => {
    const html = renderToStaticMarkup(<ChecklistItem>Task</ChecklistItem>);
    expect(html).not.toContain(`line-through`);
  });

  it(`applies line-through when checked`, () => {
    const html = renderToStaticMarkup(<ChecklistItem checked>Task</ChecklistItem>);
    expect(html).toContain(`line-through`);
  });

  it(`renders checkmark character`, () => {
    const html = renderToStaticMarkup(<ChecklistItem>Task</ChecklistItem>);
    expect(html).toContain(`✓`);
  });
});
