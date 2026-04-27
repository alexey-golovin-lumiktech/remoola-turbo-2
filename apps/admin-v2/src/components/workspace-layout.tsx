import { type ReactElement, type ReactNode } from 'react';

import { Panel } from './panel';

type WorkspaceLayoutProps = {
  workspace: string;
  children: ReactNode;
  context?: ReactNode;
  contextTitle?: string;
  contextDescription?: string;
};

export function WorkspaceLayout({
  workspace,
  children,
  context,
  contextTitle = `Workspace context`,
  contextDescription,
}: WorkspaceLayoutProps): ReactElement {
  return (
    <div className="grid grid-cols-1 gap-5 xl:gap-6" data-workspace={workspace}>
      {context ? (
        <Panel
          className="lg:hidden"
          eyebrow="Context"
          title={contextTitle}
          description={contextDescription}
          surface="meta"
        >
          <div className="flex flex-col gap-3">{context}</div>
        </Panel>
      ) : null}
      <div className="workspaceLayout">
        <div className="workspaceLayout__main">
          <div className="min-w-0 flex flex-col gap-5 xl:gap-6">{children}</div>
        </div>
        {context ? (
          <aside className="contextRail">
            {contextTitle ? <h2 className="contextRail__title">{contextTitle}</h2> : null}
            {contextDescription ? <p className="mb-4 text-sm leading-6 text-white/58">{contextDescription}</p> : null}
            <div className="flex flex-col gap-4">{context}</div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
