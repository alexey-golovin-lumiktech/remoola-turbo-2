export default function LoginLoading() {
  return (
    <div
      className={`
      flex
      min-h-screen
      items-center
      justify-center
    `}
      aria-busy="true"
    >
      <div
        className={`
        h-8
        w-8
        animate-pulse
        rounded-full
        bg-slate-300
        dark:bg-slate-600
      `}
      />
    </div>
  );
}
