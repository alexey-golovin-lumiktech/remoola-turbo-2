type RenderQueueViewProps<T> = {
  items: readonly T[];
  emptyMessage: string;
  renderMobileItem: (item: T) => React.ReactNode;
  renderTabletItem: (item: T) => React.ReactNode;
  renderDesktopContent: (items: readonly T[]) => React.ReactNode;
};

export function RenderQueueView<T>({
  items,
  emptyMessage,
  renderMobileItem,
  renderTabletItem,
  renderDesktopContent,
}: RenderQueueViewProps<T>) {
  return (
    <>
      <div className="readSurface md:hidden" data-view="mobile">
        {items.length === 0 ? (
          <div className="panel muted">{emptyMessage}</div>
        ) : (
          <div className="queueCards">{items.map(renderMobileItem)}</div>
        )}
      </div>

      <div className="readSurface hidden md:block xl:hidden" data-view="tablet">
        {items.length === 0 ? (
          <div className="panel muted">{emptyMessage}</div>
        ) : (
          <div className="condensedList">{items.map(renderTabletItem)}</div>
        )}
      </div>

      <div className="readSurface hidden xl:block" data-view="desktop">
        {renderDesktopContent(items)}
      </div>
    </>
  );
}
