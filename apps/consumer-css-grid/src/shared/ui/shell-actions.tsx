import Link from 'next/link';

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
    highlight ? `bg-(--app-success-soft) text-(--app-success-text)` : `bg-(--app-primary) text-(--app-primary-contrast)`
  }`;

  return (
    <article className="flex items-center justify-between gap-4 rounded-[24px] border border-(--app-border) bg-(--app-surface) p-4">
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl ${
            highlight
              ? `bg-(--app-success-soft) text-(--app-success-text)`
              : `bg-(--app-primary-soft) text-(--app-primary)`
          }`}
        >
          ☐
        </div>
        <div>
          <div className="font-medium text-(--app-text)">{title}</div>
          <div className="mt-1 text-sm text-(--app-text-muted)">{text}</div>
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

export function ActionMini({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="w-full rounded-2xl border border-(--app-border) bg-(--app-surface) px-4 py-3 text-left text-sm text-(--app-text-soft)"
    >
      {label}
    </button>
  );
}
