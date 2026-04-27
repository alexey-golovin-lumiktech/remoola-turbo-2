export const panelSurfaceClass = `rounded-card border border-border/90 bg-linear-to-br from-panel via-panel to-white/[0.015] shadow-[0_18px_48px_rgba(2,6,23,0.24)]`;
export const panelPrimaryClass = `border-cyan-400/16 bg-linear-to-br from-panel via-panel to-cyan-500/[0.04] shadow-[0_18px_48px_rgba(8,47,73,0.22)]`;
export const panelSupportClass = `border-white/8 bg-linear-to-br from-panel via-panel to-white/[0.02]`;
export const panelMetaClass = `border-white/8 bg-white/[0.025] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]`;
export const panelClass = `${panelSurfaceClass} p-4 md:p-5 lg:p-6`;
export const panelHeaderClass = `mb-4 flex flex-col gap-3 md:mb-5 md:flex-row md:items-start md:justify-between`;
export const panelHeaderCopyClass = `min-w-0 flex-1`;
export const panelDescriptionClass = `max-w-3xl text-sm leading-6 text-muted-56`;
export const mutedTextClass = `text-sm leading-6 text-white/60`;
export const subtleTextClass = `text-xs leading-5 text-white/42`;
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

export const ghostButtonClass = `inline-flex min-h-11 items-center justify-center gap-2 rounded-input border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/76 shadow-xs transition hover:-translate-y-px hover:border-white/18 hover:bg-white/[0.06] hover:text-white focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-cyan-400/30 disabled:pointer-events-none disabled:opacity-50`;

export const primaryButtonClass = [
  `inline-flex min-h-11 items-center justify-center gap-2 rounded-input border border-cyan-400/30`,
  `bg-linear-to-r from-cyan-500/18 to-cyan-400/10 px-3 py-2 text-sm font-medium text-cyan-50`,
  `shadow-[0_10px_30px_rgba(8,47,73,0.24)] transition hover:-translate-y-px hover:border-cyan-300/40`,
  `hover:from-cyan-500/25 hover:to-cyan-400/16 hover:text-white focus-visible:outline-hidden`,
  `focus-visible:ring-2 focus-visible:ring-cyan-400/35 disabled:pointer-events-none disabled:opacity-50`,
].join(` `);
export const dangerButtonClass = [
  `inline-flex min-h-11 items-center justify-center gap-2 rounded-input border border-rose-400/30`,
  `bg-linear-to-r from-rose-500/18 to-rose-400/10 px-3 py-2 text-sm font-medium text-rose-50`,
  `shadow-[0_10px_30px_rgba(76,5,25,0.18)] transition hover:-translate-y-px hover:border-rose-300/40`,
  `hover:from-rose-500/25 hover:to-rose-400/16 hover:text-white focus-visible:outline-hidden`,
  `focus-visible:ring-2 focus-visible:ring-rose-400/25 disabled:pointer-events-none disabled:opacity-50`,
].join(` `);

export const fieldClass = `grid gap-2`;
export const fieldLabelClass = `text-sm font-medium text-text`;
export const textInputClass = `min-h-11 w-full rounded-input border border-border bg-panel-muted px-3 py-2 text-sm text-text shadow-xs transition placeholder:text-muted-40 hover:border-white/16 focus:outline-hidden focus:ring-2 focus:ring-cyan-400/30`;
export const textAreaClass = `${textInputClass} min-h-24 resize-y`;
export const checkboxFieldClass = `flex items-center gap-2 text-sm text-muted-56`;
export const checkboxInputClass = `h-4 w-4 rounded-xs border border-border bg-bg text-cyan-300 focus:outline-hidden focus:ring-2 focus:ring-cyan-400/30`;
export const detailsSummaryClass = `cursor-pointer text-sm font-medium text-muted-56 transition hover:text-text focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-cyan-400/20`;
