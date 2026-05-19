import { HELP_GUIDE_SLUG, type HelpGuideSlug } from '../guide-slugs';
import {
  HELP_AUDIENCE_STATE,
  HELP_GUIDE_CATEGORY,
  HELP_GUIDE_FEATURE,
  HELP_GUIDE_TYPE,
  type HelpGuideDefinition,
} from '../guide-types';

export const settingsHelpGuideDefinitions = [
  {
    slug: HELP_GUIDE_SLUG.SETTINGS_OVERVIEW,
    guideType: HELP_GUIDE_TYPE.OVERVIEW,
    title: `Settings overview`,
    summary: `Understand how profile details, saved preferences, password actions, and verification state come together in the settings area.`,
    category: HELP_GUIDE_CATEGORY.SETTINGS_AND_PROFILE,
    feature: HELP_GUIDE_FEATURE.SETTINGS,
    audienceState: HELP_AUDIENCE_STATE.AUTHENTICATED,
    routeAffinity: [`/settings`],
    order: 58,
    prerequisites: [
      `Open the settings area so you can compare the guide with the profile form, preferences, password controls, and verification card.`,
    ],
    relatedGuides: [
      HELP_GUIDE_SLUG.SETTINGS_PROFILE_AND_SECURITY,
      HELP_GUIDE_SLUG.SETTINGS_COMMON_ISSUES,
      HELP_GUIDE_SLUG.VERIFICATION_HOW_IT_WORKS,
      HELP_GUIDE_SLUG.GETTING_STARTED_OVERVIEW,
    ],
  },
  {
    slug: HELP_GUIDE_SLUG.SETTINGS_PROFILE_AND_SECURITY,
    guideType: HELP_GUIDE_TYPE.TASK,
    title: `How to manage profile, preferences, and password`,
    summary: `Update personal details, save theme and preferred currency, and understand what happens when you create or change your password.`,
    category: HELP_GUIDE_CATEGORY.SETTINGS_AND_PROFILE,
    feature: HELP_GUIDE_FEATURE.SETTINGS,
    audienceState: HELP_AUDIENCE_STATE.AUTHENTICATED,
    routeAffinity: [`/settings`],
    order: 60,
    prerequisites: [`Sign in and open the settings area from the main workspace navigation.`],
    relatedGuides: [
      HELP_GUIDE_SLUG.SETTINGS_OVERVIEW,
      HELP_GUIDE_SLUG.SETTINGS_COMMON_ISSUES,
      HELP_GUIDE_SLUG.VERIFICATION_HOW_IT_WORKS,
      HELP_GUIDE_SLUG.GETTING_STARTED_OVERVIEW,
    ],
  },
  {
    slug: HELP_GUIDE_SLUG.SETTINGS_COMMON_ISSUES,
    guideType: HELP_GUIDE_TYPE.TROUBLESHOOTING,
    title: `Common settings issues and next steps`,
    summary: `Use this guide when profile updates, preference changes, password actions, or account notices in Settings do not behave as expected.`,
    category: HELP_GUIDE_CATEGORY.SETTINGS_AND_PROFILE,
    feature: HELP_GUIDE_FEATURE.SETTINGS,
    audienceState: HELP_AUDIENCE_STATE.AUTHENTICATED,
    routeAffinity: [`/settings`],
    order: 65,
    prerequisites: [
      `Open Settings and compare the guide with the field, notice, or save state that currently looks blocked or unclear.`,
    ],
    relatedGuides: [
      HELP_GUIDE_SLUG.SETTINGS_OVERVIEW,
      HELP_GUIDE_SLUG.SETTINGS_PROFILE_AND_SECURITY,
      HELP_GUIDE_SLUG.VERIFICATION_COMMON_ISSUES,
      HELP_GUIDE_SLUG.GETTING_STARTED_OVERVIEW,
    ],
  },
] as const satisfies readonly HelpGuideDefinition<HelpGuideSlug>[];
