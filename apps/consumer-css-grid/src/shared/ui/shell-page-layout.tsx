import { type ReactNode } from 'react';

export function PageHeader({
  title,
  subtitle,
  icon,
  action,
}: {
  title: string;
  subtitle?: string;
  icon: ReactNode;
  action?: ReactNode;
}) {
  return (
    <>
      <section className="mb-6 md:hidden">
        <div className="flex items-start gap-4 rounded-[28px] border border-(--app-border) bg-(--app-card-gradient) p-5 shadow-(--app-shadow)">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[26px] bg-(--app-primary) text-(--app-primary-contrast) shadow-(--app-shadow)">
            {icon}
          </div>
          <div>
            <h1 className="text-5xl font-semibold tracking-tight text-(--app-text)">{title}</h1>
            <p className="mt-2 text-lg text-(--app-text-muted)">
              {subtitle ?? `Mobile first workspace for finance operations`}
            </p>
            {action ? <div className="mt-3">{action}</div> : null}
          </div>
        </div>
      </section>

      <section className="mb-6 hidden md:flex items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-(--app-text)">{title}</h1>
          <p className="mt-1 text-(--app-text-muted)">
            {subtitle ?? `Manage balances, payments, documents, compliance, and account settings.`}
          </p>
        </div>
        {action ? <div>{action}</div> : null}
      </section>
    </>
  );
}

export function WorkspaceUnavailableBanner({ title, text }: { title: string; text: string }) {
  return (
    <section className="mb-5 rounded-[28px] border border-transparent bg-(--app-warning-soft) p-5">
      <div className="text-sm uppercase tracking-[0.3em] text-(--app-warning-text)">Workspace sync</div>
      <h2 className="mt-1 text-2xl font-semibold text-(--app-text)">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-7 text-(--app-text-soft)">{text}</p>
    </section>
  );
}
