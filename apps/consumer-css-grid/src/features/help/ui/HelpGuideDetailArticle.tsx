import { type HelpGuideArticleContent } from '../guide-content';
import { type PublicHelpGuideRegistryEntry } from '../guide-registry';
import { helpGuideCategoryLabels, helpGuideFeatureLabels, helpGuideTypeLabels } from '../help-hub-data';
import { HelpArticle } from './HelpArticle';
import { HelpCallout } from './HelpCallout';
import { HelpFaq } from './HelpFaq';
import { HelpPrerequisites } from './HelpPrerequisites';
import { HelpRelatedGuides } from './HelpRelatedGuides';
import { HelpSection } from './HelpSection';
import { HelpSteps } from './HelpSteps';

function HelpBulletList({ items }: { items: readonly string[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li
          key={item}
          className="rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-3 text-sm leading-7 text-[var(--app-text-soft)]"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

interface HelpGuideDetailArticleProps {
  guide: PublicHelpGuideRegistryEntry;
  content: HelpGuideArticleContent;
}

export function HelpGuideDetailArticle({ guide, content }: HelpGuideDetailArticleProps) {
  return (
    <HelpArticle
      title={guide.title}
      summary={guide.summary}
      eyebrow={`${helpGuideTypeLabels[guide.guideType]} · ${helpGuideCategoryLabels[guide.category]} · ${
        helpGuideFeatureLabels[guide.feature]
      }`}
    >
      <HelpSection title="What this feature does">
        <div className="space-y-3 text-sm leading-7 text-[var(--app-text-soft)]">
          {content.whatThisFeatureDoes.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </HelpSection>

      <HelpSection title="When to use it">
        <HelpBulletList items={content.whenToUseIt} />
      </HelpSection>

      <HelpPrerequisites items={guide.prerequisites} description={content.beforeYouStartDescription} />

      {content.callouts?.map((callout) => (
        <HelpCallout
          key={`${callout.variant}-${callout.title ?? callout.body}`}
          variant={callout.variant}
          title={callout.title}
        >
          {callout.body}
        </HelpCallout>
      ))}

      <HelpSteps items={content.steps} />

      <HelpSection title="What happens next">
        <HelpBulletList items={content.whatHappensNext} />
      </HelpSection>

      <HelpSection title="Important rules and limits">
        <HelpBulletList items={content.rulesAndLimits} />
      </HelpSection>

      <HelpFaq title="Common issues and fixes" items={content.commonIssuesAndFixes} />

      {content.faq ? <HelpFaq items={content.faq} /> : null}

      <HelpRelatedGuides
        slugs={guide.relatedGuides}
        description="These guides cover the next steps, adjacent workflows, or the most common follow-up questions."
      />
    </HelpArticle>
  );
}
