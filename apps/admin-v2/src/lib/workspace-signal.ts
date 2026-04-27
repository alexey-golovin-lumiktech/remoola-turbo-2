import {
  administrationItems,
  auditExplorerItems,
  coreShellItems,
  financeBreadthItems,
  maturityItems,
  topLevelBreadthItems,
} from '../app/(shell)/shell-nav';

export type SignalCount = { count: number; deferred: boolean };

export function readCurrentWorkspaceSignalCount(
  activePath: string | null,
  signalCounts: Record<string, SignalCount>,
): number | null {
  if (!activePath) {
    return null;
  }

  const allItems: ReadonlyArray<{ href: string; queueSignalKey?: string }> = [
    ...coreShellItems,
    ...topLevelBreadthItems,
    ...financeBreadthItems,
    ...administrationItems,
    ...maturityItems,
    ...auditExplorerItems,
  ];

  const activeItem = allItems.find((item) => activePath === item.href || activePath.startsWith(`${item.href}/`));
  if (!activeItem?.queueSignalKey) {
    return null;
  }

  return signalCounts[activeItem.queueSignalKey]?.count ?? null;
}
