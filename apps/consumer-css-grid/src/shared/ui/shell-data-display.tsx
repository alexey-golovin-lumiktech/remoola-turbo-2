import { type ReactNode } from 'react';

export function MetricCard({
  icon,
  label,
  value,
  sublabel,
  accent = `text-(--app-text)`,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  sublabel: string;
  accent?: string;
}) {
  return (
    <article className="rounded-[28px] border border-(--app-border) bg-(--app-card-gradient) p-5 shadow-(--app-shadow)">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-(--app-primary) text-xl text-(--app-primary-contrast) shadow-(--app-shadow)">
          {icon}
        </div>
        <span className="rounded-full border border-(--app-border) bg-(--app-surface-muted) px-4 py-2 text-sm text-(--app-text-soft)">
          {label}
        </span>
      </div>
      <div className={`text-5xl font-semibold tracking-tight ${accent}`}>{value}</div>
      <div className="mt-3 text-base text-(--app-text-muted)">{sublabel}</div>
    </article>
  );
}

export function MetricLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-3">
      <span className="text-sm text-(--app-text-muted)">{label}</span>
      <span className="font-medium text-(--app-text)">{value}</span>
    </div>
  );
}

export function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-2 text-sm text-(--app-text-muted)">{label}</div>
      <div className="rounded-2xl border border-(--app-border) bg-(--app-surface) px-4 py-3 text-(--app-text)">
        {value}
      </div>
    </div>
  );
}
