import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { RenderQueueView } from '../render-queue-view';

type Item = { id: string; label: string };

function makeItem(id: string): Item {
  return { id, label: `Item ${id}` };
}

const renderMobileItem = (item: Item) => (
  <div key={item.id} data-testid={`mobile-${item.id}`}>
    {item.label}
  </div>
);

const renderTabletItem = (item: Item) => (
  <div key={item.id} data-testid={`tablet-${item.id}`}>
    {item.label}
  </div>
);

const renderDesktopContent = (items: readonly Item[]) => (
  <table data-testid="desktop-table">
    <tbody>
      {items.map((item) => (
        <tr key={item.id}>
          <td>{item.label}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

describe(`RenderQueueView`, () => {
  describe(`empty list`, () => {
    it(`renders the emptyMessage in the mobile slot`, () => {
      const markup = renderToStaticMarkup(
        <RenderQueueView
          items={[]}
          emptyMessage="Nothing here."
          renderMobileItem={renderMobileItem}
          renderTabletItem={renderTabletItem}
          renderDesktopContent={renderDesktopContent}
        />,
      );

      expect(markup).toContain(`Nothing here.`);
    });

    it(`does not render any item content when list is empty`, () => {
      const markup = renderToStaticMarkup(
        <RenderQueueView
          items={[]}
          emptyMessage="Nothing here."
          renderMobileItem={renderMobileItem}
          renderTabletItem={renderTabletItem}
          renderDesktopContent={renderDesktopContent}
        />,
      );

      expect(markup).not.toContain(`data-testid="mobile-`);
      expect(markup).not.toContain(`data-testid="tablet-`);
    });

    it(`renders both mobile and tablet empty states`, () => {
      const markup = renderToStaticMarkup(
        <RenderQueueView
          items={[]}
          emptyMessage="Empty."
          renderMobileItem={renderMobileItem}
          renderTabletItem={renderTabletItem}
          renderDesktopContent={renderDesktopContent}
        />,
      );

      expect(markup).toContain(`data-view="mobile"`);
      expect(markup).toContain(`data-view="tablet"`);
      expect(markup).toContain(`data-view="desktop"`);
    });
  });

  describe(`single item`, () => {
    it(`renders the item in the mobile slot`, () => {
      const markup = renderToStaticMarkup(
        <RenderQueueView
          items={[makeItem(`a`)]}
          emptyMessage="Nothing."
          renderMobileItem={renderMobileItem}
          renderTabletItem={renderTabletItem}
          renderDesktopContent={renderDesktopContent}
        />,
      );

      expect(markup).toContain(`data-testid="mobile-a"`);
      expect(markup).toContain(`Item a`);
    });

    it(`renders the item in the tablet slot`, () => {
      const markup = renderToStaticMarkup(
        <RenderQueueView
          items={[makeItem(`a`)]}
          emptyMessage="Nothing."
          renderMobileItem={renderMobileItem}
          renderTabletItem={renderTabletItem}
          renderDesktopContent={renderDesktopContent}
        />,
      );

      expect(markup).toContain(`data-testid="tablet-a"`);
    });

    it(`passes all items to renderDesktopContent`, () => {
      const desktopFn = jest.fn((items: readonly Item[]) => <div data-testid={`desktop-count-${items.length}`} />);

      renderToStaticMarkup(
        <RenderQueueView
          items={[makeItem(`a`)]}
          emptyMessage="Nothing."
          renderMobileItem={renderMobileItem}
          renderTabletItem={renderTabletItem}
          renderDesktopContent={desktopFn as (items: readonly Item[]) => React.ReactNode}
        />,
      );

      expect(desktopFn).toHaveBeenCalledWith([makeItem(`a`)]);
    });

    it(`does not render the emptyMessage`, () => {
      const markup = renderToStaticMarkup(
        <RenderQueueView
          items={[makeItem(`a`)]}
          emptyMessage="Should not appear."
          renderMobileItem={renderMobileItem}
          renderTabletItem={renderTabletItem}
          renderDesktopContent={renderDesktopContent}
        />,
      );

      expect(markup).not.toContain(`Should not appear.`);
    });
  });

  describe(`multiple items`, () => {
    const items = [makeItem(`x`), makeItem(`y`), makeItem(`z`)];

    it(`renders all items in the mobile slot`, () => {
      const markup = renderToStaticMarkup(
        <RenderQueueView
          items={items}
          emptyMessage="Nothing."
          renderMobileItem={renderMobileItem}
          renderTabletItem={renderTabletItem}
          renderDesktopContent={renderDesktopContent}
        />,
      );

      expect(markup).toContain(`data-testid="mobile-x"`);
      expect(markup).toContain(`data-testid="mobile-y"`);
      expect(markup).toContain(`data-testid="mobile-z"`);
    });

    it(`renders all items in the tablet slot`, () => {
      const markup = renderToStaticMarkup(
        <RenderQueueView
          items={items}
          emptyMessage="Nothing."
          renderMobileItem={renderMobileItem}
          renderTabletItem={renderTabletItem}
          renderDesktopContent={renderDesktopContent}
        />,
      );

      expect(markup).toContain(`data-testid="tablet-x"`);
      expect(markup).toContain(`data-testid="tablet-y"`);
      expect(markup).toContain(`data-testid="tablet-z"`);
    });

    it(`passes all items to renderDesktopContent once`, () => {
      const desktopFn = jest.fn((_items: readonly Item[]) => <div />);

      renderToStaticMarkup(
        <RenderQueueView
          items={items}
          emptyMessage="Nothing."
          renderMobileItem={renderMobileItem}
          renderTabletItem={renderTabletItem}
          renderDesktopContent={desktopFn as (items: readonly Item[]) => React.ReactNode}
        />,
      );

      expect(desktopFn).toHaveBeenCalledTimes(1);
      expect(desktopFn).toHaveBeenCalledWith(items);
    });
  });

  describe(`responsive shell structure`, () => {
    it(`wraps mobile content in the md:hidden readSurface`, () => {
      const markup = renderToStaticMarkup(
        <RenderQueueView
          items={[makeItem(`a`)]}
          emptyMessage="Nothing."
          renderMobileItem={renderMobileItem}
          renderTabletItem={renderTabletItem}
          renderDesktopContent={renderDesktopContent}
        />,
      );

      expect(markup).toContain(`md:hidden`);
      expect(markup).toContain(`data-view="mobile"`);
    });

    it(`wraps tablet content in the hidden md:block xl:hidden readSurface`, () => {
      const markup = renderToStaticMarkup(
        <RenderQueueView
          items={[makeItem(`a`)]}
          emptyMessage="Nothing."
          renderMobileItem={renderMobileItem}
          renderTabletItem={renderTabletItem}
          renderDesktopContent={renderDesktopContent}
        />,
      );

      expect(markup).toContain(`hidden md:block xl:hidden`);
      expect(markup).toContain(`data-view="tablet"`);
    });

    it(`wraps desktop content in the hidden xl:block readSurface`, () => {
      const markup = renderToStaticMarkup(
        <RenderQueueView
          items={[makeItem(`a`)]}
          emptyMessage="Nothing."
          renderMobileItem={renderMobileItem}
          renderTabletItem={renderTabletItem}
          renderDesktopContent={renderDesktopContent}
        />,
      );

      expect(markup).toContain(`hidden xl:block`);
      expect(markup).toContain(`data-view="desktop"`);
    });
  });
});
