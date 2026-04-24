import { type ReactElement, type ReactNode } from 'react';

type WorkspaceLayoutProps = {
  workspace: string;
  children: ReactNode;
};

export function WorkspaceLayout({ workspace, children }: WorkspaceLayoutProps): ReactElement {
  void workspace;
  return (
    <div className="grid grid-cols-1 gap-6">
      <div className="min-w-0 flex flex-col gap-6">{children}</div>
    </div>
  );
}
