import { DashboardVerificationAction } from './DashboardVerificationAction';
import { type VerificationBannerState } from './verification-banner';
import { type DashboardData } from '../../../lib/consumer-api.server';

type DashboardVerification = DashboardData[`verification`];

export function DashboardVerificationSection({
  dashboardUnavailable,
  verification,
  verificationBanner,
}: {
  dashboardUnavailable: boolean;
  verification: DashboardVerification | undefined;
  verificationBanner: VerificationBannerState;
}) {
  return (
    <section className={`mt-5 rounded-[28px] border p-5 ${verificationBanner.panelClass}`}>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex gap-4">
          <div
            className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-[24px] ${verificationBanner.iconClass}`}
          >
            <span className="text-4xl">{verificationBanner.icon}</span>
          </div>
          <div>
            <div className="text-sm uppercase tracking-[0.3em] text-(--app-primary)">Verification</div>
            <h2 className="mt-1 text-3xl font-semibold">{verificationBanner.headline}</h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-(--app-text-soft) md:text-sm">
              {verificationBanner.copy}
            </p>
          </div>
        </div>
        <div className="flex w-full max-w-sm flex-col gap-3 md:items-end">
          <span
            className={`inline-flex rounded-full border px-4 py-2 text-base md:text-sm ${verificationBanner.badgeClass}`}
          >
            {verificationBanner.badge}
          </span>
          <DashboardVerificationAction verification={verification} dashboardUnavailable={dashboardUnavailable} />
        </div>
      </div>
    </section>
  );
}
