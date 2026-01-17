'use client';

export function JsonView({ value }: { value: unknown }) {
  return (
    <pre className="overflow-auto rounded-xl border bg-gray-50 p-4 text-xs leading-relaxed">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}
