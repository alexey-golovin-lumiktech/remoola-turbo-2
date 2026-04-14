import { type HelpGuideArticleContent, helpGuideContentBySlug } from './guide-content';
import { publicHelpGuideRegistry, type PublicHelpGuideRegistryEntry } from './guide-registry';

export interface HelpGuideDetail {
  guide: PublicHelpGuideRegistryEntry;
  content: HelpGuideArticleContent;
}

export function getGuideBySlug(slug: string): HelpGuideDetail | null {
  const normalizedSlug = slug.trim().toLowerCase();
  const guide = publicHelpGuideRegistry.find((entry) => entry.slug === normalizedSlug);

  if (!guide) {
    return null;
  }

  return {
    guide,
    content: helpGuideContentBySlug[guide.slug],
  };
}
