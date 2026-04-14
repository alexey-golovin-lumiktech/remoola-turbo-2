import Link from 'next/link';

import { SearchIcon } from '@remoola/ui';

import { PageHeader, Panel } from '../../../../shared/ui/shell-primitives';

export default function HelpGuideNotFound() {
  return (
    <div>
      <PageHeader
        title="Help Center"
        subtitle="The guide you tried to open is not available right now."
        icon={<SearchIcon size={40} className="h-10 w-10 text-white" />}
      />

      <Panel title="Guide not found">
        <div className="space-y-4">
          <p className="text-sm leading-7 text-[var(--app-text-soft)]">
            We could not find that help article. Go back to the Help Center to browse available guides or search for a
            related topic.
          </p>
          <Link
            href="/help"
            className="inline-flex rounded-full bg-[var(--app-primary)] px-4 py-2 text-sm font-medium text-[var(--app-primary-contrast)]"
          >
            Back to Help Center
          </Link>
        </div>
      </Panel>
    </div>
  );
}
