export const SHELL_SIDEBAR_WIDTH_CLASS = `md:w-[248px]`;

export const SHELL_CONTENT_OFFSET_CLASS = `md:ml-[248px]`;

export const SHELL_SIDEBAR_BASE_CLASS = `border-b border-(--app-border) bg-(--app-shell) backdrop-blur md:fixed md:left-0 md:top-0 md:h-screen ${SHELL_SIDEBAR_WIDTH_CLASS} md:overflow-hidden md:border-b-0 md:border-r`;

export const SHELL_MAIN_PADDING_CLASS = `flex-1 px-4 pb-24 pt-5 md:px-6 md:pb-8 md:pt-6`;

export const SHELL_BOTTOM_NAV_CLASS = `fixed inset-x-0 bottom-0 z-20 border-t border-(--app-border) bg-(--app-shell) px-2 py-2 backdrop-blur md:hidden`;

export const SHELL_LOADING_CARD_CLASS = `rounded-[28px] border border-(--app-border) bg-(--app-surface) p-5 text-sm text-(--app-text-muted) shadow-(--app-shadow)`;

export const shellMainAsideBalanced = `grid grid-cols-1 gap-5 xl:grid-cols-[1.1fr_0.9fr]`;
export const shellMainAsidePrimary = `grid grid-cols-1 gap-5 xl:grid-cols-[1.25fr_0.75fr]`;
