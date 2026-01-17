export function LoginSkeleton() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-sm rounded-xl border bg-white p-6 shadow-sm">
        <div className="h-6 w-32 rounded bg-gray-200" />
        <div className="mt-4 space-y-3">
          <div className="h-10 rounded bg-gray-200" />
          <div className="h-10 rounded bg-gray-200" />
          <div className="h-10 rounded bg-gray-200" />
        </div>
      </div>
    </div>
  );
}
