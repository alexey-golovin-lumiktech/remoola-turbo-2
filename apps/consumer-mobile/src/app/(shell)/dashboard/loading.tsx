export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-8 w-32 bg-slate-200 rounded dark:bg-slate-700" />
        <div className="h-5 w-24 bg-slate-200 rounded dark:bg-slate-700" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="h-32 bg-slate-200 rounded-xl dark:bg-slate-700" />
        <div className="h-32 bg-slate-200 rounded-xl dark:bg-slate-700" />
      </div>

      <div className="h-64 bg-slate-200 rounded-xl dark:bg-slate-700" />
      <div className="h-48 bg-slate-200 rounded-xl dark:bg-slate-700" />
    </div>
  );
}
