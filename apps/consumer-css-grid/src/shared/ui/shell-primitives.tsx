import Link from 'next/link';
import { type ReactNode } from 'react';

/* ── PageHeader ──────────────────────────────────────────── */

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
  const sub = subtitle ?? `Mobile first workspace for finance operations`;
  return (
    <>
      {/* Mobile: hero card */}
      <section className="mb-6 md:hidden">
        <div className="flex items-start gap-4 rounded-[28px] border border-[color:var(--app-border)] bg-[var(--app-card-gradient)] p-5 shadow-[var(--app-shadow)]">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[26px] bg-[var(--app-primary)] text-[var(--app-primary-contrast)] shadow-[var(--app-shadow)]">
            {icon}
          </div>
          <div>
            <h1 className="text-5xl font-semibold tracking-tight text-[var(--app-text)]">{title}</h1>
            <p className="mt-2 text-lg text-[var(--app-text-muted)]">{sub}</p>
            {action ? <div className="mt-3">{action}</div> : null}
          </div>
        </div>
      </section>

      {/* Desktop: plain h1 */}
      <section className="mb-6 hidden md:flex items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-[var(--app-text)]">{title}</h1>
          <p className="mt-1 text-[var(--app-text-muted)]">
            Manage balances, payments, documents, compliance, and account settings.
          </p>
        </div>
        {action ? <div>{action}</div> : null}
      </section>
    </>
  );
}

/* ── Panel ───────────────────────────────────────────────── */

export function Panel({
  title,
  aside,
  children,
  [`data-testid`]: dataTestId,
}: {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
  [`data-testid`]?: string;
}) {
  return (
    <section
      data-testid={dataTestId}
      className="rounded-[28px] border border-[color:var(--app-border)] bg-[var(--app-surface)] p-5 shadow-[var(--app-shadow)]"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-[var(--app-text)]">{title}</h3>
        {aside ? <div className="text-xs text-[var(--app-text-faint)]">{aside}</div> : null}
      </div>
      {children}
    </section>
  );
}

/* ── MetricCard ──────────────────────────────────────────── */

export function MetricCard({
  icon,
  label,
  value,
  sublabel,
  accent = `text-[var(--app-text)]`,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  sublabel: string;
  accent?: string;
}) {
  return (
    <article className="rounded-[28px] border border-[color:var(--app-border)] bg-[var(--app-card-gradient)] p-5 shadow-[var(--app-shadow)]">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--app-primary)] text-xl text-[var(--app-primary-contrast)] shadow-[var(--app-shadow)]">
          {icon}
        </div>
        <span className="rounded-full border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-2 text-sm text-[var(--app-text-soft)]">
          {label}
        </span>
      </div>
      <div className={`text-5xl font-semibold tracking-tight ${accent}`}>{value}</div>
      <div className="mt-3 text-base text-[var(--app-text-muted)]">{sublabel}</div>
    </article>
  );
}

/* ── ActionCard ──────────────────────────────────────────── */

export function ActionCard({
  title,
  text,
  cta,
  highlight = false,
  href,
}: {
  title: string;
  text: string;
  cta: string;
  highlight?: boolean;
  href?: string;
}) {
  const ctaClassName = `rounded-full px-4 py-2 text-sm font-medium ${
    highlight
      ? `bg-[var(--app-success-soft)] text-[var(--app-success-text)]`
      : `bg-[var(--app-primary)] text-[var(--app-primary-contrast)]`
  }`;

  return (
    <article className="flex items-center justify-between gap-4 rounded-[24px] border border-[color:var(--app-border)] bg-[var(--app-surface)] p-4">
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl ${
            highlight
              ? `bg-[var(--app-success-soft)] text-[var(--app-success-text)]`
              : `bg-[var(--app-primary-soft)] text-[var(--app-primary)]`
          }`}
        >
          ☐
        </div>
        <div>
          <div className="font-medium text-[var(--app-text)]">{title}</div>
          <div className="mt-1 text-sm text-[var(--app-text-muted)]">{text}</div>
        </div>
      </div>
      {href ? (
        <Link href={href} className={ctaClassName}>
          {cta}
        </Link>
      ) : (
        <button type="button" className={ctaClassName}>
          {cta}
        </button>
      )}
    </article>
  );
}

/* ── ChecklistItem ───────────────────────────────────────── */

export function ChecklistItem({ checked, children }: { checked?: boolean; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 text-[var(--app-text-soft)]">
      <span
        className={`flex h-4 w-4 items-center justify-center rounded-[4px] border text-[10px] ${
          checked
            ? `border-[color:var(--app-primary)] bg-[var(--app-primary-soft)] text-[var(--app-primary)]`
            : `border-[color:var(--app-border)] text-transparent`
        }`}
      >
        ✓
      </span>
      <span className={checked ? `line-through text-[var(--app-text-faint)]` : ``}>{children}</span>
    </div>
  );
}

/* ── StatusPill ──────────────────────────────────────────── */

type StatusPillStatus =
  | `Signed`
  | `Completed`
  | `Connected`
  | `Default`
  | `Ready`
  | `Pending`
  | `Processing`
  | `Review`
  | string;

export function StatusPill({ status }: { status: StatusPillStatus }) {
  const tone =
    status === `Signed` ||
    status === `Completed` ||
    status === `Connected` ||
    status === `Default` ||
    status === `Ready`
      ? `border-transparent bg-[var(--app-success-soft)] text-[var(--app-success-text)]`
      : status === `Pending` || status === `Processing` || status === `Review`
        ? `border-transparent bg-[var(--app-warning-soft)] text-[var(--app-warning-text)]`
        : `border-[color:var(--app-border)] bg-[var(--app-surface-muted)] text-[var(--app-text-soft)]`;

  return <span className={`rounded-full border px-3 py-1 text-xs ${tone}`}>{status}</span>;
}

/* ── MetricLine ──────────────────────────────────────────── */

export function MetricLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-3">
      <span className="text-sm text-[var(--app-text-muted)]">{label}</span>
      <span className="font-medium text-[var(--app-text)]">{value}</span>
    </div>
  );
}

/* ── ActionMini ──────────────────────────────────────────── */

export function ActionMini({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="w-full rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface)] px-4 py-3 text-left text-sm text-[var(--app-text-soft)]"
    >
      {label}
    </button>
  );
}

/* ── Field ───────────────────────────────────────────────── */

export function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-2 text-sm text-[var(--app-text-muted)]">{label}</div>
      <div className="rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface)] px-4 py-3 text-[var(--app-text)]">
        {value}
      </div>
    </div>
  );
}
