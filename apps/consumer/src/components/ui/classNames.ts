/* eslint-disable max-len */
const joinClasses = (...classes: string[]) => classes.filter(Boolean).join(` `);

const inputBaseColors = `bg-white dark:bg-slate-800 text-gray-900 dark:text-white`;
const inputBorderColors = `border-gray-300 dark:border-slate-600`;
const inputFocusRing = `focus:outline-none focus:ring-2 focus:ring-blue-500`;
const inputPaddingMd = `px-3 py-2`;
const inputPaddingWithPrefix = `px-7 py-2`;
const inputPaddingSm = `px-2 py-1`;
const textSizeSm = `text-sm`;
const textSizeXs = `text-xs`;
const bgWhiteDark = `bg-white dark:bg-slate-800`;
const bgWhiteSoftDark = `bg-white/90 dark:bg-slate-800/90`;
const bgGray50Dark = `bg-gray-50 dark:bg-slate-700`;
const bgSlate50Dark = `bg-slate-50 dark:bg-slate-700`;
const bgBlackOverlay = `bg-black/40 dark:bg-black/60`;
const borderGray200Dark = `border border-gray-200 dark:border-slate-600`;
const borderGray300Dark = `border border-gray-300 dark:border-slate-600`;
const borderSlate200Dark = `border border-slate-200 dark:border-slate-600`;
const borderSlate100Dark = `border border-slate-100 dark:border-slate-600`;
const borderSlate300Color = `border-slate-300 dark:border-slate-600`;
const borderRed200Dark = `border border-red-200 dark:border-red-800`;
const borderAmber300Dark = `border border-amber-300 dark:border-amber-700`;
const textPrimaryColor = `text-gray-900 dark:text-white`;
const textSecondaryColor = `text-gray-600 dark:text-gray-300`;
const textMutedGrayColor = `text-gray-500 dark:text-gray-400`;
const textMutedSlateColor = `text-slate-500 dark:text-slate-400`;
const textMutedSlateStrongColor = `text-slate-700 dark:text-slate-300`;
const textMutedSlateAltColor = `text-gray-400 dark:text-slate-500`;
const textMutedGrayStrongColor = `text-gray-700 dark:text-gray-300`;
const textMutedMixedColor = `text-gray-600 dark:text-slate-400`;
const textMutedGrayAltColor = `text-gray-700 dark:text-slate-300`;
const textMutedSlateGrayColor = `text-gray-400 dark:text-slate-400`;
const textSlate900Color = `text-slate-900 dark:text-white`;
const textSlate800Color = `text-slate-800 dark:text-slate-200`;
const textSlate600Color = `text-slate-600 dark:text-slate-300`;
const textSlate400Color = `text-slate-400 dark:text-slate-500`;
const buttonPrimaryColors = `bg-blue-600 text-white hover:bg-blue-700 dark:hover:bg-blue-500`;
const buttonPrimaryShadow = `shadow`;
const buttonPrimaryRoundedShape = `rounded-full`;
const buttonPrimaryRoundedLgShape = `rounded-lg`;

export const formInputBase = joinClasses(
  `rounded-md`,
  `border`,
  inputPaddingMd,
  textSizeSm,
  inputBaseColors,
  inputBorderColors,
  inputFocusRing,
);

export const formInputFullWidth = `w-full ${formInputBase}`;
export const formFieldSpacing = `mt-1 ${formInputFullWidth}`;

const formInputRoundedLgBase = joinClasses(
  `w-full`,
  `rounded-lg`,
  `border`,
  inputBorderColors,
  inputPaddingMd,
  textSizeSm,
  inputBaseColors,
  inputFocusRing,
);

export const formInputRoundedLg = formInputRoundedLgBase;

export const formInputRoundedLgWithPrefix = joinClasses(
  `w-full`,
  `rounded-lg`,
  `border`,
  inputBorderColors,
  inputPaddingWithPrefix,
  textSizeSm,
  inputBaseColors,
  inputFocusRing,
);

export const formInputSmall = joinClasses(
  inputPaddingSm,
  `border`,
  `rounded-md`,
  textSizeXs,
  inputBaseColors,
  inputBorderColors,
);

const inputPlaceholderMuted = `placeholder:text-gray-400 dark:placeholder:text-gray-500`;

export const searchInputClass = joinClasses(
  inputPaddingMd,
  `rounded-md`,
  `border`,
  textSizeSm,
  inputBaseColors,
  inputBorderColors,
  inputPlaceholderMuted,
);

export const modalFieldVariant = joinClasses(
  `w-full`,
  `border`,
  inputBorderColors,
  `rounded-lg`,
  `p-2`,
  textSizeSm,
  inputBaseColors,
  inputFocusRing,
);

export const primaryButtonClass = joinClasses(
  `w-full`,
  buttonPrimaryRoundedLgShape,
  buttonPrimaryColors,
  `py-2`,
  textSizeSm,
  `font-medium`,
  `transition`,
  `disabled:cursor-not-allowed`,
  `disabled:opacity-60`,
);

export const errorTextClass = joinClasses(textSizeSm, `text-red-600 dark:text-red-400`);

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

export const methodToggleButtonBase = joinClasses(
  inputPaddingMd,
  `rounded-lg`,
  `border`,
  textSizeSm,
  `font-medium`,
  `text-center`,
);
export const methodToggleButtonActive = `border-blue-600 bg-blue-600 text-white`;
export const methodToggleButtonInactive = joinClasses(
  borderGray300Dark,
  `bg-gray-100 dark:bg-slate-700`,
  textPrimaryColor,
);

export const modalOverlayClass = joinClasses(`fixed inset-0`, bgBlackOverlay, `flex items-center justify-center z-50`);
const modalContentBase = joinClasses(bgWhiteDark, `rounded-2xl p-6 w-full shadow-xl animate-fadeIn`);
export const modalContentLg = joinClasses(modalContentBase, `max-w-lg`);
export const modalContentMd = joinClasses(modalContentBase, `max-w-md`);
export const modalTitleClass = joinClasses(`text-xl font-semibold`, textPrimaryColor);
export const modalHeaderRow = `flex justify-between items-center`;
export const modalCloseButton = joinClasses(
  `text-2xl leading-none px-2`,
  textMutedGrayColor,
  `hover:text-gray-700 dark:hover:text-gray-200`,
);
export const modalMetaLabel = joinClasses(textSizeSm, textSecondaryColor);
export const modalMetaValue = joinClasses(`font-medium`, textPrimaryColor);
export const modalParagraphClass = joinClasses(textMutedGrayStrongColor, textSizeSm);
export const modalInfoCard = joinClasses(borderGray200Dark, `rounded-lg`, bgGray50Dark);
export const modalInfoTitle = joinClasses(`font-medium`, textPrimaryColor);
export const modalInfoSubtext = joinClasses(textSizeSm, textMutedGrayColor);
export const modalDefaultBadge = joinClasses(textSizeXs, `text-green-600 dark:text-green-400 font-medium mt-1`);
export const modalDangerNoticeClass = joinClasses(textSizeSm, `text-red-600 dark:text-red-400 mb-4`);
export const modalButtonSecondary = joinClasses(
  `px-4 py-2 rounded-lg`,
  `hover:bg-gray-100 dark:hover:bg-slate-700`,
  textSizeSm,
  `text-gray-700 dark:text-gray-200`,
  `disabled:opacity-50`,
);
export const modalButtonDanger = joinClasses(
  `px-4 py-2`,
  `bg-red-600 text-white`,
  `rounded-lg`,
  `hover:bg-red-700 dark:hover:bg-red-500`,
  textSizeSm,
);
export const modalButtonPrimary = joinClasses(
  `px-4 py-2`,
  buttonPrimaryRoundedLgShape,
  buttonPrimaryColors,
  textSizeSm,
  `disabled:opacity-50`,
);
export const modalFooterActions = `flex justify-end gap-2 pt-4`;
export const modalFooterActionsLg = `flex justify-end gap-3 mt-6`;
export const successModalOverlay = joinClasses(
  `fixed inset-0 z-40 flex items-center justify-center`,
  `bg-black/30 dark:bg-black/60`,
  `backdrop-blur-sm`,
);
export const successModalContent = joinClasses(`w-[90%] max-w-sm`, bgWhiteDark, `rounded-xl p-6 shadow-xl`);
export const successModalTitle = joinClasses(`mb-2 text-lg font-semibold`, textPrimaryColor);
export const successModalDescription = joinClasses(`mb-4`, textSizeSm, textSecondaryColor);

export const textPrimary = textPrimaryColor;
export const textSecondary = textSecondaryColor;
export const textMuted = textMutedSlateColor;
export const textMutedGray = textMutedGrayColor;
export const textMutedSlate = textMutedSlateGrayColor;
export const textMutedGrayStrong = textMutedGrayStrongColor;
export const textMutedMixed = textMutedMixedColor;
export const textMutedGrayAlt = textMutedGrayAltColor;
export const textMutedSlateAlt = textMutedSlateAltColor;
const linkPrimaryBase = `text-blue-600 dark:text-blue-400 hover:underline`;
export const linkPrimary = linkPrimaryBase;
export const linkPrimaryMedium = joinClasses(linkPrimaryBase, `font-medium`);
export const linkDanger = `text-red-500 dark:text-red-400 hover:underline`;
export const linkPrimaryUnderlineSm = joinClasses(`text-blue-600 dark:text-blue-400`, textSizeSm, `underline`);

const cardBaseShared = joinClasses(`rounded-2xl`, bgWhiteDark, `shadow-sm`, `border`, `dark:border-slate-600`);
export const cardBase = cardBaseShared;
export const cardBasePadded = joinClasses(cardBaseShared, `p-6`);
export const cardBaseSoft = joinClasses(`rounded-2xl`, bgWhiteSoftDark, `px-6 py-4 shadow-sm`);
export const cardBaseSoftCompact = joinClasses(`rounded-2xl`, bgWhiteSoftDark, `p-4 shadow-sm`);

export const tableContainer = joinClasses(bgWhiteDark, `rounded-2xl shadow-sm`, `border`, `dark:border-slate-600`);
export const tableHeaderRow = joinClasses(
  `text-left`,
  textMutedSlateColor,
  `border-b border-slate-200 dark:border-slate-600`,
);
export const tableHeaderRowMuted = joinClasses(
  `text-left`,
  textMutedSlateAltColor,
  `border-b border-gray-200 dark:border-slate-600`,
);
export const tableHeaderRowMutedAlt = joinClasses(
  `text-left`,
  textMutedSlateGrayColor,
  `border-b border-gray-200 dark:border-slate-600`,
);
export const tableBodyRow = joinClasses(
  `border-b border-slate-200 dark:border-slate-600`,
  `hover:bg-slate-50 dark:hover:bg-slate-700/50`,
  `transition`,
);
export const tableBodyRowMuted = joinClasses(
  `border-b border-gray-200 dark:border-slate-600`,
  `last:border-none`,
  `hover:bg-gray-50 dark:hover:bg-slate-700/30`,
);
export const tableBodyRowMutedStrong = joinClasses(
  `border-b border-gray-200 dark:border-slate-600`,
  `last:border-none`,
  `hover:bg-gray-50 dark:hover:bg-slate-700/50`,
);
export const tableCellHeaderMd = `px-4 py-3`;
export const tableCellHeaderLg = `px-6 py-3`;
export const tableCellHeaderSimple = `py-3`;
export const tableCellBodyMd = `px-4 py-4`;
export const tableCellBodyLg = `px-6 py-4`;
export const tableCellBodySimple = `py-3`;
export const tableEmptyCell = joinClasses(`px-6 py-6 text-center`, textMutedSlateColor);

export const badgeBase = joinClasses(`px-3 py-1`, `rounded-full`, textSizeXs, `font-medium`);
export const badgePending = `bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300`;
export const badgeCompleted = `bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300`;
export const badgeWaiting = `bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300`;
export const badgeDefault = `bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300`;
export const badgeDefaultInline = joinClasses(
  `inline-flex items-center gap-1 px-2 py-0.5`,
  textSizeXs,
  `bg-green-100 dark:bg-green-900/20`,
  `text-green-700 dark:text-green-300`,
  `rounded-full`,
  `font-medium`,
);

export const buttonPrimaryRounded = joinClasses(
  buttonPrimaryRoundedShape,
  buttonPrimaryColors,
  `px-6 py-3`,
  textSizeSm,
  buttonPrimaryShadow,
);
export const buttonPrimaryRoundedCompact = joinClasses(
  buttonPrimaryRoundedShape,
  buttonPrimaryColors,
  `px-6 py-2`,
  textSizeSm,
  `font-semibold`,
  buttonPrimaryShadow,
);
export const buttonPrimarySm = joinClasses(`rounded-md`, buttonPrimaryColors, `px-4 py-2`, textSizeSm);
export const buttonSecondary = joinClasses(
  `px-3 py-1`,
  `rounded-md`,
  bgWhiteDark,
  `border`,
  `dark:border-slate-600`,
  `shadow-sm`,
  `text-gray-700 dark:text-gray-200`,
  `disabled:opacity-50`,
);
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
export const emptyStateText = joinClasses(`text-center py-8`, textMutedSlateGrayColor);
export const emptyStateCentered = `text-center py-10`;
export const emptyStateTitle = joinClasses(textMutedSlateAltColor, `mb-4`);
export const emptyStateBody = joinClasses(textSizeSm, textMutedGrayColor, `max-w-md mx-auto`);

export const paymentMethodRow = joinClasses(
  `flex items-center justify-between p-4`,
  bgWhiteDark,
  `rounded-xl`,
  `border`,
  `dark:border-slate-600`,
  `shadow-sm`,
  `hover:shadow transition`,
);
export const paymentMethodRowIcon = joinClasses(
  `w-12 h-12 rounded-xl`,
  `bg-gray-100 dark:bg-slate-700`,
  `flex items-center justify-center`,
  textMutedGrayStrongColor,
);
export const paymentMethodRowTitle = joinClasses(`font-semibold`, textPrimaryColor);
export const paymentMethodRowMeta = joinClasses(textSizeSm, textMutedGrayColor);

export const textSm = `text-sm`;
export const fontMedium = `font-medium`;
export const textXs = `text-xs`;
export const textXsMuted = joinClasses(textSizeXs, textMutedSlateColor);
export const textMutedStrong = textMutedSlateStrongColor;
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

export const uploadButtonPrimary = joinClasses(
  buttonPrimaryRoundedShape,
  buttonPrimaryColors,
  `px-4 py-2`,
  textSizeSm,
  `font-semibold`,
  buttonPrimaryShadow,
  `cursor-pointer`,
);
export const hiddenInput = `hidden`;
export const bulkActionsRow = `flex items-center gap-2`;
export const dangerButtonSm = joinClasses(
  `px-3 py-2`,
  `rounded-md`,
  borderRed200Dark,
  `bg-red-50 dark:bg-red-900/20`,
  textSizeXs,
  `font-medium`,
  `text-red-700 dark:text-red-300`,
);
export const attachButton = joinClasses(
  `px-3 py-2`,
  `rounded-md`,
  `border`,
  bgSlate50Dark,
  textSizeXs,
  `font-medium`,
  `text-slate-800 dark:text-slate-200`,
  `hover:bg-slate-100 dark:hover:bg-slate-600`,
);
export const linkPrimaryXs = joinClasses(`text-blue-600 dark:text-blue-400`, textSizeXs, `font-medium hover:underline`);

export const refreshButtonClass = joinClasses(
  `px-4 py-2`,
  buttonPrimaryRoundedLgShape,
  buttonPrimaryColors,
  `transition-colors`,
);

export const paymentViewLoading = joinClasses(`p-8`, textSlate600Color);
export const paymentViewNotFound = `p-8`;
export const paymentViewContainer = `px-8 py-6 flex flex-col gap-6`;
export const paymentViewTitle = joinClasses(`text-2xl font-semibold`, textSlate900Color);
export const paymentViewGrid = `grid grid-cols-3 gap-6`;
export const paymentViewLeftCol = `col-span-2 flex flex-col gap-6`;
export const paymentViewRightCol = `col-span-1 flex flex-col gap-6`;
export const cardHeaderRow = `flex justify-between mb-4`;
export const amountTitle = joinClasses(`text-xl font-semibold`, textPrimaryColor);
export const descriptionText = joinClasses(textSizeSm, textSlate600Color);
export const timestampText = joinClasses(`mt-4`, textSizeXs, textMutedSlateColor);
export const sectionTitle = joinClasses(`font-semibold mb-3`, textPrimaryColor);
export const timelineItem = joinClasses(`border-l`, borderSlate300Color, `pl-4 ml-2 mb-4 relative`);
export const timelineDot = `absolute w-3 h-3 bg-blue-600 dark:bg-blue-500 rounded-full -left-1 top-1`;
export const timelineTitle = joinClasses(textSizeSm, `font-semibold`, textPrimaryColor);
export const timelineMeta = joinClasses(textSizeXs, textSlate600Color);
export const attachmentRow = joinClasses(
  `flex justify-between items-center`,
  `border-b border-slate-200 dark:border-slate-600`,
  `py-2`,
);
export const attachmentName = joinClasses(textSizeSm, textPrimaryColor);
export const attachmentSize = joinClasses(textSizeXs, textMutedSlateColor);
export const attachmentLink = joinClasses(`text-blue-600 dark:text-blue-400`, textSizeSm, `font-medium`);
export const selectableCardBase = joinClasses(`p-3`, `border`, `rounded-lg`, `cursor-pointer`, `transition-colors`);
export const selectableCardActive = `border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400`;
export const selectableCardInactive = `border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500`;
export const methodRowHeader = `flex items-center justify-between`;
export const methodRowLeft = `flex items-center gap-3`;
export const badgeBaseStrong = joinClasses(`px-3 py-1`, `rounded-full`, textSizeXs, `font-semibold`);
export const badgeNeutral = joinClasses(`bg-gray-100 dark:bg-slate-700`, textSecondaryColor);
export const badgeDefaultSm = joinClasses(
  `ml-2 px-2 py-1`,
  textSizeXs,
  `bg-green-100 dark:bg-green-900/20`,
  `text-green-800 dark:text-green-300`,
  `rounded`,
);

export const bankTransferContainer = `max-w-3xl mx-auto pb-16`;
export const bankTransferStepper = `flex items-center gap-4 mb-10`;
export const bankTransferAlert = joinClasses(
  `bg-amber-50 dark:bg-amber-900/20`,
  borderAmber300Dark,
  `text-amber-800 dark:text-amber-300`,
  `p-4`,
  `rounded-xl`,
  `mb-8`,
);
export const bankTransferAlertTitle = `font-semibold mb-1`;
export const bankTransferAlertText = `text-sm`;
export const bankTransferAmountRow = `flex justify-between items-end mb-6`;
export const bankTransferAmountLabel = joinClasses(`text-lg font-semibold mb-1`, textSlate900Color);
export const bankTransferAmountValue = joinClasses(`text-2xl font-bold`, textPrimaryColor);
export const bankTransferDownloadButton = joinClasses(
  `flex items-center gap-2 px-4 py-2`,
  buttonPrimaryColors,
  `rounded-lg`,
  `shadow-sm`,
);
export const bankTransferCard = joinClasses(borderSlate200Dark, bgWhiteDark, `rounded-2xl shadow-sm p-6`);
export const bankTransferCardTitle = joinClasses(`text-xl font-semibold mb-5`, textSlate800Color);
export const bankTransferSwiftNote = joinClasses(
  `mt-6`,
  `bg-slate-100 dark:bg-slate-800`,
  borderSlate200Dark,
  `rounded-xl`,
  `p-4`,
  textSizeSm,
  textMutedSlateStrongColor,
);
export const bankTransferContinueButton = joinClasses(
  `w-full mt-10 py-4`,
  `bg-green-600 hover:bg-green-700 dark:hover:bg-green-500`,
  `text-white`,
  `font-semibold text-lg`,
  `rounded-xl`,
  `shadow`,
);
export const stepContainer = `flex items-center gap-2`;
export const stepIconBase = `w-5 h-5 rounded-full flex items-center justify-center`;
export const stepIconActive = `bg-green-600 text-white`;
export const stepIconInactive = `bg-slate-200 dark:bg-slate-600`;
export const stepLabelActive = joinClasses(textSlate900Color, `font-medium`);
export const stepLabelInactive = textSlate400Color;
export const fieldWrapper = `mb-5`;
export const fieldLabel = joinClasses(textSizeSm, `font-medium mb-1`, textMutedSlateColor);
export const fieldRow = joinClasses(
  `flex items-center`,
  `border`,
  borderSlate300Color,
  `rounded-lg`,
  bgSlate50Dark,
  `px-3 py-2`,
);
export const fieldValue = joinClasses(textSlate900Color, `font-medium truncate`);
export const fieldCopyButton = joinClasses(
  `ml-auto`,
  textMutedSlateColor,
  `hover:text-slate-700 dark:hover:text-slate-200`,
);
export const fieldCopyIconActive = `text-green-600 dark:text-green-400`;
export const fieldHelper = joinClasses(textSizeXs, textMutedSlateColor, `mt-1`);

export const docPreviewOverlay = joinClasses(
  `fixed inset-0 z-50`,
  bgBlackOverlay,
  `flex items-center justify-center p-2 md:p-6`,
);
export const docPreviewModal = joinClasses(
  `relative`,
  `bg-white dark:bg-slate-900`,
  `rounded-xl`,
  `shadow-xl`,
  `overflow-hidden`,
  `transition-all`,
);
export const docPreviewFullscreen = `w-screen h-screen rounded-none`;
export const docPreviewTopbar = joinClasses(
  `flex items-center justify-between px-4 py-2`,
  `border-b border-gray-200 dark:border-slate-700`,
  bgGray50Dark,
);
export const docPreviewTitle = joinClasses(`font-semibold`, textPrimaryColor);
export const docPreviewMeta = joinClasses(textSizeXs, textMutedGrayColor);
export const docPreviewActions = `flex items-center gap-3`;
export const docPreviewActionButton = joinClasses(
  `px-2 py-1 rounded-md`,
  borderGray200Dark,
  textSizeSm,
  `text-gray-700 dark:text-gray-200`,
  `hover:bg-gray-100 dark:hover:bg-slate-700`,
);
export const docPreviewActionButtonSquare = joinClasses(
  `px-2 py-1`,
  borderGray200Dark,
  `rounded`,
  `text-gray-700 dark:text-gray-200`,
  `hover:bg-gray-100 dark:hover:bg-slate-700`,
);
export const docPreviewZoomLabel = `text-sm w-10 text-center`;
export const docPreviewCloseButton = joinClasses(`text-xl px-2`, `text-gray-700 dark:text-gray-200`);
export const docPreviewContent = joinClasses(
  `flex h-[calc(100%-50px)] overflow-hidden`,
  `bg-gray-100 dark:bg-slate-900`,
);
export const docPreviewSidebar = joinClasses(
  `hidden md:block w-32`,
  `border-r border-gray-200 dark:border-slate-700`,
  `overflow-auto`,
  `bg-gray-200 dark:bg-slate-800`,
  `p-2`,
);
export const docPreviewSidebarLabel = joinClasses(textSizeXs, `text-center`, textMutedGrayColor);
export const docPreviewDocument = `flex-1 overflow-auto flex justify-center items-start p-4`;
export const docPreviewIframe = `w-full h-full`;
export const docPreviewImage = `object-contain`;
export const docPreviewDragHandle = `absolute bottom-0 right-0 w-6 h-6 cursor-se-resize opacity-50 hover:opacity-100`;
export const docPreviewDragHandleIcon = `w-full h-full bg-gray-400/40 dark:bg-slate-700/50 rounded-tr-md`;

export const loginContainer = `mx-auto max-w-md p-8`;
export const loginTitle = joinClasses(`mb-4 text-2xl font-semibold`, textPrimaryColor);
export const loginForm = `space-y-3`;
export const loginErrorText = joinClasses(`mt-1 whitespace-pre-wrap`, textSizeSm, `text-rose-600 dark:text-rose-400`);
export const loginButton = joinClasses(`rounded-md`, buttonPrimaryColors, `px-4 py-2`, textSizeSm);
export const loginFooter = joinClasses(`mt-6 text-center`, textSizeSm, textSecondaryColor);

export const withdrawTransferContainer = `mx-auto max-w-2xl px-4 py-8`;
export const withdrawTransferTitle = joinClasses(`mb-2 text-2xl font-semibold`, textPrimaryColor);
export const withdrawTransferBalance = joinClasses(`mb-2`, textSizeSm, textMutedGrayStrongColor);
export const withdrawTransferBalanceAmount = `font-semibold`;

export const contactsPageContainer = `flex flex-col gap-6 px-8 py-6`;
export const contactsPageHeader = `flex items-center justify-between`;
export const contactsPageTitle = joinClasses(`text-2xl font-semibold`, textPrimaryColor);
export const contactsPageSubtitle = joinClasses(textSizeSm, textMutedGrayColor);
export const contactsAddButton = joinClasses(
  `px-4 py-2`,
  buttonPrimaryRoundedLgShape,
  buttonPrimaryColors,
  `shadow-sm`,
  `transition`,
);

export const contactDetailsContainer = `p-8 space-y-8`;
export const contactDetailsTitle = joinClasses(`text-2xl font-semibold`, textPrimaryColor);
export const contactDetailsSubtitle = textSecondaryColor;
export const contactDetailsCard = joinClasses(
  `rounded-xl`,
  bgWhiteDark,
  `p-4`,
  `shadow`,
  `dark:border dark:border-slate-600`,
);
export const contactDetailsCardTitle = joinClasses(`font-semibold mb-2`, textPrimaryColor);
export const contactDetailsCardTitleLg = joinClasses(`font-semibold mb-4`, textPrimaryColor);
export const contactDetailsPre = joinClasses(textSizeSm, textMutedGrayStrongColor);
export const contactDetailsPaymentList = `space-y-2`;
export const contactDetailsPaymentLink = joinClasses(
  `block`,
  borderGray200Dark,
  `px-4 py-2`,
  `rounded`,
  `hover:bg-gray-50 dark:hover:bg-slate-700/50`,
  textPrimaryColor,
);
export const contactDetailsPaymentMeta = joinClasses(textSizeXs, `text-gray-500 dark:text-slate-400`);
export const contactDetailsEmptyText = textMutedSlateAltColor;
export const contactDetailsDocsGrid = `grid grid-cols-2 gap-4`;
export const contactDetailsDocCard = joinClasses(borderGray200Dark, `rounded p-3`, bgGray50Dark);
export const contactModalInput = joinClasses(
  `w-full`,
  borderGray300Dark,
  `rounded-lg`,
  `p-2`,
  bgWhiteDark,
  textPrimaryColor,
);

export const contactViewContainer = `p-8 space-y-4`;
export const contactViewTitle = `text-xl font-semibold`;
export const contactViewDetails = `space-y-2`;
export const contactViewButton = joinClasses(`px-4 py-2`, `rounded-md`, buttonPrimaryColors);

export const formCardBase = joinClasses(`space-y-4 rounded-xl`, borderGray200Dark, bgWhiteDark, `p-6`, `shadow-sm`);
export const formCardTitle = joinClasses(`text-lg font-semibold`, textPrimaryColor);
export const formCardDescription = joinClasses(textSizeSm, textSlate600Color);
export const formFieldLabel = joinClasses(`mb-1 block`, textSizeSm, `font-medium`, textMutedGrayStrongColor);
export const formFieldDescription = joinClasses(textSizeXs, `text-gray-500 dark:text-slate-400`, `mb-2`);

export const errorBoundaryContainer = `flex flex-col items-center justify-center min-h-[400px] p-8 text-center`;
export const errorBoundaryTitle = joinClasses(`text-xl font-semibold mb-2`, textPrimaryColor);
export const errorBoundaryText = joinClasses(textSecondaryColor, `mb-6 max-w-md`);
export const errorBoundaryButtons = `space-x-4`;
export const errorBoundaryRetryButton = joinClasses(
  `px-4 py-2`,
  `bg-gray-600 dark:bg-slate-600`,
  `text-white`,
  `rounded-lg`,
  `hover:bg-gray-700 dark:hover:bg-slate-500`,
  `transition-colors`,
);
export const errorDetails = `mt-6 text-left`;
export const errorDetailsSummary = joinClasses(
  `cursor-pointer`,
  textSizeSm,
  textMutedGrayColor,
  `hover:text-gray-700 dark:hover:text-gray-200`,
);
export const errorDetailsPre = joinClasses(
  `mt-2 p-4`,
  `bg-gray-100 dark:bg-slate-800`,
  `rounded`,
  textSizeXs,
  `overflow-auto max-w-full`,
  `text-gray-900 dark:text-gray-100`,
);
export const sectionErrorFallback = joinClasses(
  `flex items-center justify-center p-8`,
  `bg-red-50 dark:bg-red-900/10`,
  borderRed200Dark,
  `rounded-lg`,
);
export const sectionErrorIcon = `w-6 h-6 text-red-600 dark:text-red-400 mx-auto mb-2`;
export const sectionErrorText = joinClasses(textSizeSm, `text-red-700 dark:text-red-300`);

export const quickDocsHeader = `mb-3 flex items-center justify-between`;
export const quickDocsTitle = joinClasses(textSizeSm, `font-semibold`, textSlate900Color);
export const quickDocsLink = joinClasses(`text-xs font-medium`, `text-blue-600 dark:text-blue-400`, `hover:underline`);
export const quickDocsEmpty = joinClasses(textSizeSm, textSlate400Color);
export const quickDocsList = joinClasses(`space-y-2`, textSizeSm);
export const quickDocsItem = joinClasses(`flex items-center justify-between rounded-lg`, bgSlate50Dark, `px-3 py-2`);
export const quickDocsName = joinClasses(`truncate`, textSlate800Color);
export const quickDocsDate = joinClasses(`whitespace-nowrap`, textSizeXs, textSlate400Color);

export const complianceHeader = `mb-3 flex items-center justify-between`;
export const complianceTitle = joinClasses(textSizeSm, `font-semibold`, textSlate900Color);
export const complianceSubtitle = joinClasses(textSizeXs, textMutedSlateColor);
export const complianceProgressText = joinClasses(textSizeXs, `font-medium text-blue-600 dark:text-blue-400`);
export const complianceBar = joinClasses(
  `mb-3 h-2 w-full overflow-hidden rounded-full`,
  `bg-slate-100 dark:bg-slate-700`,
);
export const complianceBarFill = `h-full rounded-full bg-blue-500 transition-[width]`;
export const complianceList = `space-y-2`;
export const complianceItem = `flex items-center gap-2 text-sm`;
export const complianceLabelDone = joinClasses(textSlate400Color, `line-through`);
export const complianceLabelOpen = textMutedSlateStrongColor;
export const complianceEmpty = joinClasses(textSizeSm, textSlate400Color);

export const summaryGrid = `grid gap-4 md:grid-cols-3`;
export const summaryCardLabel = joinClasses(textSizeXs, `font-medium uppercase tracking-wide`, textMutedSlateColor);
export const summaryValueLg = joinClasses(`mt-2 text-3xl font-semibold`, textSlate900Color);
export const summaryValueMd = joinClasses(`mt-2 text-2xl font-semibold`, textSlate900Color);
export const summaryValueSm = joinClasses(`mt-2 text-lg font-semibold`, textSlate900Color);
export const summaryValueMeta = joinClasses(textSizeSm, `font-normal`, textMutedSlateColor);

export const pendingRequestsSection = `w-full`;
export const pendingRequestsHeader = `mb-3 flex items-center justify-between`;
export const pendingRequestsTitle = joinClasses(textSizeSm, `font-semibold`, textSlate900Color);
export const pendingRequestsTableWrapper = joinClasses(`overflow-hidden rounded-xl`, borderSlate100Dark);
export const pendingRequestsTable = joinClasses(
  `min-w-full`,
  `divide-y divide-slate-100 dark:divide-slate-600`,
  bgWhiteDark,
  textSizeSm,
);
export const pendingRequestsHead = bgSlate50Dark;
export const pendingRequestsHeadCell = joinClasses(
  `px-4 py-2 text-left`,
  textSizeXs,
  `font-medium uppercase tracking-wide`,
  textMutedSlateColor,
);
export const pendingRequestsHeadCellRight = joinClasses(
  `px-4 py-2 text-right`,
  textSizeXs,
  `font-medium uppercase tracking-wide`,
  textMutedSlateColor,
);
export const pendingRequestsBody = `divide-y divide-slate-50 dark:divide-slate-600`;
export const pendingRequestsEmptyCell = joinClasses(`px-4 py-6 text-center`, textSizeSm, textSlate400Color);
export const pendingRequestsCell = joinClasses(`px-4 py-3`, textSizeSm, textSlate900Color);
export const pendingRequestsStatus = joinClasses(
  `px-4 py-3`,
  textSizeXs,
  `font-medium uppercase tracking-wide text-blue-600 dark:text-blue-400`,
);
export const pendingRequestsDate = joinClasses(`px-4 py-3 text-right`, textSizeXs, textMutedSlateColor);

export const dashboardContainer = `flex h-full flex-col gap-6 px-8 py-6`;
export const dashboardGrid = `grid gap-4 md:grid-cols-[2fr,1fr]`;
export const dashboardSidebar = `flex flex-col gap-4`;

export const pendingWithdrawalsCard = joinClasses(borderSlate200Dark, bgWhiteDark, `rounded-xl p-4 shadow-sm`);
export const pendingWithdrawalsHeader = `mb-2 flex items-center justify-between`;
export const pendingWithdrawalsTitle = joinClasses(textSizeSm, `font-semibold`, textPrimaryColor);
export const pendingWithdrawalsCount = joinClasses(textSizeXs, textMutedGrayColor);
export const pendingWithdrawalsHint = joinClasses(textSizeXs, textMutedGrayColor);
export const pendingWithdrawalsList = joinClasses(`space-y-2`, textSizeXs);
export const pendingWithdrawalsItem = joinClasses(
  `flex items-center justify-between rounded-lg`,
  bgGray50Dark,
  `px-3 py-2`,
);
export const pendingWithdrawalsAmount = joinClasses(`font-medium`, textPrimaryColor);
export const pendingWithdrawalsCode = joinClasses(`text-[11px]`, textMutedGrayColor);
export const pendingWithdrawalsBadge = `rounded-full bg-yellow-100 dark:bg-yellow-900/20 px-2 py-0.5 text-[11px] font-medium text-yellow-800 dark:text-yellow-300`;

export const activityHeader = `mb-3 flex items-center justify-between`;
export const activityTitle = joinClasses(textSizeSm, `font-semibold`, textSlate900Color);
export const activityList = `space-y-3`;
export const activityEmpty = joinClasses(textSizeSm, textSlate400Color);
export const activityRow = `flex items-start gap-3`;
export const activityDot = `mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500`;
export const activityRowBody = `flex-1`;
export const activityRowHeader = `flex items-center justify-between`;
export const activityLabel = joinClasses(textSizeSm, `font-medium`, textSlate900Color);
export const activityDate = joinClasses(textSizeXs, textSlate400Color);
export const activityDescription = joinClasses(textSizeXs, textMutedSlateColor);

export const dashboardHeader = `flex flex-col gap-1`;
export const dashboardHeaderTitle = joinClasses(`text-2xl font-semibold`, textSlate900Color);
export const dashboardHeaderSubtitle = joinClasses(textSizeSm, textMutedSlateColor);

export const actionRowGrid = `grid gap-4 md:grid-cols-[2fr,1fr]`;
export const actionRowCard = joinClasses(
  `flex items-center justify-between rounded-2xl`,
  bgWhiteSoftDark,
  `px-6 py-4`,
  `shadow-sm`,
);
export const actionRowTitle = joinClasses(textSizeSm, `font-medium`, textSlate900Color);
export const actionRowSubtitle = joinClasses(textSizeXs, textMutedSlateColor);
export const actionRowButton = joinClasses(
  buttonPrimaryRoundedShape,
  buttonPrimaryColors,
  `px-5 py-2`,
  textSizeSm,
  `font-semibold`,
  buttonPrimaryShadow,
);

export const signupNavContainer = `mt-6 space-y-4`;
export const signupNavRow = `flex items-center justify-between text-sm`;
export const signupBackLink = joinClasses(textMutedGrayColor, `hover:text-gray-700 dark:hover:text-gray-200`);
export const signupLoginText = joinClasses(`text-right`, textSecondaryColor);
export const signupLoginPrefix = `mr-1`;
export const signupLoginLink = joinClasses(`font-medium`, linkPrimaryBase);
export const signupNextButton = joinClasses(
  `w-full`,
  `rounded-md`,
  buttonPrimaryColors,
  `px-4 py-2`,
  textSizeSm,
  `font-semibold`,
);

export const signupStartPageContainer = joinClasses(
  `flex min-h-screen items-center justify-center`,
  `bg-gray-50 dark:bg-slate-900`,
  `px-4`,
);
export const signupStartCard = `w-full max-w-xl space-y-8 text-center`;
export const signupStartHeader = `space-y-1`;
export const signupStartSubtitle = joinClasses(textSizeSm, textMutedGrayColor);
export const signupStartTitle = `text-3xl font-semibold`;
export const signupStartOptions = `flex gap-5 justify-center`;
export const signupStartOptionBase = joinClasses(
  `flex h-40 w-40 flex-col items-center justify-center rounded-xl`,
  `border`,
  `transition-all`,
);
export const signupStartOptionActive = `border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20 shadow-sm`;
export const signupStartOptionInactive = joinClasses(
  borderGray300Dark,
  bgWhiteDark,
  `hover:bg-gray-100 dark:hover:bg-slate-700`,
);
export const signupStartOptionEmoji = `text-4xl mb-2`;
export const signupStartOptionLabelBase = `text-sm font-semibold`;
export const signupStartOptionLabelActive = `text-blue-700 dark:text-blue-300`;
export const signupStartOptionLabelInactive = `text-gray-700 dark:text-gray-300`;
export const signupStartInfo = joinClasses(`text-left`, textSizeSm, textSecondaryColor, `mx-auto max-w-sm space-y-1`);
export const signupStartInfoTitle = `font-medium`;
export const signupStartList = `list-disc list-inside space-y-1`;
export const signupStartNextButton = joinClasses(
  `w-full`,
  buttonPrimaryRoundedLgShape,
  buttonPrimaryColors,
  `px-5 py-3`,
  `text-white`,
  textSizeSm,
  `font-semibold`,
  `disabled:opacity-50 disabled:cursor-not-allowed`,
);
export const signupStartBackButton = joinClasses(
  `block w-full`,
  textSizeSm,
  textMutedGrayColor,
  `mt-2`,
  `hover:underline`,
);

export const signupCompletedContainer = joinClasses(
  `min-h-screen flex items-center justify-center`,
  `bg-gray-50 dark:bg-slate-900`,
  `px-4`,
);
export const signupCompletedCard = joinClasses(
  `w-full max-w-md rounded-xl`,
  `border border-gray-200 dark:border-slate-700`,
  bgWhiteDark,
  `p-8`,
  `shadow-sm`,
  `text-center`,
);
export const signupCompletedIconWrap = `flex justify-center mb-6`;
export const signupCompletedIcon = `h-14 w-14 text-green-500 dark:text-green-400`;
export const signupCompletedTitle = joinClasses(`text-2xl font-semibold mb-2`, textPrimaryColor);
export const signupCompletedSubtitle = joinClasses(`text-lg mb-6`, textSecondaryColor);
export const signupCompletedBrand = `font-semibold text-indigo-600 dark:text-indigo-400`;
export const signupCompletedText = joinClasses(textSecondaryColor, `mb-8 leading-relaxed`);
export const signupCompletedButton = joinClasses(
  `block w-full rounded-lg`,
  `bg-indigo-600`,
  `py-3`,
  `text-white`,
  `font-medium`,
  `hover:bg-indigo-700 dark:hover:bg-indigo-500`,
  `transition`,
);

export const verificationContainer = `flex flex-col items-center justify-center min-h-screen text-center p-6`;
export const verificationTitle = joinClasses(`text-2xl font-semibold mb-3`, textPrimaryColor);
export const verificationText = joinClasses(textSecondaryColor, `mb-6`);
export const verificationLink = linkPrimaryBase;
export const verificationSuccessTitle = `text-3xl font-bold text-green-600 dark:text-green-400 mb-3`;
export const verificationFailedTitle = `text-3xl font-bold text-red-600 dark:text-red-400 mb-3`;
export const verificationUnknownTitle = joinClasses(`text-3xl font-bold mb-3`, textMutedGrayStrongColor);
export const verificationMutedText = joinClasses(textMutedGrayColor, `mb-6`);
export const verificationEmail = `font-mono`;

export const signupFlowContainer = `flex flex-col items-center px-4 py-8`;

export const stepperContainer = `flex items-center justify-between w-full max-w-md mx-auto mt-5 mb-8 gap-3`;
export const stepperItem = `flex flex-col items-center flex-1 text-center`;
export const stepperCircleBase = `flex h-9 w-9 items-center justify-center rounded-full border text-sm transition`;
export const stepperCircleActive = `border-blue-600 bg-blue-600 text-white`;
export const stepperCircleComplete = `border-green-600 bg-green-600 text-white`;
export const stepperCircleInactive = joinClasses(borderGray300Dark, `text-gray-500 dark:text-slate-400`);
export const stepperLabelBase = `mt-2 text-[11px] leading-tight`;
export const stepperLabelActive = `font-semibold text-blue-600 dark:text-blue-400`;
export const stepperLabelInactive = textMutedGrayColor;

export const signupStepCard = joinClasses(`w-full max-w-md space-y-4 rounded`, bgWhiteDark, `p-6 shadow-sm`);
export const signupStepTitle = joinClasses(`mb-2 text-lg font-semibold`, textPrimaryColor);
export const signupStepTitleLg = joinClasses(`mb-1 text-xl font-semibold`, textPrimaryColor);
export const signupStepSubtitle = joinClasses(`mb-4`, textSizeSm, textSecondaryColor);
export const signupStepGrid = `grid grid-cols-2 gap-3`;
export const signupStepGroup = `space-y-1`;
export const signupStepLabel = joinClasses(`block`, textSizeXs, `font-medium`, textMutedGrayStrongColor);
export const signupStepGroupLg = `space-y-2`;
export const signupStepLabelInline = joinClasses(textSizeXs, `font-medium`, textMutedGrayStrongColor);
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
export const shellSearchInput = joinClasses(
  `w-full rounded-xl`,
  `border border-gray-200 dark:border-slate-600`,
  `bg-white dark:bg-slate-800`,
  `px-4 py-2.5`,
  textSizeSm,
  `shadow-sm`,
  `outline-none`,
  `focus:ring-2 focus:ring-blue-500`,
  `dark:text-white dark:placeholder:text-gray-400`,
);
export const shellSearchHint = joinClasses(
  `pointer-events-none absolute right-3 top-1/2 -translate-y-1/2`,
  `text-gray-400 dark:text-gray-500`,
);
export const shellLogout = joinClasses(
  `grid h-10 w-10 place-items-center rounded-full`,
  `bg-white dark:bg-slate-800`,
  `shadow-sm`,
  `ring-1 ring-black/5 dark:ring-white/10`,
  `dark:text-white`,
);

export const pageContainer = `px-8 py-6`;
export const pageTitle = joinClasses(`text-2xl font-semibold mb-2`, textSlate900Color);
export const pageSubtitle = joinClasses(textSizeSm, textMutedSlateColor, `mb-6`);
export const pageStackContainer = `flex flex-col gap-6 px-8 py-6`;
export const pageTitleGray = joinClasses(`text-2xl font-semibold`, textPrimaryColor);
export const pageSubtitleGray = joinClasses(textSizeSm, textMutedGrayColor);
export const pageTitlePlain = joinClasses(`text-2xl font-semibold`, textSlate900Color);
export const pageSubtitlePlain = joinClasses(textSizeSm, textMutedSlateColor);
export const startPaymentCard = joinClasses(
  `rounded-2xl`,
  bgWhiteDark,
  `p-6`,
  `shadow-sm`,
  `max-w-xl`,
  borderSlate200Dark,
);
export const pageHeaderRow = `flex justify-between items-center`;
export const primaryActionButton = joinClasses(
  `px-4 py-2`,
  buttonPrimaryRoundedLgShape,
  buttonPrimaryColors,
  `transition`,
);

export const settingsPageContainer = `mx-auto max-w-3xl px-4 py-8`;
export const settingsPageTitle = joinClasses(`text-2xl font-semibold mb-4`, textPrimaryColor);

export const formSection = `form-section`;
export const formSectionTitle = joinClasses(`text-lg font-semibold`, textPrimaryColor);
export const formGrid = `grid gap-4`;
export const inputLabel = `input-label`;
export const inputClass = `input`;
export const formGridClass = `form-grid`;
export const formGridSpan2 = `col-span-2`;

export const themeCard = joinClasses(`border p-6 rounded-xl`, bgWhiteDark, `shadow-sm`, `dark:border-slate-600`);
export const themeTitle = joinClasses(`text-lg font-semibold mb-4`, textPrimaryColor);
export const themeDescription = joinClasses(textSizeSm, textSecondaryColor, `mb-6`);
export const themeDeviceHint = joinClasses(textSizeXs, textMutedGrayColor, `mb-6`);
export const themeOptions = `space-y-3`;
export const themeOptionBase = joinClasses(
  `flex items-center p-4 rounded-lg`,
  `border`,
  `cursor-pointer`,
  `transition-colors`,
);
export const themeOptionActive = `border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400`;
export const themeOptionInactive = joinClasses(
  `border-gray-200`,
  `bg-gray-50`,
  `hover:bg-gray-100`,
  `dark:border-slate-600 dark:bg-slate-700 dark:hover:bg-slate-600`,
);
export const themeOptionDisabled = `opacity-50 pointer-events-none`;
export const themeOptionInput = `sr-only`;
export const themeOptionBody = `flex items-center flex-1`;
export const themeOptionIcon = `text-2xl mr-4`;
export const themeOptionLabel = joinClasses(`font-medium`, textPrimaryColor);
export const themeOptionText = joinClasses(textSizeSm, textSecondaryColor);
export const themeOptionCheck = `w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center`;
export const themeOptionCheckInner = `w-2 h-2 rounded-full bg-white dark:bg-slate-200`;
export const themeUpdating = joinClasses(`mt-4`, textSizeSm, textSecondaryColor);

export const authCallbackContainer = joinClasses(`flex h-screen items-center justify-center`, textSecondaryColor);

export const balancesLoading = joinClasses(textSizeSm, textMutedGrayColor, `mb-6`);
export const balancesRow = `flex gap-4 mb-6`;
export const balanceCard = joinClasses(
  `flex-1 rounded-xl`,
  borderSlate200Dark,
  bgWhiteDark,
  `p-4`,
  `text-center`,
  `shadow-sm`,
);
export const balanceLabel = joinClasses(textSizeXs, textMutedGrayColor);
export const balanceValue = joinClasses(`text-lg font-semibold`, textPrimaryColor);

export const rateCard = joinClasses(
  `mt-2 rounded-lg`,
  `bg-gray-50 dark:bg-slate-800`,
  `px-4 py-3`,
  textSizeSm,
  `flex flex-col gap-1`,
  `border border-gray-200 dark:border-slate-700`,
);
export const rateLoading = joinClasses(textMutedGrayColor, textSizeXs);
export const rateRow = `flex items-center gap-2`;
export const rateFrom = `font-semibold`;
export const rateEquals = textMutedGrayStrongColor;
export const rateValue = `font-semibold transition-all`;
export const rateValueChanged = `text-green-600 dark:text-green-400 scale-[1.05]`;
export const rateInverse = joinClasses(textSizeXs, textSecondaryColor);
export const rateChangedText = joinClasses(textSizeXs, `text-green-600 dark:text-green-400`);
export const rateEmpty = joinClasses(textMutedGrayColor, textSizeXs);

export const exchangeCard = joinClasses(`rounded-xl`, `border`, bgWhiteDark, `p-6`, `shadow`, `dark:border-slate-600`);
export const exchangeAvailable = joinClasses(`mb-2`, textSizeSm, textSecondaryColor);
export const exchangeForm = `space-y-4`;
export const exchangeLabel = joinClasses(textSizeSm, textMutedGrayStrongColor);
export const exchangeField = joinClasses(borderGray300Dark, `rounded p-2 w-full`, bgWhiteDark, textPrimaryColor);
export const exchangeRateText = joinClasses(textSizeSm, textMutedGrayColor);
export const exchangeResultText = joinClasses(textSizeSm, `font-semibold`, textPrimaryColor);
export const exchangeButton = joinClasses(`w-full p-2`, buttonPrimaryColors, `rounded`, `disabled:opacity-50`);

export const exchangePageContainer = `mx-auto max-w-2xl p-6`;
export const exchangePageTitle = `text-2xl font-bold mb-6`;

export const flexRowBetween = `flex items-center justify-between`;
export const gridGap4 = `grid gap-4`;
export const gridSummaryCards = `grid gap-4 md:grid-cols-2 lg:grid-cols-4`;
export const gridMainContent = `grid gap-4 md:grid-cols-[2fr,1fr]`;

export const skeletonBase = joinClasses(`animate-pulse rounded-md`, `bg-gray-200 dark:bg-slate-700`);
export const skeletonLine = `h-4 w-full`;
export const skeletonSpaceY2 = `space-y-2`;
export const skeletonSpaceY3 = `space-y-3`;
export const skeletonSpaceY4 = `space-y-4`;
export const skeletonCard = joinClasses(`rounded-2xl`, bgWhiteSoftDark, `p-6 shadow-sm`);
export const skeletonCardTitle = `h-6 w-1/3`;
export const skeletonTextFiveSixths = `h-4 w-5/6`;
export const skeletonTextFourSixths = `h-4 w-4/6`;
export const skeletonTableContainer = joinClasses(
  bgWhiteDark,
  `rounded-2xl shadow-sm`,
  `border`,
  `dark:border-slate-600`,
);
export const skeletonTablePadding = `p-6`;
export const skeletonHeaderCell = `h-4 w-20`;
export const skeletonRow = `grid gap-4 py-3 border-b last:border-b-0`;
export const skeletonCellShort = `w-24`;
export const skeletonCellTiny = `w-16`;
export const skeletonHeaderBlock = `grid gap-4 mb-4`;
export const skeletonHeaderTitle = `h-8 w-48`;
export const skeletonHeaderAction = `h-10 w-32`;
export const skeletonCardPadding = `p-4`;
