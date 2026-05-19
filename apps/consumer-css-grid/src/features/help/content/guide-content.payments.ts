import { type HelpGuideArticleContent } from '../guide-content-types';
import { HELP_GUIDE_SLUG, type HelpGuideSlug } from '../guide-slugs';

export const paymentsHelpGuideContent = {
  [HELP_GUIDE_SLUG.PAYMENTS_OVERVIEW]: {
    whatThisFeatureDoes: [
      `The payments area brings together the routes for creating a request, starting a payer-side one-off payment, and reviewing an existing payment in detail.`,
      `It helps you choose the correct route first, then use the payment detail page as the source of truth for status, parties, attachments, and actions.`,
    ],
    whenToUseIt: [
      `Use it before opening /payments/new-request or /payments/start so you choose the right payment flow.`,
      `Use it when a payment already exists and you need to understand what the detail page is showing you.`,
      `Use it when you want to know how the list, detail, draft-send, and payer actions fit together.`,
    ],
    beforeYouStartDescription: `Open the payments area and decide whether you are creating a new request, starting a payment as the payer, or reviewing an existing payment.`,
    callouts: [
      {
        variant: `info`,
        title: `The detail page is the action hub`,
        body: `Once a payment exists, its detail page becomes the safest place to read status, timeline, parties, attachments, and next available actions.`,
      },
    ],
    steps: [
      {
        title: `Open the payments list`,
        body: `Start in the main payments area so you can tell whether the payment already exists or whether you are about to create something brand new.`,
        outcome: `You avoid creating a second flow when the correct payment already has its own detail page.`,
      },
      {
        title: `Choose the route that matches your role and goal`,
        body: `Use /payments/new-request when you are creating a request for someone else to pay. Use /payments/start when you are starting a payer-side one-off payment yourself. Use a payment detail page when the payment already exists and you need to act on its current state.`,
        outcome: `You enter the correct payment path instead of mixing requester and payer flows.`,
      },
      {
        title: `Read the overview, timeline, and attachments before acting`,
        body: `On a payment detail page, review the amount, status, role, due date, parties, timeline, and attachment area before you send, attach, pay, or wait.`,
        outcome: `You base the next action on the real payment state, not on memory.`,
      },
      {
        title: `Use the Actions panel only after checking the state`,
        body:
          `The Actions panel changes with payment role, status, and rail. A draft request may show ` +
          `\`Send request\`` +
          `, a payer-side card flow may show saved-card or checkout actions, and some payments may show no additional actions at all.`,
        outcome: `You understand why an action is available, missing, or replaced by a wait state.`,
      },
    ],
    whatHappensNext: [
      `After this overview, you usually continue into a specific payment guide: create request, start payment, or troubleshoot an existing payment.`,
      `If you are already on a detail page, the next step depends on what that page exposes in the Actions and Attachments panels.`,
    ],
    rulesAndLimits: [
      `Do not assume every payment route supports the same actions; the available controls depend on role, status, and sometimes payment rail.`,
      `Requester tasks and payer tasks are not the same flow, even when they end on the same detail page.`,
      `Card actions are not available on every payment, and draft-only actions such as sending or attaching files are limited to specific states.`,
    ],
    commonIssuesAndFixes: [
      {
        question: `I am not sure whether I need to create a request or start a payment.`,
        answer: `Create a request when you need another party to receive and review a payment request. Start a payment when you are initiating a payer-side one-off payment yourself from /payments/start.`,
      },
      {
        question: `I found the payment, but the next action is not obvious.`,
        answer: `Read the visible status, role, and Actions panel together. Those three signals usually explain whether you need to send a draft, pay, attach a file, generate an invoice, or wait.`,
      },
    ],
  },
  [HELP_GUIDE_SLUG.PAYMENTS_CREATE_REQUEST]: {
    whatThisFeatureDoes: [
      `This guide walks through the ` +
        `\`New Payment Request\`` +
        ` form that creates a requester-side payment draft for another party.`,
      `It covers the fields you actually enter, what happens immediately after submission, and why creating the draft is not the same thing as sending it to the payer.`,
    ],
    whenToUseIt: [
      `Use it when you need to create a new requester-side payment from /payments/new-request.`,
      `Use it when you want to prepare the request carefully before you send the draft onward.`,
      `Use it when you need to know which details belong in the form and which actions happen later on the detail page.`,
    ],
    beforeYouStartDescription: `Gather the recipient email, amount, currency, optional description, and any due date before you open the form.`,
    callouts: [
      {
        variant: `success`,
        title: `Create first, send second`,
        body:
          `Submitting the form creates the payment request and redirects you to its detail page. The request is only sent when you use the ` +
          `\`Send request\`` +
          ` action from the draft detail view.`,
      },
    ],
    steps: [
      {
        title: `Open the new payment request flow`,
        body: `Open /payments/new-request from the payments area. The page loads a dedicated form for requester-side payment creation and uses your settings to choose a default preferred currency when possible.`,
        outcome: `You are in the form built specifically for creating a new payment request.`,
      },
      {
        title: `Fill in the core payment fields`,
        body: `Enter the recipient email, amount, and currency. Add a description if you want the payment purpose to be clear on the detail page, and add a due date if the request needs a visible deadline. The email field also surfaces saved-contact hints while you type.`,
        outcome: `The draft contains the commercial details the payer will later review.`,
      },
      {
        title: `Submit the form to create the draft`,
        body: `Review the visible field values and submit the form. Validation will stop the request if the email is invalid, the amount is not greater than zero, the currency code is not valid, or the due date is in the past.`,
        outcome: `The app creates the payment request and redirects you into its payment detail page.`,
      },
      {
        title: `Review the draft on the payment detail page`,
        body: `Use the detail page to confirm amount, status, role, due date, parties, and description. This is also where the request remains in draft until you explicitly continue.`,
        outcome: `You can confirm that the created payment matches what you intended to send.`,
      },
      {
        title: `Add attachments while the request is still a draft if needed`,
        body: `If the request needs supporting files, use the draft payment's attachments area to upload new files directly into the draft or attach existing documents from the library before you send the request.`,
        outcome: `Your draft is complete before the other party sees it.`,
      },
      {
        title: `Send the request from the Actions panel`,
        body:
          `When the draft looks correct, use the ` +
          `\`Send request\`` +
          ` button in the Actions panel. That is the step that moves the request out of draft and into its next visible state.`,
        outcome: `The payment request is sent and ready for follow-up from the payer side.`,
      },
    ],
    whatHappensNext: [
      `Right after form submission, you are redirected to the created payment detail page rather than back to the list.`,
      `After you send the draft, that same detail page becomes the best place to monitor status, attachments, timeline changes, and payer-side progress.`,
    ],
    rulesAndLimits: [
      `The amount must be greater than zero, the recipient email must be valid, and a due date cannot be in the past.`,
      `Creating the request does not automatically send it; draft review and send are separate steps.`,
      `If attachments matter, it is usually easier to add them while the request is still a draft.`,
    ],
    commonIssuesAndFixes: [
      {
        question: `I started the form but do not have all the information yet.`,
        answer: `Pause and gather the missing details first, especially recipient email, amount, and currency. That keeps the draft cleaner and reduces later corrections.`,
      },
      {
        question: `The request was created, but the payer has not received anything yet.`,
        answer:
          `Open the payment detail page and check whether the request is still draft. If it is, use the ` +
          `\`Send request\`` +
          ` action from the Actions panel.`,
      },
      {
        question: `The due date will not save.`,
        answer: `Check that the date is valid and not earlier than today. Past dates are rejected by the form validation.`,
      },
    ],
    faq: [
      {
        question: `Can I save the request first and add attachments afterward?`,
        answer: `Yes. The app redirects you to the draft detail page after creation, and you can use the attachments section there before sending the request.`,
      },
    ],
  },
  [HELP_GUIDE_SLUG.PAYMENTS_START_PAYMENT]: {
    whatThisFeatureDoes: [
      `This guide explains the ` +
        `\`Start Payment\`` +
        ` flow for payer-side one-off payments created from /payments/start.`,
      `It is different from a payment request: you enter the recipient, amount, currency, and payment method up front, then continue in the normal payment detail flow after the payment is created.`,
    ],
    whenToUseIt: [
      `Use it when you want to initiate a payer-side one-off payment yourself.`,
      `Use it when you do not want to wait for another party to send you a request first.`,
      `Use it when you need to understand how the unknown-recipient confirmation step works before the payment is created.`,
    ],
    beforeYouStartDescription: `Have the recipient email, amount, currency, payment method, and any optional description ready before you start the form.`,
    callouts: [
      {
        variant: `warning`,
        title: `Starting a payment is not the same as creating a request`,
        body: `The start-payment flow is payer initiated. It creates the payment directly and then sends you into the payment detail experience instead of creating a requester-side draft that still needs to be sent.`,
      },
    ],
    steps: [
      {
        title: `Open the start payment route`,
        body: `Go to /payments/start. The page preloads your preferred currency from settings and opens the payer-side payment form.`,
        outcome: `You are in the one-off payment flow instead of the requester draft flow.`,
      },
      {
        title: `Enter the payment details`,
        body:
          `Fill in the recipient email, amount, currency, and payment method. You can choose between ` +
          `\`Credit Card\`` +
          ` and ` +
          `\`Bank Account\`` +
          `, and you can add an optional description if the payment needs a note.`,
        outcome: `The app has the core information needed to create the payment.`,
      },
      {
        title: `Submit the flow and handle the unknown-recipient step if it appears`,
        body: `After submission, the app checks whether the email already exists in your saved contacts. If it does not, you will see a confirmation modal where you can continue anyway, add a lightweight contact and continue, or open the full contacts page and save the draft for later.`,
        outcome: `You can decide whether to move fast, save the contact lightly, or complete a fuller contact setup first.`,
      },
      {
        title: `Continue into the payment detail page`,
        body: `Once the payment is created, the app redirects you into the normal payment detail flow. That page shows the amount, status, parties, timeline, attachments, and whichever actions are available next.`,
        outcome: `You move from creation into the route that now owns the payment lifecycle.`,
      },
      {
        title: `Use the detail page for payment follow-up`,
        body: `If the resulting payment waits on the payer, the detail page may expose saved-card or checkout actions. If it is on a bank-transfer rail or another state, the available actions can differ or disappear.`,
        outcome: `You continue based on the real state of the newly created payment.`,
      },
    ],
    whatHappensNext: [
      `After the payment is created, the detail page becomes the place to review status and continue the next action.`,
      `Depending on the selected method and current payment state, the next step may be to pay, wait, or review follow-up information from the detail page.`,
    ],
    rulesAndLimits: [
      `The form requires a valid recipient email, a positive amount, and a valid three-letter currency code.`,
      `Unknown recipients do not block the flow entirely, but the app will ask how you want to handle that email before proceeding.`,
      `Saved-card and checkout actions are part of the payment detail experience, not the start form itself.`,
    ],
    commonIssuesAndFixes: [
      {
        question: `The email is not in my contacts yet.`,
        answer: `Use the confirmation modal to choose the fastest path: continue immediately, add a lightweight contact and continue, or jump to the full contacts page and resume from the saved draft.`,
      },
      {
        question: `I started the payment, but now I do not know what to do next.`,
        answer: `Open the payment detail page and check its status, rail, and Actions panel. That page decides whether you can pay now, need to wait, or need a different follow-up.`,
      },
      {
        question: `I expected to pay by card immediately, but card actions are not available.`,
        answer: `Check the detail page first. Card actions only appear when that payment state and rail support them. Bank-transfer pending payments, for example, do not show card checkout actions.`,
      },
    ],
    faq: [
      {
        question: `Does start payment save the recipient automatically?`,
        answer: `Not always. The contact is only saved if you choose one of the modal options that adds it, or if the email already existed in your contacts.`,
      },
    ],
  },
  [HELP_GUIDE_SLUG.PAYMENTS_STATUSES]: {
    whatThisFeatureDoes: [
      `This guide explains how to interpret the main payment statuses you see on the payments list and on a payment detail page.`,
      `It focuses on the practical question users usually have: what does this state mean for me right now, and what next step should I expect from this payment?`,
    ],
    whenToUseIt: [
      `Use it when the payments list shows a status but the next action is not obvious.`,
      `Use it when a payment detail page is open and you want to understand whether you should send, pay, wait, retry, or stop.`,
      `Use it when the same payment looks different after checkout, a draft-send action, or another workflow transition.`,
    ],
    beforeYouStartDescription: `Open the payments list or the payment detail page you are reviewing so you can compare the visible status, role, and actions with the guide.`,
    callouts: [
      {
        variant: `warning`,
        title: `Status is only half of the answer`,
        body: `Always read payment role and the visible Actions panel together with status. The same state can lead to a different next step depending on whether you are the requester or payer.`,
      },
    ],
    steps: [
      {
        title: `Start by checking whether you are reading the list or the detail page`,
        body: `The list is useful for spotting which payments need attention, but the detail page is the safer place to confirm what a status actually means for this exact payment.`,
        outcome: `You know where to verify the current state before acting.`,
      },
      {
        title: `Treat draft and pending-style states differently`,
        body: `A draft usually means the payment still needs requester-side review and a send step. Pending or waiting-style states usually mean the payment already exists in an active lifecycle and the next step may belong to the payer, an external rail, or a wait state.`,
        outcome: `You separate edit-and-send work from follow-up-and-wait work.`,
      },
      {
        title: `Use completed, denied, and uncollectible states as outcome signals`,
        body: `Completed usually means the lifecycle has reached its successful end. Denied or uncollectible states mean the payment is no longer moving forward in the normal happy path and should be reviewed as an exception instead of retried blindly.`,
        outcome: `You can tell which statuses represent closure and which represent a blocked result.`,
      },
      {
        title: `Read the Actions panel after you understand the status`,
        body: `If the status and role still allow work, the Actions panel will usually confirm it through buttons such as send request, pay with a saved card, open checkout, or generate invoice output. If no action is shown, the correct next move may be to wait or review the timeline.`,
        outcome: `You align the next click with what the current state really supports.`,
      },
      {
        title: `Use the timeline and checkout notices when a status seems delayed`,
        body: `After a card checkout flow returns, the page may need a short moment before the final payment status refreshes. Use the visible success or cancel notice together with the timeline instead of assuming the payment is stuck instantly.`,
        outcome: `You distinguish a short refresh delay from a real workflow problem.`,
      },
    ],
    whatHappensNext: [
      `Once you understand the current state, your next move is usually clear: send a draft, continue a payer-side action, wait for an external update, or treat the payment as finished.`,
      `If the state still looks inconsistent after you compare status, role, actions, and timeline, move to the common-issues guide for a more diagnostic path.`,
    ],
    rulesAndLimits: [
      `The same payment route does not expose the same actions in every status.`,
      `A missing action can be correct behavior when the payment is already finished, blocked, or waiting on another side of the flow.`,
      `Card and checkout states can update asynchronously, so a returned browser redirect is not always the final status by itself.`,
    ],
    commonIssuesAndFixes: [
      {
        question: `I can see a status, but I still do not know who should act next.`,
        answer: `Open the payment detail page and read status, role, and the Actions panel together. That combination is usually the clearest answer to who owns the next step.`,
      },
      {
        question: `The payment came back from checkout, but the state still looks old.`,
        answer: `Give the detail page a moment to refresh and compare the checkout notice with the timeline before concluding that the payment failed to progress.`,
      },
      {
        question: `The list shows a state that sounds negative, so I want to try again immediately.`,
        answer: `Do not retry blindly. States like denied or uncollectible usually mean the payment needs review or a different recovery path rather than the same action repeated again.`,
      },
    ],
    faq: [
      {
        question: `Should I trust the list status or the detail page more?`,
        answer: `Use the list for fast scanning, but trust the detail page more when you need to decide the next action for a specific payment.`,
      },
    ],
  },
  [HELP_GUIDE_SLUG.PAYMENTS_COMMON_ISSUES]: {
    whatThisFeatureDoes: [
      `This troubleshooting guide turns the most common payment-state problems into clear next steps.`,
      `It is built around the current detail-page behavior in the app: draft send actions, payer actions, attachment restrictions, checkout responses, and wait states.`,
    ],
    whenToUseIt: [
      `Use it when a payment detail page does not show the action you expected.`,
      `Use it when you created or started a payment but the next step is unclear.`,
      `Use it when a payer action, attachment step, or invoice/download step feels blocked.`,
    ],
    beforeYouStartDescription: `Open the exact payment detail page you are troubleshooting so you can compare the visible status, role, actions, and attachments with the guide.`,
    callouts: [
      {
        variant: `warning`,
        title: `Treat status and role as the first diagnosis step`,
        body: `A missing action is often correct behavior for the current payment state. Check the visible status and role before retrying or escalating.`,
      },
    ],
    steps: [
      {
        title: `Open the payment detail page`,
        body: `Start from the payment detail page because that route shows the overview, timeline, attachments, and Actions panel together.`,
        outcome: `You have the current payment context in front of you.`,
      },
      {
        title: `Review the visible status and your role`,
        body: `Check whether you are the requester or payer, then read the payment status before looking at any button. Draft, pending, completed, or bank-transfer states can all expose different actions.`,
        outcome: `You know which side of the payment is expected to act next.`,
      },
      {
        title: `Compare the Actions panel with the Attachments panel`,
        body: `A requester draft can still show send and attachment actions, while a payer-side payment may instead show saved-card or checkout options. Some flows show no action because the correct next step is to wait.`,
        outcome: `You identify whether the blocker is about the wrong state, the wrong role, or a real failure.`,
      },
      {
        title: `Retry only the action that matches the visible state`,
        body: `If the payment is still a draft, send it. If it is waiting on the payer, use the available payer action. If the page shows a wait-only state, pause instead of repeating the same submission.`,
        outcome: `Your next action is aligned with the actual state of the payment.`,
      },
    ],
    whatHappensNext: [
      `Most payment problems resolve into one of three outcomes: send the draft, use the correct payer action, or wait for the status to progress.`,
      `If the page still looks wrong after that comparison, capture the visible status, role, and last message before asking for support.`,
    ],
    rulesAndLimits: [
      `A missing action can be correct if the payment is on the wrong role, wrong status, or wrong rail for that step.`,
      `Draft-only attachment controls are not available forever; once the payment leaves draft, the payment record behaves differently.`,
      `A slow status refresh after checkout does not automatically mean the charge failed.`,
    ],
    commonIssuesAndFixes: [
      {
        question: `I created a request, but it is still not moving.`,
        answer:
          `Check whether the payment is still a draft. If it is, use the ` +
          `\`Send request\`` +
          ` action from the detail page. Creating the request alone does not send it.`,
      },
      {
        question: `I expected to pay now, but the page does not show card controls.`,
        answer: `Check the status and rail on the payment detail page. Card actions appear only for supported payer-side states. Bank-transfer pending payments do not show card checkout actions.`,
      },
      {
        question: `I cannot attach or remove files the way I expected.`,
        answer: `Attachments behave differently once a payment leaves draft. Requester-draft payments can upload or attach from the library, but historical payment records no longer expose the same draft editing behavior.`,
      },
      {
        question: `Checkout returned, but the status still has not changed.`,
        answer: `Give the detail page a moment to refresh. The page itself warns that Stripe confirmation can take a short time before the final payment status updates.`,
      },
    ],
  },
} as const satisfies Partial<Record<HelpGuideSlug, HelpGuideArticleContent>>;
