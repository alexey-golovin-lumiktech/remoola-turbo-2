/* eslint-disable max-len */
export const formInputBase = `rounded-md border px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white border-gray-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500`;

export const formInputFullWidth = `w-full ${formInputBase}`;
export const formFieldSpacing = `mt-1 ${formInputFullWidth}`;

export const formInputRoundedLg = `w-full rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500`;

export const formInputRoundedLgWithPrefix = `w-full rounded-lg border border-gray-300 dark:border-slate-600 px-7 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500`;

export const formInputSmall = `px-2 py-1 border rounded-md text-xs bg-white dark:bg-slate-800 text-gray-900 dark:text-white border-gray-300 dark:border-slate-600`;

export const searchInputClass = `px-3 py-2 rounded-md border text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white border-gray-300 dark:border-slate-600 placeholder:text-gray-400 dark:placeholder:text-gray-500`;

export const modalFieldVariant = `w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500`;

export const primaryButtonClass = `w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white transition hover:bg-blue-700 dark:hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60`;

export const errorTextClass = `text-sm text-red-600 dark:text-red-400`;

const pillToggleBase: Record<`md` | `lg`, string> = {
  md: `flex-1 rounded-md border px-3 py-2 text-center text-sm transition`,
  lg: `flex-1 rounded-lg border px-3 py-2 text-sm transition`,
};

const pillToggleActive = `border-blue-600 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300`;

const pillToggleInactiveMd = `border-gray-300 text-gray-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300`;

const pillToggleInactiveLg = `border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-600`;

export function getToggleButtonClasses(isActive: boolean, variant: `md` | `lg` = `md`) {
  const base = pillToggleBase[variant];
  const state = isActive ? pillToggleActive : variant === `lg` ? pillToggleInactiveLg : pillToggleInactiveMd;
  return `${base} ${state}`;
}

export const methodToggleButtonBase = `px-3 py-2 rounded-lg border text-sm font-medium text-center`;
export const methodToggleButtonActive = `border-blue-600 bg-blue-600 text-white`;
export const methodToggleButtonInactive = `border border-gray-300 dark:border-slate-600 bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white`;

export const modalOverlayClass = `fixed inset-0 bg-black/40 dark:bg-black/60 flex items-center justify-center z-50`;
export const modalContentLg = `bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-lg shadow-xl animate-fadeIn`;
export const modalContentMd = `bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-xl animate-fadeIn`;
export const modalTitleClass = `text-xl font-semibold text-gray-900 dark:text-white`;
export const modalHeaderRow = `flex justify-between items-center`;
export const modalCloseButton = `text-2xl leading-none px-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200`;
export const modalMetaLabel = `text-sm text-gray-600 dark:text-gray-300`;
export const modalMetaValue = `font-medium text-gray-900 dark:text-white`;
export const modalParagraphClass = `text-gray-700 dark:text-gray-300 text-sm`;
export const modalInfoCard = `border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700`;
export const modalInfoTitle = `font-medium text-gray-900 dark:text-white`;
export const modalInfoSubtext = `text-sm text-gray-500 dark:text-gray-400`;
export const modalDefaultBadge = `text-xs text-green-600 dark:text-green-400 font-medium mt-1`;
export const modalDangerNoticeClass = `text-sm text-red-600 dark:text-red-400 mb-4`;
export const modalButtonSecondary = `px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-sm text-gray-700 dark:text-gray-200 disabled:opacity-50`;
export const modalButtonDanger = `px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-500 text-sm`;
export const modalButtonPrimary = `px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 dark:hover:bg-blue-500 disabled:opacity-50`;
export const modalFooterActions = `flex justify-end gap-2 pt-4`;
export const modalFooterActionsLg = `flex justify-end gap-3 mt-6`;
export const successModalOverlay = `fixed inset-0 z-40 flex items-center justify-center bg-black/30 dark:bg-black/60 backdrop-blur-sm`;
export const successModalContent = `w-[90%] max-w-sm rounded-xl bg-white dark:bg-slate-800 p-6 shadow-xl`;
export const successModalTitle = `mb-2 text-lg font-semibold text-gray-900 dark:text-white`;
export const successModalDescription = `mb-4 text-sm text-gray-600 dark:text-gray-300`;

export const textPrimary = `text-gray-900 dark:text-white`;
export const textSecondary = `text-gray-600 dark:text-gray-300`;
export const textMuted = `text-slate-600 dark:text-slate-400`;
export const textMutedGray = `text-gray-500 dark:text-gray-400`;
export const textMutedSlate = `text-gray-400 dark:text-slate-400`;
export const textMutedGrayStrong = `text-gray-700 dark:text-gray-300`;
export const textMutedMixed = `text-gray-600 dark:text-slate-400`;
export const textMutedGrayAlt = `text-gray-700 dark:text-slate-300`;
export const textMutedSlateAlt = `text-gray-400 dark:text-slate-500`;
export const linkPrimary = `text-blue-600 dark:text-blue-400 hover:underline`;
export const linkPrimaryMedium = `text-blue-600 dark:text-blue-400 font-medium hover:underline`;
export const linkDanger = `text-red-500 dark:text-red-400 hover:underline`;
export const linkPrimaryUnderlineSm = `text-blue-600 dark:text-blue-400 text-sm underline`;

export const cardBase = `rounded-2xl bg-white dark:bg-slate-800 shadow-sm border dark:border-slate-600`;
export const cardBasePadded = `rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border dark:border-slate-600`;
export const cardBaseSoft = `rounded-2xl bg-white/90 dark:bg-slate-800/90 px-6 py-4 shadow-sm`;
export const cardBaseSoftCompact = `rounded-2xl bg-white/90 dark:bg-slate-800/90 p-4 shadow-sm`;

export const tableContainer = `bg-white dark:bg-slate-800 rounded-2xl shadow-sm border dark:border-slate-600`;
export const tableHeaderRow = `text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-600`;
export const tableHeaderRowMuted = `text-left text-gray-400 dark:text-slate-500 border-b border-gray-200 dark:border-slate-600`;
export const tableHeaderRowMutedAlt = `text-left text-gray-400 dark:text-slate-400 border-b border-gray-200 dark:border-slate-600`;
export const tableBodyRow = `border-b border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition`;
export const tableBodyRowMuted = `border-b border-gray-200 dark:border-slate-600 last:border-none hover:bg-gray-50 dark:hover:bg-slate-700/30`;
export const tableBodyRowMutedStrong = `border-b border-gray-200 dark:border-slate-600 last:border-none hover:bg-gray-50 dark:hover:bg-slate-700/50`;
export const tableCellHeaderMd = `px-4 py-3`;
export const tableCellHeaderLg = `px-6 py-3`;
export const tableCellHeaderSimple = `py-3`;
export const tableCellBodyMd = `px-4 py-4`;
export const tableCellBodyLg = `px-6 py-4`;
export const tableCellBodySimple = `py-3`;
export const tableEmptyCell = `px-6 py-6 text-center text-slate-500 dark:text-slate-400`;

export const badgeBase = `px-3 py-1 rounded-full text-xs font-medium`;
export const badgePending = `bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300`;
export const badgeCompleted = `bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300`;
export const badgeWaiting = `bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300`;
export const badgeDefault = `bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300`;
export const badgeDefaultInline = `inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-full font-medium`;

export const buttonPrimaryRounded = `rounded-full bg-blue-600 px-6 py-3 text-sm text-white shadow hover:bg-blue-700 dark:hover:bg-blue-500`;
export const buttonPrimaryRoundedCompact = `rounded-full bg-blue-600 px-6 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 dark:hover:bg-blue-500`;
export const buttonPrimarySm = `rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 dark:hover:bg-blue-500`;
export const buttonSecondary = `px-3 py-1 rounded-md bg-white dark:bg-slate-700 border dark:border-slate-600 shadow-sm text-gray-700 dark:text-gray-200 disabled:opacity-50`;
export const buttonDisabledCursor = `disabled:opacity-50 disabled:cursor-not-allowed`;
export const buttonDisabledOpacity = `disabled:opacity-50`;

export const actionButtonPrimary = `flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300`;
export const actionButtonDanger = `flex items-center gap-1 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300`;

export const inputPrefixIcon = `pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-500 dark:text-slate-400`;
export const checkboxBase = `rounded border-slate-300 dark:border-slate-600 text-blue-600 dark:text-blue-400`;
export const checkboxPrimary = `h-4 w-4 rounded border-gray-300 dark:border-slate-600 text-blue-600 dark:text-blue-400`;
export const checkboxSmall = `h-4 w-4`;
export const radioPrimary = `text-blue-600 dark:text-blue-400`;

export const emptyStateContainer = `flex items-center justify-center min-h-[400px] p-8`;
export const emptyStateIcon = `rounded-full bg-red-100 dark:bg-red-900/20 p-3 mb-4 mx-auto w-fit`;
export const emptyStateIconSvg = `w-8 h-8 text-red-600 dark:text-red-400`;
export const emptyStateText = `text-center py-8 text-gray-400 dark:text-slate-400`;
export const emptyStateCentered = `text-center py-10`;
export const emptyStateTitle = `text-gray-400 dark:text-slate-500 mb-4`;
export const emptyStateBody = `text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto`;

export const paymentMethodRow = `flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-xl border dark:border-slate-600 shadow-sm hover:shadow transition`;
export const paymentMethodRowIcon = `w-12 h-12 rounded-xl bg-gray-100 dark:bg-slate-700 flex items-center justify-center text-gray-700 dark:text-gray-300`;
export const paymentMethodRowTitle = `font-semibold text-gray-900 dark:text-white`;
export const paymentMethodRowMeta = `text-sm text-gray-500 dark:text-gray-400`;

export const textSm = `text-sm`;
export const fontMedium = `font-medium`;
export const textXs = `text-xs`;
export const textXsMuted = `text-xs text-slate-500 dark:text-slate-400`;
export const textMutedStrong = `text-slate-700 dark:text-slate-300`;
export const spaceY2 = `space-y-2`;
export const spaceY3 = `space-y-3`;
export const spaceY4 = `space-y-4`;
export const spaceY6 = `space-y-6`;
export const spaceY8 = `space-y-8`;
export const spaceY10 = `space-y-10`;
export const flexRowItemsCenter = `flex items-center`;
export const flexRowGap4 = `flex gap-4 items-center`;
export const flexRowGap3 = `flex gap-3`;
export const flexCol = `flex flex-col`;
export const flexJustifyEnd = `flex justify-end`;
export const gap2 = `gap-2`;
export const flexRowGap3ItemsCenter = `flex items-center gap-3`;
export const width64 = `w-64`;
export const textCenter = `text-center`;
export const textRight = `text-right`;
export const cursorPointer = `cursor-pointer`;
export const transitionColors = `transition-colors`;
export const transitionDefault = `transition`;
export const textCapitalize = `capitalize`;
export const spaceX2 = `space-x-2`;
export const spaceX3 = `space-x-3`;
export const width40 = `w-40`;
export const flexWrapItemsCenterGap4 = `flex flex-wrap items-center gap-4`;
export const inlineFlexItemsCenterGap2 = `inline-flex items-center gap-2`;
export const relativePosition = `relative`;
export const mlAuto = `ml-auto`;
export const mt4 = `mt-4`;
export const py2 = `py-2`;
export const p2 = `p-2`;
export const p4 = `p-4`;
export const mt3 = `mt-3`;
export const mb2 = `mb-2`;
export const mt1 = `mt-1`;

export const uploadButtonPrimary = `rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 dark:hover:bg-blue-500 cursor-pointer`;
export const hiddenInput = `hidden`;
export const bulkActionsRow = `flex items-center gap-2`;
export const dangerButtonSm = `px-3 py-2 rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-xs font-medium text-red-700 dark:text-red-300`;
export const attachButton = `px-3 py-2 rounded-md border bg-slate-50 dark:bg-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600`;
export const linkPrimaryXs = `text-blue-600 dark:text-blue-400 text-xs font-medium hover:underline`;

export const refreshButtonClass = `px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-500 transition-colors`;

export const paymentViewLoading = `p-8 text-slate-600 dark:text-slate-300`;
export const paymentViewNotFound = `p-8`;
export const paymentViewContainer = `px-8 py-6 flex flex-col gap-6`;
export const paymentViewTitle = `text-2xl font-semibold text-slate-900 dark:text-white`;
export const paymentViewGrid = `grid grid-cols-3 gap-6`;
export const paymentViewLeftCol = `col-span-2 flex flex-col gap-6`;
export const paymentViewRightCol = `col-span-1 flex flex-col gap-6`;
export const cardHeaderRow = `flex justify-between mb-4`;
export const amountTitle = `text-xl font-semibold text-gray-900 dark:text-white`;
export const descriptionText = `text-sm text-slate-600 dark:text-slate-300`;
export const timestampText = `mt-4 text-xs text-slate-500 dark:text-slate-400`;
export const sectionTitle = `font-semibold mb-3 text-gray-900 dark:text-white`;
export const timelineItem = `border-l border-slate-300 dark:border-slate-600 pl-4 ml-2 mb-4 relative`;
export const timelineDot = `absolute w-3 h-3 bg-blue-600 dark:bg-blue-500 rounded-full -left-1 top-1`;
export const timelineTitle = `text-sm font-semibold text-gray-900 dark:text-white`;
export const timelineMeta = `text-xs text-slate-600 dark:text-slate-400`;
export const attachmentRow = `flex justify-between items-center border-b border-slate-200 dark:border-slate-600 py-2`;
export const attachmentName = `text-sm text-gray-900 dark:text-white`;
export const attachmentSize = `text-xs text-slate-500 dark:text-slate-400`;
export const attachmentLink = `text-blue-600 dark:text-blue-400 text-sm font-medium`;
export const selectableCardBase = `p-3 border rounded-lg cursor-pointer transition-colors`;
export const selectableCardActive = `border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400`;
export const selectableCardInactive = `border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500`;
export const methodRowHeader = `flex items-center justify-between`;
export const methodRowLeft = `flex items-center gap-3`;
export const badgeBaseStrong = `px-3 py-1 rounded-full text-xs font-semibold`;
export const badgeNeutral = `bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300`;
export const badgeDefaultSm = `ml-2 px-2 py-1 text-xs bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 rounded`;

export const bankTransferContainer = `max-w-3xl mx-auto pb-16`;
export const bankTransferStepper = `flex items-center gap-4 mb-10`;
export const bankTransferAlert = `bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 p-4 rounded-xl mb-8`;
export const bankTransferAlertTitle = `font-semibold mb-1`;
export const bankTransferAlertText = `text-sm`;
export const bankTransferAmountRow = `flex justify-between items-end mb-6`;
export const bankTransferAmountLabel = `text-lg font-semibold text-slate-900 dark:text-white mb-1`;
export const bankTransferAmountValue = `text-2xl font-bold text-gray-900 dark:text-white`;
export const bankTransferDownloadButton = `flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 text-white rounded-lg shadow-sm`;
export const bankTransferCard = `border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-6`;
export const bankTransferCardTitle = `text-xl font-semibold mb-5 text-slate-800 dark:text-slate-200`;
export const bankTransferSwiftNote = `mt-6 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl p-4 text-sm text-slate-700 dark:text-slate-300`;
export const bankTransferContinueButton = `w-full mt-10 py-4 bg-green-600 hover:bg-green-700 dark:hover:bg-green-500 text-white font-semibold text-lg rounded-xl shadow`;
export const stepContainer = `flex items-center gap-2`;
export const stepIconBase = `w-5 h-5 rounded-full flex items-center justify-center`;
export const stepIconActive = `bg-green-600 text-white`;
export const stepIconInactive = `bg-slate-200 dark:bg-slate-600`;
export const stepLabelActive = `text-slate-900 dark:text-white font-medium`;
export const stepLabelInactive = `text-slate-400 dark:text-slate-500`;
export const fieldWrapper = `mb-5`;
export const fieldLabel = `text-sm font-medium text-slate-500 dark:text-slate-400 mb-1`;
export const fieldRow = `flex items-center border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 px-3 py-2`;
export const fieldValue = `text-slate-900 dark:text-white font-medium truncate`;
export const fieldCopyButton = `ml-auto text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200`;
export const fieldCopyIconActive = `text-green-600 dark:text-green-400`;
export const fieldHelper = `text-xs text-slate-500 dark:text-slate-400 mt-1`;

export const docPreviewOverlay = `fixed inset-0 z-50 bg-black/40 dark:bg-black/60 flex items-center justify-center p-2 md:p-6`;
export const docPreviewModal = `relative bg-white dark:bg-slate-900 rounded-xl shadow-xl overflow-hidden transition-all`;
export const docPreviewFullscreen = `w-screen h-screen rounded-none`;
export const docPreviewTopbar = `flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800`;
export const docPreviewTitle = `font-semibold text-gray-900 dark:text-white`;
export const docPreviewMeta = `text-xs text-gray-500 dark:text-gray-400`;
export const docPreviewActions = `flex items-center gap-3`;
export const docPreviewActionButton = `px-2 py-1 rounded-md border border-gray-200 dark:border-slate-600 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700`;
export const docPreviewActionButtonSquare = `px-2 py-1 border border-gray-200 dark:border-slate-600 rounded text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700`;
export const docPreviewZoomLabel = `text-sm w-10 text-center`;
export const docPreviewCloseButton = `text-xl px-2 text-gray-700 dark:text-gray-200`;
export const docPreviewContent = `flex h-[calc(100%-50px)] overflow-hidden bg-gray-100 dark:bg-slate-900`;
export const docPreviewSidebar = `hidden md:block w-32 border-r border-gray-200 dark:border-slate-700 overflow-auto bg-gray-200 dark:bg-slate-800 p-2`;
export const docPreviewSidebarLabel = `text-xs text-center text-gray-500 dark:text-gray-400`;
export const docPreviewDocument = `flex-1 overflow-auto flex justify-center items-start p-4`;
export const docPreviewIframe = `w-full h-full`;
export const docPreviewImage = `object-contain`;
export const docPreviewDragHandle = `absolute bottom-0 right-0 w-6 h-6 cursor-se-resize opacity-50 hover:opacity-100`;
export const docPreviewDragHandleIcon = `w-full h-full bg-gray-400/40 dark:bg-slate-700/50 rounded-tr-md`;

export const loginContainer = `mx-auto max-w-md p-8`;
export const loginTitle = `mb-4 text-2xl font-semibold text-gray-900 dark:text-white`;
export const loginForm = `space-y-3`;
export const loginErrorText = `mt-1 whitespace-pre-wrap text-sm text-rose-600 dark:text-rose-400`;
export const loginButton = `rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 dark:hover:bg-blue-500`;
export const loginFooter = `mt-6 text-center text-sm text-gray-600 dark:text-gray-300`;

export const withdrawTransferContainer = `mx-auto max-w-2xl px-4 py-8`;
export const withdrawTransferTitle = `mb-2 text-2xl font-semibold text-gray-900 dark:text-white`;
export const withdrawTransferBalance = `mb-2 text-sm text-gray-700 dark:text-gray-300`;
export const withdrawTransferBalanceAmount = `font-semibold`;

export const contactsPageContainer = `flex flex-col gap-6 px-8 py-6`;
export const contactsPageHeader = `flex items-center justify-between`;
export const contactsPageTitle = `text-2xl font-semibold text-gray-900 dark:text-white`;
export const contactsPageSubtitle = `text-sm text-gray-500 dark:text-gray-400`;
export const contactsAddButton = `px-4 py-2 bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 dark:hover:bg-blue-500 transition`;

export const contactDetailsContainer = `p-8 space-y-8`;
export const contactDetailsTitle = `text-2xl font-semibold text-gray-900 dark:text-white`;
export const contactDetailsSubtitle = `text-gray-600 dark:text-gray-300`;
export const contactDetailsCard = `rounded-xl bg-white dark:bg-slate-800 p-4 shadow dark:border dark:border-slate-600`;
export const contactDetailsCardTitle = `font-semibold mb-2 text-gray-900 dark:text-white`;
export const contactDetailsCardTitleLg = `font-semibold mb-4 text-gray-900 dark:text-white`;
export const contactDetailsPre = `text-sm text-gray-700 dark:text-gray-300`;
export const contactDetailsPaymentList = `space-y-2`;
export const contactDetailsPaymentLink = `block border border-gray-200 dark:border-slate-600 px-4 py-2 rounded hover:bg-gray-50 dark:hover:bg-slate-700/50 text-gray-900 dark:text-white`;
export const contactDetailsPaymentMeta = `text-xs text-gray-500 dark:text-slate-400`;
export const contactDetailsEmptyText = `text-gray-400 dark:text-slate-500`;
export const contactDetailsDocsGrid = `grid grid-cols-2 gap-4`;
export const contactDetailsDocCard = `border border-gray-200 dark:border-slate-600 rounded p-3 bg-gray-50 dark:bg-slate-700`;
export const contactModalInput = `w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2 bg-white dark:bg-slate-800 text-gray-900 dark:text-white`;

export const contactViewContainer = `p-8 space-y-4`;
export const contactViewTitle = `text-xl font-semibold`;
export const contactViewDetails = `space-y-2`;
export const contactViewButton = `px-4 py-2 rounded-md bg-blue-600 text-white`;

export const formCardBase = `space-y-4 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-6 shadow-sm`;
export const formCardTitle = `text-lg font-semibold text-gray-900 dark:text-white`;
export const formCardDescription = `text-sm text-gray-600 dark:text-slate-300`;
export const formFieldLabel = `mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300`;
export const formFieldDescription = `text-xs text-gray-500 dark:text-slate-400 mb-2`;

export const errorBoundaryContainer = `flex flex-col items-center justify-center min-h-[400px] p-8 text-center`;
export const errorBoundaryTitle = `text-xl font-semibold text-gray-900 dark:text-white mb-2`;
export const errorBoundaryText = `text-gray-600 dark:text-gray-300 mb-6 max-w-md`;
export const errorBoundaryButtons = `space-x-4`;
export const errorBoundaryRetryButton = `px-4 py-2 bg-gray-600 dark:bg-slate-600 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-slate-500 transition-colors`;
export const errorDetails = `mt-6 text-left`;
export const errorDetailsSummary = `cursor-pointer text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200`;
export const errorDetailsPre = `mt-2 p-4 bg-gray-100 dark:bg-slate-800 rounded text-xs overflow-auto max-w-full text-gray-900 dark:text-gray-100`;
export const sectionErrorFallback = `flex items-center justify-center p-8 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg`;
export const sectionErrorIcon = `w-6 h-6 text-red-600 dark:text-red-400 mx-auto mb-2`;
export const sectionErrorText = `text-sm text-red-700 dark:text-red-300`;

export const quickDocsHeader = `mb-3 flex items-center justify-between`;
export const quickDocsTitle = `text-sm font-semibold text-slate-900 dark:text-white`;
export const quickDocsLink = `text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline`;
export const quickDocsEmpty = `text-sm text-slate-400 dark:text-slate-500`;
export const quickDocsList = `space-y-2 text-sm`;
export const quickDocsItem = `flex items-center justify-between rounded-lg bg-slate-50 dark:bg-slate-700 px-3 py-2`;
export const quickDocsName = `truncate text-slate-800 dark:text-slate-200`;
export const quickDocsDate = `whitespace-nowrap text-xs text-slate-400 dark:text-slate-500`;

export const complianceHeader = `mb-3 flex items-center justify-between`;
export const complianceTitle = `text-sm font-semibold text-slate-900 dark:text-white`;
export const complianceSubtitle = `text-xs text-slate-500 dark:text-slate-400`;
export const complianceProgressText = `text-xs font-medium text-blue-600 dark:text-blue-400`;
export const complianceBar = `mb-3 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700`;
export const complianceBarFill = `h-full rounded-full bg-blue-500 transition-[width]`;
export const complianceList = `space-y-2`;
export const complianceItem = `flex items-center gap-2 text-sm`;
export const complianceLabelDone = `text-slate-400 dark:text-slate-500 line-through`;
export const complianceLabelOpen = `text-slate-700 dark:text-slate-300`;
export const complianceEmpty = `text-sm text-slate-400 dark:text-slate-500`;

export const summaryGrid = `grid gap-4 md:grid-cols-3`;
export const summaryCardLabel = `text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400`;
export const summaryValueLg = `mt-2 text-3xl font-semibold text-slate-900 dark:text-white`;
export const summaryValueMd = `mt-2 text-2xl font-semibold text-slate-900 dark:text-white`;
export const summaryValueSm = `mt-2 text-lg font-semibold text-slate-900 dark:text-white`;
export const summaryValueMeta = `text-sm font-normal text-slate-500 dark:text-slate-400`;

export const pendingRequestsSection = `w-full`;
export const pendingRequestsHeader = `mb-3 flex items-center justify-between`;
export const pendingRequestsTitle = `text-sm font-semibold text-slate-900 dark:text-white`;
export const pendingRequestsTableWrapper = `overflow-hidden rounded-xl border border-slate-100 dark:border-slate-600`;
export const pendingRequestsTable = `min-w-full divide-y divide-slate-100 dark:divide-slate-600 bg-white dark:bg-slate-800 text-sm`;
export const pendingRequestsHead = `bg-slate-50 dark:bg-slate-700`;
export const pendingRequestsHeadCell = `px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400`;
export const pendingRequestsHeadCellRight = `px-4 py-2 text-right text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400`;
export const pendingRequestsBody = `divide-y divide-slate-50 dark:divide-slate-600`;
export const pendingRequestsEmptyCell = `px-4 py-6 text-center text-sm text-slate-400 dark:text-slate-500`;
export const pendingRequestsCell = `px-4 py-3 text-sm text-slate-900 dark:text-white`;
export const pendingRequestsStatus = `px-4 py-3 text-xs font-medium uppercase tracking-wide text-blue-600 dark:text-blue-400`;
export const pendingRequestsDate = `px-4 py-3 text-right text-xs text-slate-500 dark:text-slate-400`;

export const dashboardContainer = `flex h-full flex-col gap-6 px-8 py-6`;
export const dashboardGrid = `grid gap-4 md:grid-cols-[2fr,1fr]`;
export const dashboardSidebar = `flex flex-col gap-4`;

export const pendingWithdrawalsCard = `rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-4 shadow-sm`;
export const pendingWithdrawalsHeader = `mb-2 flex items-center justify-between`;
export const pendingWithdrawalsTitle = `text-sm font-semibold text-gray-900 dark:text-white`;
export const pendingWithdrawalsCount = `text-xs text-gray-500 dark:text-gray-400`;
export const pendingWithdrawalsHint = `text-xs text-gray-500 dark:text-gray-400`;
export const pendingWithdrawalsList = `space-y-2 text-xs`;
export const pendingWithdrawalsItem = `flex items-center justify-between rounded-lg bg-gray-50 dark:bg-slate-700 px-3 py-2`;
export const pendingWithdrawalsAmount = `font-medium text-gray-900 dark:text-white`;
export const pendingWithdrawalsCode = `text-[11px] text-gray-500 dark:text-gray-400`;
export const pendingWithdrawalsBadge = `rounded-full bg-yellow-100 dark:bg-yellow-900/20 px-2 py-0.5 text-[11px] font-medium text-yellow-800 dark:text-yellow-300`;

export const activityHeader = `mb-3 flex items-center justify-between`;
export const activityTitle = `text-sm font-semibold text-slate-900 dark:text-white`;
export const activityList = `space-y-3`;
export const activityEmpty = `text-sm text-slate-400 dark:text-slate-500`;
export const activityRow = `flex items-start gap-3`;
export const activityDot = `mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500`;
export const activityRowBody = `flex-1`;
export const activityRowHeader = `flex items-center justify-between`;
export const activityLabel = `text-sm font-medium text-slate-900 dark:text-white`;
export const activityDate = `text-xs text-slate-400 dark:text-slate-500`;
export const activityDescription = `text-xs text-slate-500 dark:text-slate-400`;

export const dashboardHeader = `flex flex-col gap-1`;
export const dashboardHeaderTitle = `text-2xl font-semibold text-slate-900 dark:text-white`;
export const dashboardHeaderSubtitle = `text-sm text-slate-500 dark:text-slate-400`;

export const actionRowGrid = `grid gap-4 md:grid-cols-[2fr,1fr]`;
export const actionRowCard = `flex items-center justify-between rounded-2xl bg-white/90 dark:bg-slate-800/90 px-6 py-4 shadow-sm`;
export const actionRowTitle = `text-sm font-medium text-slate-900 dark:text-white`;
export const actionRowSubtitle = `text-xs text-slate-500 dark:text-slate-400`;
export const actionRowButton = `rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 dark:hover:bg-blue-500`;

export const signupNavContainer = `mt-6 space-y-4`;
export const signupNavRow = `flex items-center justify-between text-sm`;
export const signupBackLink = `text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200`;
export const signupLoginText = `text-right text-gray-600 dark:text-gray-400`;
export const signupLoginPrefix = `mr-1`;
export const signupLoginLink = `font-medium text-blue-600 dark:text-blue-400 hover:underline`;
export const signupNextButton = `w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 dark:hover:bg-blue-500`;

export const signupStartPageContainer = `flex min-h-screen items-center justify-center bg-gray-50 dark:bg-slate-900 px-4`;
export const signupStartCard = `w-full max-w-xl space-y-8 text-center`;
export const signupStartHeader = `space-y-1`;
export const signupStartSubtitle = `text-sm text-gray-500 dark:text-gray-400`;
export const signupStartTitle = `text-3xl font-semibold`;
export const signupStartOptions = `flex gap-5 justify-center`;
export const signupStartOptionBase = `flex h-40 w-40 flex-col items-center justify-center rounded-xl border transition-all`;
export const signupStartOptionActive = `border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20 shadow-sm`;
export const signupStartOptionInactive = `border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700`;
export const signupStartOptionEmoji = `text-4xl mb-2`;
export const signupStartOptionLabelBase = `text-sm font-semibold`;
export const signupStartOptionLabelActive = `text-blue-700 dark:text-blue-300`;
export const signupStartOptionLabelInactive = `text-gray-700 dark:text-gray-300`;
export const signupStartInfo = `text-left text-sm text-gray-600 dark:text-gray-300 mx-auto max-w-sm space-y-1`;
export const signupStartInfoTitle = `font-medium`;
export const signupStartList = `list-disc list-inside space-y-1`;
export const signupStartNextButton = `w-full rounded-lg bg-blue-600 px-5 py-3 text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed`;
export const signupStartBackButton = `block w-full text-sm text-gray-500 dark:text-gray-400 mt-2 hover:underline`;

export const signupCompletedContainer = `min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 px-4`;
export const signupCompletedCard = `w-full max-w-md rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-8 shadow-sm text-center`;
export const signupCompletedIconWrap = `flex justify-center mb-6`;
export const signupCompletedIcon = `h-14 w-14 text-green-500 dark:text-green-400`;
export const signupCompletedTitle = `text-2xl font-semibold text-gray-900 dark:text-white mb-2`;
export const signupCompletedSubtitle = `text-lg text-gray-600 dark:text-gray-300 mb-6`;
export const signupCompletedBrand = `font-semibold text-indigo-600 dark:text-indigo-400`;
export const signupCompletedText = `text-gray-600 dark:text-gray-300 mb-8 leading-relaxed`;
export const signupCompletedButton = `block w-full rounded-lg bg-indigo-600 py-3 text-white font-medium hover:bg-indigo-700 dark:hover:bg-indigo-500 transition`;

export const verificationContainer = `flex flex-col items-center justify-center min-h-screen text-center p-6`;
export const verificationTitle = `text-2xl font-semibold mb-3 text-gray-900 dark:text-white`;
export const verificationText = `text-gray-600 dark:text-gray-300 mb-6`;
export const verificationLink = `text-blue-600 dark:text-blue-400 hover:underline`;
export const verificationSuccessTitle = `text-3xl font-bold text-green-600 dark:text-green-400 mb-3`;
export const verificationFailedTitle = `text-3xl font-bold text-red-600 dark:text-red-400 mb-3`;
export const verificationUnknownTitle = `text-3xl font-bold text-gray-700 dark:text-gray-300 mb-3`;
export const verificationMutedText = `text-gray-500 dark:text-gray-400 mb-6`;
export const verificationEmail = `font-mono`;

export const signupFlowContainer = `flex flex-col items-center px-4 py-8`;

export const stepperContainer = `flex items-center justify-between w-full max-w-md mx-auto mt-5 mb-8 gap-3`;
export const stepperItem = `flex flex-col items-center flex-1 text-center`;
export const stepperCircleBase = `flex h-9 w-9 items-center justify-center rounded-full border text-sm transition`;
export const stepperCircleActive = `border-blue-600 bg-blue-600 text-white`;
export const stepperCircleComplete = `border-green-600 bg-green-600 text-white`;
export const stepperCircleInactive = `border-gray-300 dark:border-slate-600 text-gray-500 dark:text-slate-400`;
export const stepperLabelBase = `mt-2 text-[11px] leading-tight`;
export const stepperLabelActive = `font-semibold text-blue-600 dark:text-blue-400`;
export const stepperLabelInactive = `text-gray-600 dark:text-gray-400`;

export const signupStepCard = `w-full max-w-md space-y-4 rounded bg-white dark:bg-slate-800 p-6 shadow-sm`;
export const signupStepTitle = `mb-2 text-lg font-semibold text-gray-900 dark:text-white`;
export const signupStepTitleLg = `mb-1 text-xl font-semibold text-gray-900 dark:text-white`;
export const signupStepSubtitle = `mb-4 text-sm text-gray-600 dark:text-gray-300`;
export const signupStepGrid = `grid grid-cols-2 gap-3`;
export const signupStepGroup = `space-y-1`;
export const signupStepLabel = `block text-xs font-medium text-gray-700 dark:text-gray-300`;
export const signupStepGroupLg = `space-y-2`;
export const signupStepLabelInline = `text-xs font-medium text-gray-700 dark:text-gray-300`;
export const signupPasswordRow = `flex gap-2`;
export const signupPasswordInput = `flex-1`;
export const signupGenerateButton = `whitespace-nowrap rounded-md border border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 text-xs font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30`;

export const shellContainer = `mx-auto flex gap-6 px-3 py-4 sm:px-6 lg:px-8`;
export const shellAside = `sticky top-4 hidden h-[calc(100vh-2rem)] w-64 shrink-0 rounded-3xl bg-blue-900 p-4 text-white shadow-xl lg:block`;
export const shellBrandRow = `flex items-center gap-2 px-2 py-3`;
export const shellBrandIcon = `h-8 w-8 rounded-xl bg-white/20`;
export const shellBrandText = `text-lg font-bold tracking-tight`;
export const shellNav = `mt-6 space-y-1`;
export const shellFooter = `absolute bottom-4 left-0 right-0 px-4 text-xs text-white/70`;
export const shellMain = `flex-1`;
export const shellHeader = `mb-5 flex items-center gap-3`;
export const shellSearchWrap = `relative w-full`;
export const shellSearchInput = `w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-sm outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-white dark:placeholder:text-gray-400`;
export const shellSearchHint = `pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500`;
export const shellLogout = `grid h-10 w-10 place-items-center rounded-full bg-white shadow-sm ring-1 ring-black/5 dark:bg-slate-800 dark:ring-white/10 dark:text-white`;

export const pageContainer = `px-8 py-6`;
export const pageTitle = `text-2xl font-semibold text-slate-900 dark:text-white mb-2`;
export const pageSubtitle = `text-sm text-slate-500 dark:text-slate-400 mb-6`;
export const pageStackContainer = `flex flex-col gap-6 px-8 py-6`;
export const pageTitleGray = `text-2xl font-semibold text-gray-900 dark:text-white`;
export const pageSubtitleGray = `text-sm text-gray-500 dark:text-gray-400`;
export const pageTitlePlain = `text-2xl font-semibold text-slate-900 dark:text-white`;
export const pageSubtitlePlain = `text-sm text-slate-500 dark:text-slate-400`;
export const startPaymentCard = `rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm max-w-xl border border-slate-200 dark:border-slate-600`;
export const pageHeaderRow = `flex justify-between items-center`;
export const primaryActionButton = `px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 dark:hover:bg-blue-500 transition`;

export const settingsPageContainer = `mx-auto max-w-3xl px-4 py-8`;
export const settingsPageTitle = `text-2xl font-semibold mb-4 text-gray-900 dark:text-white`;

export const formSection = `form-section`;
export const formSectionTitle = `text-lg font-semibold text-gray-900 dark:text-white`;
export const formGrid = `grid gap-4`;
export const inputLabel = `input-label`;
export const inputClass = `input`;
export const formGridClass = `form-grid`;
export const formGridSpan2 = `col-span-2`;

export const themeCard = `border p-6 rounded-xl bg-white shadow-sm dark:bg-slate-800 dark:border-slate-600`;
export const themeTitle = `text-lg font-semibold mb-4 text-gray-900 dark:text-white`;
export const themeDescription = `text-sm text-gray-600 dark:text-gray-300 mb-6`;
export const themeDeviceHint = `text-xs text-gray-500 dark:text-gray-400 mb-6`;
export const themeOptions = `space-y-3`;
export const themeOptionBase = `flex items-center p-4 rounded-lg border cursor-pointer transition-colors`;
export const themeOptionActive = `border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400`;
export const themeOptionInactive = `border-gray-200 bg-gray-50 hover:bg-gray-100 dark:border-slate-600 dark:bg-slate-700 dark:hover:bg-slate-600`;
export const themeOptionDisabled = `opacity-50 pointer-events-none`;
export const themeOptionInput = `sr-only`;
export const themeOptionBody = `flex items-center flex-1`;
export const themeOptionIcon = `text-2xl mr-4`;
export const themeOptionLabel = `font-medium text-gray-900 dark:text-white`;
export const themeOptionText = `text-sm text-gray-600 dark:text-gray-300`;
export const themeOptionCheck = `w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center`;
export const themeOptionCheckInner = `w-2 h-2 rounded-full bg-white dark:bg-slate-200`;
export const themeUpdating = `mt-4 text-sm text-gray-600 dark:text-gray-300`;

export const authCallbackContainer = `flex h-screen items-center justify-center text-gray-600 dark:text-gray-300`;

export const balancesLoading = `text-sm text-gray-500 dark:text-gray-400 mb-6`;
export const balancesRow = `flex gap-4 mb-6`;
export const balanceCard = `flex-1 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-4 text-center shadow-sm`;
export const balanceLabel = `text-xs text-gray-500 dark:text-gray-400`;
export const balanceValue = `text-lg font-semibold text-gray-900 dark:text-white`;

export const rateCard = `mt-2 rounded-lg bg-gray-50 dark:bg-slate-800 px-4 py-3 text-sm flex flex-col gap-1 border border-gray-200 dark:border-slate-700`;
export const rateLoading = `text-gray-500 dark:text-gray-400 text-xs`;
export const rateRow = `flex items-center gap-2`;
export const rateFrom = `font-semibold`;
export const rateEquals = `text-gray-700 dark:text-gray-300`;
export const rateValue = `font-semibold transition-all`;
export const rateValueChanged = `text-green-600 dark:text-green-400 scale-[1.05]`;
export const rateInverse = `text-xs text-gray-600 dark:text-gray-400`;
export const rateChangedText = `text-xs text-green-600 dark:text-green-400`;
export const rateEmpty = `text-gray-500 dark:text-gray-400 text-xs`;

export const exchangeCard = `rounded-xl border p-6 bg-white dark:bg-slate-800 shadow dark:border-slate-600`;
export const exchangeAvailable = `mb-2 text-sm text-gray-600 dark:text-gray-300`;
export const exchangeForm = `space-y-4`;
export const exchangeLabel = `text-sm text-gray-700 dark:text-gray-300`;
export const exchangeField = `border border-gray-300 dark:border-slate-600 rounded p-2 w-full bg-white dark:bg-slate-800 text-gray-900 dark:text-white`;
export const exchangeRateText = `text-sm text-gray-500 dark:text-gray-400`;
export const exchangeResultText = `text-sm font-semibold text-gray-900 dark:text-white`;
export const exchangeButton = `w-full bg-blue-600 p-2 rounded text-white hover:bg-blue-700 dark:hover:bg-blue-500 disabled:opacity-50`;

export const exchangePageContainer = `mx-auto max-w-2xl p-6`;
export const exchangePageTitle = `text-2xl font-bold mb-6`;

export const flexRowBetween = `flex items-center justify-between`;
export const gridGap4 = `grid gap-4`;
export const gridSummaryCards = `grid gap-4 md:grid-cols-2 lg:grid-cols-4`;
export const gridMainContent = `grid gap-4 md:grid-cols-[2fr,1fr]`;

export const skeletonBase = `animate-pulse rounded-md bg-gray-200 dark:bg-slate-700`;
export const skeletonLine = `h-4 w-full`;
export const skeletonSpaceY2 = `space-y-2`;
export const skeletonSpaceY3 = `space-y-3`;
export const skeletonSpaceY4 = `space-y-4`;
export const skeletonCard = `rounded-2xl bg-white/90 dark:bg-slate-800/90 p-6 shadow-sm`;
export const skeletonCardTitle = `h-6 w-1/3`;
export const skeletonTextFiveSixths = `h-4 w-5/6`;
export const skeletonTextFourSixths = `h-4 w-4/6`;
export const skeletonTableContainer = `bg-white dark:bg-slate-800 rounded-2xl shadow-sm border dark:border-slate-600`;
export const skeletonTablePadding = `p-6`;
export const skeletonHeaderCell = `h-4 w-20`;
export const skeletonRow = `grid gap-4 py-3 border-b last:border-b-0`;
export const skeletonCellShort = `w-24`;
export const skeletonCellTiny = `w-16`;
export const skeletonHeaderBlock = `grid gap-4 mb-4`;
export const skeletonHeaderTitle = `h-8 w-48`;
export const skeletonHeaderAction = `h-10 w-32`;
export const skeletonCardPadding = `p-4`;
