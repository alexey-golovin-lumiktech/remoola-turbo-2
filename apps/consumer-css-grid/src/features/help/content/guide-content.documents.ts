import { createOverviewArticle, createTroubleshootingArticle } from '../guide-content-templates';
import { type HelpGuideArticleContent } from '../guide-content-types';
import { HELP_GUIDE_SLUG, type HelpGuideSlug } from '../guide-slugs';

export const documentsHelpGuideContent = {
  [HELP_GUIDE_SLUG.DOCUMENTS_UPLOAD_AND_ATTACH]: {
    whatThisFeatureDoes: [
      `This guide explains how the document library works, how uploads behave, and how files move from the library into payment drafts.`,
      `It also covers the restrictions you see later, such as when a file can no longer be deleted from the Documents page because it is already part of a payment record.`,
    ],
    whenToUseIt: [
      `Use it when you need to upload one or more files into the document library.`,
      `Use it before a draft payment asks for supporting files.`,
      `Use it when you need to understand why a document can be attached, tagged, previewed, or blocked from deletion.`,
    ],
    beforeYouStartDescription: `Check the files you plan to use so you know they are ready before you open either the document library or the draft-payment attachments area.`,
    callouts: [
      {
        variant: `info`,
        title: `Draft payments can pull from the document library`,
        body: `You can upload files in Documents ahead of time, then attach them later from a draft payment. That is often easier than hunting for files at the last minute.`,
      },
    ],
    steps: [
      {
        title: `Open the full document library or the contract-file view`,
        body: `Open /documents for the full library. If you arrive there from a contract-linked flow, the page can also open in a relationship-files mode that focuses on files tied to that contractor relationship.`,
        outcome: `You know whether you are browsing the full library or a narrower contract context.`,
      },
      {
        title: `Upload the file you need`,
        body: `Choose one or more files from your device and upload them through the document-library uploader. In a draft payment, you can also upload directly into that draft from the attachments panel.`,
        outcome: `The file is stored in a place where later flows can see it.`,
      },
      {
        title: `Review the file entry before attaching it elsewhere`,
        body: `Check the document name, kind, size, created time, and any visible tags or preview information so you know you are using the correct file.`,
        outcome: `You reduce the chance of attaching the wrong file to a payment or contract flow.`,
      },
      {
        title: `Attach the document from a draft payment when needed`,
        body: `Open the draft payment detail page and use the attachments section to choose existing files from the library or upload new ones directly into that draft.`,
        outcome: `The payment draft now includes the supporting files it needs before you send it.`,
      },
      {
        title: `Check whether the file can still be deleted from Documents`,
        body: `If a document is attached to a draft payment, remove it from that draft first before deleting it from Documents. If it is attached to a non-draft payment record, the library will block deletion because that file is now part of the historical payment record.`,
        outcome: `You understand whether the document is still editable or already locked into a payment record.`,
      },
    ],
    whatHappensNext: [
      `After upload, the file can be reused from the library or attached from a draft payment if the workflow needs proof or supporting context.`,
      `If the file becomes part of a non-draft payment record, the document remains visible as part of that payment history.`,
    ],
    rulesAndLimits: [
      `The full library and the draft-payment attachments view are connected, but they do not behave identically.`,
      `Documents attached to a draft payment must be removed from that draft before they can be deleted from Documents.`,
      `Documents attached to non-draft payments remain part of those payment records and cannot be deleted from the document library.`,
    ],
    commonIssuesAndFixes: [
      {
        question: `I uploaded a file but do not see it where I want to attach it.`,
        answer: `Return to the document library first and confirm the upload completed successfully. Then reopen the draft payment and check the attachments section again.`,
      },
      {
        question: `The library will not let me delete the document.`,
        answer: `Check whether it is attached to a draft or non-draft payment. Draft attachments must be removed from the draft first, and non-draft attachments stay locked into the payment record.`,
      },
      {
        question: `I am in contract files mode and cannot upload there.`,
        answer: `That mode is intentionally focused on files already tied to the relationship. Use the full document library to upload first, then come back if you need that narrower contract view.`,
      },
    ],
  },
  [HELP_GUIDE_SLUG.DOCUMENTS_OVERVIEW]: createOverviewArticle({
    featureLabel: `the documents area`,
    routeSummary: `/documents or a payment detail route with attachments`,
    primaryTask: `uploading a file, attaching it to a payment, or reviewing what is already stored`,
    troubleshootingFocus: `upload failures, missing files, and attachment confusion`,
    nextStep: `to open the upload-and-attach guide or the documents troubleshooting guide`,
  }),
  [HELP_GUIDE_SLUG.DOCUMENTS_COMMON_ISSUES]: createTroubleshootingArticle({
    featureLabel: `documents`,
    issueSurface: `a file will not upload, attach, appear, or stay available where you expected`,
    firstCheck: `Confirm that you are on the correct route, that the file selection actually completed, and that the target payment or document list is the one you intended to update.`,
    recoveryAction: `Retry only after confirming the file, route, and target workflow are correct. If the issue is attachment-specific, compare the payment detail attachments area with the documents list before trying again.`,
    waitState: `Wait only when the route has already accepted the action and is now reflecting the file or attachment asynchronously rather than showing an immediate error.`,
    escalationPath: `Return to the documents overview or upload task guide so you can re-enter the workflow from the correct route with the correct target payment or document list.`,
  }),
} as const satisfies Partial<Record<HelpGuideSlug, HelpGuideArticleContent>>;
