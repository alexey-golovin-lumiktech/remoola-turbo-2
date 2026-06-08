// NOTE: many routes use bg-(--app-primary) buttons with text-(--app-text) instead of
// text-(--app-primary-contrast). That variant is intentional in those routes and will
// be reviewed in Session G. This constant captures the settings-canonical form.
export const primaryButtonClass = `w-full rounded-2xl bg-(--app-primary) px-4 py-3 font-medium text-(--app-primary-contrast) disabled:cursor-not-allowed disabled:opacity-50`;

export const secondaryButtonClass = `flex w-full items-center justify-center rounded-2xl border border-(--app-border) bg-(--app-surface) px-4 py-3 text-sm font-medium text-(--app-text) shadow-(--app-shadow) transition hover:bg-(--app-surface-strong)`;

export const dangerButtonClass = `flex w-full items-center justify-center rounded-2xl border border-transparent bg-(--app-danger-soft) px-4 py-3 text-sm font-medium text-(--app-danger-text) transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60`;
