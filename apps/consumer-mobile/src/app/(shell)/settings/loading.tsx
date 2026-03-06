export default function SettingsLoading() {
  return (
    <div className={`space-y-6 animate-pulse`}>
      <div
        className={`
        h-8
        w-32
        bg-slate-200
        rounded
        dark:bg-slate-700
      `}
      />

      <div className={`space-y-4`}>
        <div
          className={`
          h-64
          bg-slate-200
          rounded-xl
          dark:bg-slate-700
        `}
        />
        <div
          className={`
          h-48
          bg-slate-200
          rounded-xl
          dark:bg-slate-700
        `}
        />
        <div
          className={`
          h-32
          bg-slate-200
          rounded-xl
          dark:bg-slate-700
        `}
        />
      </div>
    </div>
  );
}
