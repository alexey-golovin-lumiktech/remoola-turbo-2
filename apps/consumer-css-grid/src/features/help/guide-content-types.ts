import { type HelpCalloutVariant } from './ui/HelpCallout';
import { type HelpFaqItem } from './ui/HelpFaq';
import { type HelpStepItem } from './ui/HelpSteps';

export interface HelpGuideCallout {
  variant: HelpCalloutVariant;
  title?: string;
  body: string;
}

export interface HelpGuideArticleContent {
  whatThisFeatureDoes: readonly string[];
  whenToUseIt: readonly string[];
  beforeYouStartDescription?: string;
  callouts?: readonly HelpGuideCallout[];
  steps: readonly HelpStepItem[];
  whatHappensNext: readonly string[];
  rulesAndLimits: readonly string[];
  commonIssuesAndFixes: readonly HelpFaqItem[];
  faq?: readonly HelpFaqItem[];
}
