export default function PaymentsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-8 w-32 bg-slate-200 rounded dark:bg-slate-700" />
        <div className="h-11 w-32 bg-slate-200 rounded-lg dark:bg-slate-700" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="h-28 bg-slate-200 rounded-xl dark:bg-slate-700" />
        <div className="h-28 bg-slate-200 rounded-xl dark:bg-slate-700" />
        <div className="h-28 bg-slate-200 rounded-xl dark:bg-slate-700" />
      </div>

      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-24 bg-slate-200 rounded-xl dark:bg-slate-700" />
        ))}
      </div>
    </div>
  );
}
