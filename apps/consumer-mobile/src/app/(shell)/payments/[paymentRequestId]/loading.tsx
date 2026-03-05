import { Card, CardHeader, CardContent } from '../../../../shared/ui/Card';

export default function PaymentDetailLoading() {
  return (
    <div className="space-y-6 animate-pulse" data-testid="payment-detail-loading">
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 rounded bg-slate-200 dark:bg-slate-700" />
      </div>

      <Card noPadding>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-3">
              <div className="h-10 w-32 rounded bg-slate-200 dark:bg-slate-700" />
              <div className="h-4 w-64 rounded bg-slate-200 dark:bg-slate-700" />
              <div className="h-3 w-48 rounded bg-slate-200 dark:bg-slate-700" />
            </div>
            <div className="h-6 w-20 rounded-full bg-slate-200 dark:bg-slate-700" />
          </div>
        </CardHeader>

        <CardContent className="space-y-4 border-b border-slate-200 dark:border-slate-700">
          <div className="h-5 w-24 rounded bg-slate-200 dark:bg-slate-700" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="h-8 w-8 shrink-0 rounded-full bg-slate-200 dark:bg-slate-700" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-40 rounded bg-slate-200 dark:bg-slate-700" />
                <div className="h-3 w-32 rounded bg-slate-200 dark:bg-slate-700" />
              </div>
            </div>
          ))}
        </CardContent>

        <CardContent className="space-y-3">
          <div className="h-5 w-32 rounded bg-slate-200 dark:bg-slate-700" />
          {[1, 2].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg border border-slate-200 p-3 dark:border-slate-700"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-slate-200 dark:bg-slate-700" />
                <div className="space-y-2">
                  <div className="h-4 w-32 rounded bg-slate-200 dark:bg-slate-700" />
                  <div className="h-3 w-20 rounded bg-slate-200 dark:bg-slate-700" />
                </div>
              </div>
              <div className="h-8 w-20 rounded-lg bg-slate-200 dark:bg-slate-700" />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="h-12 flex-1 rounded-lg bg-slate-200 dark:bg-slate-700" />
        <div className="h-12 flex-1 rounded-lg bg-slate-200 dark:bg-slate-700" />
      </div>
    </div>
  );
}
