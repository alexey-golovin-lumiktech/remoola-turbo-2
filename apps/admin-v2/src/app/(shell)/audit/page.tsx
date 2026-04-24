import Link from 'next/link';
import { type ReactElement } from 'react';

import { cn } from '@remoola/ui';

import { Panel } from '@/components/panel';
import { WorkspaceLayout } from '@/components/workspace-layout';

const AUDIT_ENTRIES: ReadonlyArray<{
  href: string;
  title: string;
  eyebrow: string;
  description: string;
  bullets: string[];
}> = [
  {
    href: `/audit/auth`,
    title: `Auth events`,
    eyebrow: `Auth history`,
    description: `Sign-in, sign-out, password reset, and suspicious-activity events for admins and consumers.`,
    bullets: [`Suspicious-attempt threshold`, `90-day retention window`, `No PII in payloads (hashed email)`],
  },
  {
    href: `/audit/admin-actions`,
    title: `Admin actions`,
    eyebrow: `Admin history`,
    description: `Every admin-initiated mutation across the platform with action_id, resource type, and resource id.`,
    bullets: [`Replay-deterministic action_id`, `Resource fields non-null by schema`, `No update or delete on the log`],
  },
  {
    href: `/audit/consumer-actions`,
    title: `Consumer actions`,
    eyebrow: `Consumer history`,
    description: `Consumer-initiated mutations: profile edits, payment-method changes, KYC submissions, payout requests.`,
    bullets: [`Tied to consumer.id`, `Surfaced on consumer profile timeline`, `Cross-referenced from admin-actions`],
  },
];

export default function AuditOverviewPage(): ReactElement {
  return (
    <WorkspaceLayout workspace="audit/auth">
      <>
        <section className={cn(`rounded-card border border-border bg-linear-to-br from-bg via-panel to-bg p-6`)}>
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-medium uppercase tracking-[0.22em] text-cyan-300/80">AUDIT EXPLORER</span>
            <h1 className="text-2xl font-semibold text-white">Audit</h1>
            <p className="max-w-2xl text-sm text-white/65">
              Three audit explorers for authentication events, admin actions, and consumer actions. Activity elsewhere
              in the platform surfaces related entries here.
            </p>
          </div>
        </section>

        <Panel
          title="Audit explorers"
          description="Reference-first entry points into immutable logs. Use these when you already know the question you need to answer."
          surface="meta"
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {AUDIT_ENTRIES.map((entry) => (
              <Link key={entry.href} href={entry.href} className="block h-full">
                <Panel
                  className={cn(
                    `h-full rounded-card border border-border bg-panel p-5 transition`,
                    `hover:border-white/25 hover:bg-white/[0.02]`,
                  )}
                  surface="meta"
                >
                  <div className="flex h-full flex-col gap-3">
                    <span className="inline-flex w-fit rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[11px] uppercase tracking-[0.18em] text-white/65">
                      {entry.eyebrow}
                    </span>
                    <div className="text-base font-semibold text-white">{entry.title}</div>
                    <p className="text-sm text-white/65">{entry.description}</p>
                    <ul className="mt-1 flex flex-col gap-1 text-xs text-white/55">
                      {entry.bullets.map((bullet) => (
                        <li key={bullet}>· {bullet}</li>
                      ))}
                    </ul>
                  </div>
                </Panel>
              </Link>
            ))}
          </div>
        </Panel>
      </>
    </WorkspaceLayout>
  );
}
