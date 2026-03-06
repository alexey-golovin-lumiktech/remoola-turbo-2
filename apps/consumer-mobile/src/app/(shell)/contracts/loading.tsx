export default function ContractsLoading() {
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

      <div className={`space-y-2`}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`
            h-20
            bg-slate-200
            rounded-xl
            dark:bg-slate-700
          `}
          />
        ))}
      </div>
    </div>
  );
}
