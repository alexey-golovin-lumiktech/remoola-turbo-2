export const panelSurfaceClass = `rounded-card border border-border bg-panel shadow-xs`;
export const panelPrimaryClass = `border-cyan-400/14 bg-linear-to-br from-panel via-panel to-cyan-500/[0.03] shadow-sm`;
export const panelSupportClass = `border-white/8 bg-panel shadow-xs`;
export const panelMetaClass = `border-white/6 bg-white/[0.02] shadow-none`;
export const panelClass = `${panelSurfaceClass} p-4 md:p-5`;
export const panelHeaderClass = `mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between`;
export const panelHeaderCopyClass = `min-w-0 flex-1`;
export const panelDescriptionClass = `max-w-3xl text-sm leading-6 text-muted-56`;
export const mutedTextClass = `text-sm leading-6 text-muted-56`;
export const subtleTextClass = `text-xs leading-5 text-muted-40`;
export const monoMutedTextClass = `font-mono text-xs leading-5 text-muted-40`;
export const emptyPanelClass = `${panelSurfaceClass} px-4 py-4 text-sm leading-6 text-muted-56`;
export const buttonRowClass = `flex flex-wrap items-center gap-2`;
export const actionGroupClass = `flex flex-wrap items-center gap-2`;
export const actionGroupLabelClass = `text-[11px] font-medium uppercase tracking-[0.2em] text-white/35`;
export const stackClass = `flex flex-col gap-4`;

export const pillBaseClass = `inline-flex items-center rounded-pill border px-2.5 py-1 text-xs font-medium leading-none transition-colors`;
export const pillDenseClass = `px-2 py-0.5 text-[11px]`;

export const toneClassByTone = {
  rose: `border-rose-400/20 bg-rose-500/10 text-rose-100`,
  amber: `border-amber-400/20 bg-amber-500/10 text-amber-100`,
  emerald: `border-emerald-400/20 bg-emerald-500/15 text-emerald-100`,
  cyan: `border-cyan-400/20 bg-cyan-500/10 text-cyan-100`,
  neutral: `border-border bg-panel-muted text-muted-72`,
} as const;

export const ghostButtonClass = `inline-flex min-h-11 items-center justify-center gap-2 rounded-input border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/72 shadow-xs transition hover:border-white/20 hover:bg-white/[0.05] hover:text-white/90 disabled:pointer-events-none disabled:opacity-50`;

export const primaryButtonClass = `inline-flex min-h-11 items-center justify-center gap-2 rounded-input border border-cyan-400/30 bg-cyan-500/15 px-3 py-2 text-sm font-medium text-cyan-100 shadow-xs transition hover:bg-cyan-500/25 hover:text-white disabled:pointer-events-none disabled:opacity-50`;
export const dangerButtonClass = `inline-flex min-h-11 items-center justify-center gap-2 rounded-input border border-rose-400/30 bg-rose-500/15 px-3 py-2 text-sm font-medium text-rose-100 shadow-xs transition hover:bg-rose-500/25 hover:text-white disabled:pointer-events-none disabled:opacity-50`;

export const fieldClass = `grid gap-2`;
export const fieldLabelClass = `text-sm font-medium text-text`;
export const textInputClass = `min-h-11 w-full rounded-input border border-border bg-panel-muted px-3 py-2 text-sm text-text shadow-xs transition placeholder:text-muted-40 focus:outline-hidden focus:ring-2 focus:ring-cyan-400/30`;
export const textAreaClass = `${textInputClass} min-h-24 resize-y`;
export const checkboxFieldClass = `flex items-center gap-2 text-sm text-muted-56`;
export const checkboxInputClass = `h-4 w-4 rounded-xs border border-border bg-bg text-cyan-300 focus:outline-hidden focus:ring-2 focus:ring-cyan-400/30`;
export const detailsSummaryClass = `cursor-pointer text-sm font-medium text-muted-56 transition hover:text-text`;
