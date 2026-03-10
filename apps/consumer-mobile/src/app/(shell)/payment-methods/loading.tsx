export default function PaymentMethodsLoading() {
  return (
    <div
      className={`
  mx-auto
  max-w-md
  space-y-4
  p-4
      `}
    >
      <div className={`flex items-center justify-between`}>
        <div
          className={`
  h-8
  w-48
  animate-pulse
  rounded-lg
  bg-slate-200
  dark:bg-slate-700
          `}
        />
        <div
          className={`
  h-11
  w-32
  animate-pulse
  rounded-lg
  bg-slate-200
  dark:bg-slate-700
          `}
        />
      </div>

      <div className={`grid gap-4 sm:grid-cols-2`}>
        {[1, 2].map((i) => (
          <div
            key={i}
            className={`
  overflow-hidden
  rounded-xl
  border
  border-slate-200
  bg-white
  shadow-xs
  dark:border-slate-700
  dark:bg-slate-800
            `}
          >
            <div className={`p-6`}>
              <div className={`flex items-start gap-4`}>
                <div
                  className={`
  h-12
  w-12
  shrink-0
  animate-pulse
  rounded-lg
  bg-slate-200
  dark:bg-slate-700
                  `}
                />
                <div className={`flex-1 space-y-2`}>
                  <div
                    className={`
  h-5
  w-32
  animate-pulse
  rounded-xs
  bg-slate-200
  dark:bg-slate-700
                    `}
                  />
                  <div
                    className={`
  h-4
  w-24
  animate-pulse
  rounded-xs
  bg-slate-200
  dark:bg-slate-700
                    `}
                  />
                </div>
              </div>

              <div className={`mt-4 flex gap-2`}>
                <div
                  className={`
  h-10
  flex-1
  animate-pulse
  rounded-lg
  bg-slate-200
  dark:bg-slate-700
                  `}
                />
                <div
                  className={`
  h-10
  flex-1
  animate-pulse
  rounded-lg
  bg-slate-200
  dark:bg-slate-700
                  `}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
