import { type HelpGuideArticleContent } from '../guide-content-types';
import { HELP_GUIDE_SLUG, type HelpGuideSlug } from '../guide-slugs';

export const exchangeHelpGuideContent = {
  [HELP_GUIDE_SLUG.EXCHANGE_OVERVIEW]: {
    whatThisFeatureDoes: [
      `This guide explains how the Exchange workspace is split between the main /exchange hub, the dedicated /exchange/rules page, and the scheduled-conversions surface.`,
      `It focuses on what the consumer actually sees: the convert form, live-rate cards, auto-rule editor, and scheduled-conversion status list.`,
    ],
    whenToUseIt: [
      `Use it when you open Exchange and want to understand which part of the page owns the action you need.`,
      `Use it before converting funds, creating an auto-conversion rule, or reviewing a scheduled conversion.`,
      `Use it when the exchange area is visible but the next step is not obvious yet.`,
    ],
    beforeYouStartDescription: `Open /exchange first so you can compare the guide with the convert form, live-rate cards, auto-rules preview, and scheduled-conversions preview.`,
    callouts: [
      {
        variant: `info`,
        title: `The main Exchange page is the hub`,
        body: `The main route combines immediate conversion, live-rate refresh, and preview panels for rules and scheduled conversions. The dedicated rules and scheduled pages are there when you need full management views.`,
      },
    ],
    steps: [
      {
        title: `Start on the main Exchange route`,
        body: `Use /exchange as the first stop because it shows the immediate convert form, live-rate cards, a rules section, and a scheduled-conversions section on one screen.`,
        outcome: `You can tell whether your next action is a manual conversion, a rules change, or scheduled follow-up.`,
      },
      {
        title: `Separate manual conversion from automation`,
        body: `Treat the convert form as the now-action surface. Treat the rules section as balance-threshold automation. Treat scheduled conversions as future-dated actions that execute later rather than immediately.`,
        outcome: `You avoid mixing one-time conversion steps with automation management.`,
      },
      {
        title: `Use the live-rate cards as reference, not as submission`,
        body: `The live-rate panel helps you refresh the currently displayed pairs without reloading the rest of the page. It is useful for orientation, but the actual quote and conversion actions still happen in the convert form.`,
        outcome: `You understand why rate refresh and quote retrieval are separate controls.`,
      },
      {
        title: `Move into the dedicated rules route when rule management becomes the main task`,
        body: `The rules preview on /exchange is enough for quick review, but /exchange/rules is the better surface when you need to create, edit, pause, enable, or delete rules with full focus.`,
        outcome: `You switch routes only when the workflow becomes rule-centric.`,
      },
      {
        title: `Use the scheduled route for future-dated review and cleanup`,
        body: `If the question is about future execution time, pending vs history filtering, or cancelling a pending scheduled conversion, continue into /exchange/scheduled instead of staying on the main hub.`,
        outcome: `You land on the route that exposes the scheduled-specific controls and statuses.`,
      },
    ],
    whatHappensNext: [
      `After this overview, the usual next step is to either get a quote and convert on /exchange or continue into /exchange/rules for automation management.`,
      `If the problem is not about choosing a route but about a blocked state, use the exchange troubleshooting guide instead of retrying from memory.`,
    ],
    rulesAndLimits: [
      `The same Exchange area exposes several related workflows, but they do not behave the same way.`,
      `Live-rate cards, quotes, immediate conversion, auto-rules, and scheduled conversions are intentionally separate actions with different validation and outcomes.`,
      `When a dedicated route exists, trust the controls and statuses on that route more than the preview state you remember from the main hub.`,
    ],
    commonIssuesAndFixes: [
      {
        question: `I can see Exchange, but I am not sure where to start.`,
        answer: `Start on /exchange and decide whether you need a one-time conversion now, a rule that keeps a target balance automatically, or a future-dated scheduled conversion.`,
      },
      {
        question: `The main Exchange page looks busy. Do I have to use every section?`,
        answer: `No. The page is a hub. Use only the section that matches your goal, then continue into the dedicated rules or scheduled page if that workflow becomes the main task.`,
      },
      {
        question: `I refreshed live rates, but I still do not have a quote.`,
        answer: `That is expected. Refreshing rate cards updates the reference panel. Use the convert form's quote action when you need a quote for the amount currently entered.`,
      },
    ],
    faq: [
      {
        question: `Should I use /exchange/rules first if I want automation?`,
        answer: `Usually start on /exchange to orient yourself, then move to /exchange/rules when creating or editing rules becomes the main task.`,
      },
    ],
  },
  [HELP_GUIDE_SLUG.EXCHANGE_CONVERT_AND_AUTOMATE]: {
    whatThisFeatureDoes: [
      `This guide walks through the real exchange workflow: getting a quote, converting funds now, and managing automation through rules or scheduled conversions.`,
      `It stays grounded in the current UX, including disabled actions for invalid input, insufficient-balance signals, and the rule-management controls on the dedicated rules page.`,
    ],
    whenToUseIt: [
      `Use it when you want to convert funds immediately from /exchange.`,
      `Use it when you need to create, edit, pause, enable, or delete an auto-conversion rule from /exchange/rules.`,
      `Use it when you need to schedule a future conversion and understand which route owns that action.`,
    ],
    beforeYouStartDescription: `Have a positive source balance, choose two different currencies, and decide whether the action should happen now, automatically by rule, or later on a schedule.`,
    callouts: [
      {
        variant: `warning`,
        title: `Quote and convert are separate actions`,
        body: `The convert form can fetch a quote before you submit, but the quote itself does not move funds. Funds only move when you use the convert action and the current balance can support it.`,
      },
    ],
    steps: [
      {
        title: `Use /exchange for one-time conversion`,
        body: `Choose the source and target currencies in the convert form, make sure they differ, and enter an amount greater than zero. The form also shows the available balance for the selected source currency so you can compare your request before submitting.`,
        outcome: `You are using the route that owns immediate conversion and amount validation.`,
      },
      {
        title: `Get a quote when you need confirmation before converting`,
        body: `Use the quote action to preview the current rate, target amount, and source amount for what you entered. This is the safest step when you want to confirm the result before moving funds.`,
        outcome: `You can compare the expected output before committing the conversion.`,
      },
      {
        title: `Convert only when the current balance supports it`,
        body:
          `Use ` +
          `\`Convert now\`` +
          ` only after the amount is valid, the currencies differ, and the requested amount does not exceed the available balance shown on the page. After a successful conversion, the form clears the amount and the page refreshes.`,
        outcome: `Funds are converted through the immediate exchange flow instead of just quoted.`,
      },
      {
        title: `Use /exchange/rules for repeatable balance automation`,
        body: `Open the dedicated rules route when you want to keep a target balance automatically. There you can choose source and target currencies, set a required target balance, optionally cap each execution, define the minimum interval, and decide whether the rule starts enabled immediately.`,
        outcome: `The rule is created or updated in the route designed for rule management rather than one-off conversion.`,
      },
      {
        title: `Manage existing rules from the list, not from memory`,
        body: `Use the rule list actions to edit, pause, enable, or delete an existing rule. The current state of each rule is shown directly in the list, so read that state before changing it.`,
        outcome: `You update automation based on the live rule state already shown in the app.`,
      },
      {
        title: `Use /exchange/scheduled for future execution`,
        body: `If the conversion should happen later, open the scheduled route and set source currency, target currency, amount, and a future execution time. Only pending scheduled conversions can be cancelled later from that list.`,
        outcome: `Future-dated exchange work is stored in the scheduled-conversions flow instead of the immediate convert flow.`,
      },
    ],
    whatHappensNext: [
      `After a successful one-time conversion, the main Exchange page refreshes and the updated state becomes the next source of truth.`,
      `After a rule or scheduled conversion is saved, the matching list becomes the best place to review status, enablement, or pending-versus-history state.`,
    ],
    rulesAndLimits: [
      `Immediate conversion requires two different currencies and an amount greater than zero.`,
      `The convert action is intentionally blocked when the requested amount exceeds the currently available balance.`,
      `Rule creation requires a target balance, allows zero as a valid target, and treats max-convert amount as optional.`,
      `Scheduled conversions require a future date and time; past or invalid values are rejected by the form.`,
    ],
    commonIssuesAndFixes: [
      {
        question: `I can get a quote, but I still cannot convert.`,
        answer: `Check whether the requested amount is above the available balance or whether the form still has another validation issue. A quote does not bypass convert validation.`,
      },
      {
        question: `The rule form will not save.`,
        answer: `Check that the currencies differ, target balance is present and valid, the optional cap is greater than zero when provided, and the interval is at least 1 minute when filled in.`,
      },
      {
        question: `I scheduled a conversion, but I cannot cancel it anymore.`,
        answer: `Only pending scheduled conversions show the cancel action. Once the record moves into processing, executed, failed, or cancelled history, the route no longer exposes that control.`,
      },
    ],
    faq: [
      {
        question: `Do I need to visit /exchange/rules to create a rule?`,
        answer: `Not always, because the main Exchange page also shows a rules section. Use /exchange/rules when rules are your main task and you want the full focused management surface.`,
      },
    ],
  },
  [HELP_GUIDE_SLUG.EXCHANGE_COMMON_ISSUES]: {
    whatThisFeatureDoes: [
      `This troubleshooting guide helps you diagnose the most common blocked states across immediate conversion, rule management, and scheduled conversions.`,
      `It focuses on the actual visible signals: disabled buttons, unavailable rates, validation hints, and scheduled-status labels.`,
    ],
    whenToUseIt: [
      `Use it when Exchange actions are disabled or the next recovery step is unclear.`,
      `Use it when the quote, convert, or rule-save flow fails and you need a cleaner diagnosis path.`,
      `Use it when a scheduled conversion looks stuck, unavailable, or not cancellable anymore.`,
    ],
    beforeYouStartDescription: `Open the exact Exchange route where the problem appears and keep the current validation text, status badge, or disabled action visible while you troubleshoot.`,
    callouts: [
      {
        variant: `warning`,
        title: `Start with the visible validation, not with a retry`,
        body: `Exchange surfaces already expose useful first signals such as same-currency errors, insufficient-balance hints, stale or unavailable rates, and scheduled-status labels. Read those first before resubmitting.`,
      },
    ],
    steps: [
      {
        title: `Confirm you are on the right exchange surface`,
        body: `Use /exchange for quote and immediate conversion, /exchange/rules for rule management, and /exchange/scheduled for future-dated conversions. A blocked action is often just the wrong route for the job.`,
        outcome: `You troubleshoot the workflow that actually owns the action.`,
      },
      {
        title: `Check the most obvious input problem first`,
        body: `On convert and rule forms, make sure the source and target currencies differ. Then verify the amount, target balance, optional cap, or interval field that the form is currently validating.`,
        outcome: `You either clear the direct validation issue or rule it out quickly.`,
      },
      {
        title: `Compare the requested amount with the current balance`,
        body: `If the convert flow says the amount exceeds the available balance, treat that as the primary blocker. The convert action stays disabled until the amount is brought back within the currently available source balance.`,
        outcome: `You stop treating an intentional balance guard as a broken submit button.`,
      },
      {
        title: `Use route-specific recovery for rates and automation`,
        body: `If live rates are unavailable or stale, refresh the rates or retry the quote from the same route. If a rule or scheduled conversion saved successfully, let the list refresh before assuming the mutation failed.`,
        outcome: `You recover based on the behavior of the current surface instead of switching routes blindly.`,
      },
      {
        title: `Read scheduled status before trying to cancel or retry`,
        body: `Pending scheduled conversions can still be cancelled. Historical entries marked executed, failed, processing, or cancelled are no longer in the same editable state, so the route intentionally changes which actions are available.`,
        outcome: `You align the next step with the scheduled record's actual lifecycle state.`,
      },
    ],
    whatHappensNext: [
      `Most exchange problems resolve into one of three outcomes: correct the current input, use the right exchange route, or wait for the accepted state to refresh.`,
      `If the screen still looks wrong after that, capture the visible route, message, and status before escalating so the problem stays tied to the real current state.`,
    ],
    rulesAndLimits: [
      `A disabled exchange action is often correct behavior for the current input or balance state.`,
      `Unavailable or stale rates do not automatically mean the whole exchange area is broken; they can be isolated to the current rate refresh or quote attempt.`,
      `Scheduled conversions do not expose the same actions in every status, and historical entries are intentionally less editable than pending ones.`,
    ],
    commonIssuesAndFixes: [
      {
        question: `Why is the convert button disabled?`,
        answer: `Check the visible form state first: the currencies must differ, the amount must be greater than zero, and the request cannot exceed the available balance shown for the selected source currency.`,
      },
      {
        question: `The rates panel says rates are unavailable. Can I still do anything?`,
        answer: `Retry from the same route first. Refreshing live rates and requesting a quote are separate actions, so use the control that matches what you are trying to recover.`,
      },
      {
        question: `I cannot save or enable a rule the way I expected.`,
        answer: `Review the rule inputs again, especially target balance, optional cap, interval, and whether the currencies differ. Then retry from /exchange/rules or the rules section on /exchange without switching workflows mid-stream.`,
      },
      {
        question: `A scheduled conversion is no longer cancellable.`,
        answer: `Open the scheduled list and read the current status. Only pending items show the cancel action. Processing, executed, failed, or cancelled entries are already in a different lifecycle state.`,
      },
    ],
  },
} as const satisfies Partial<Record<HelpGuideSlug, HelpGuideArticleContent>>;
