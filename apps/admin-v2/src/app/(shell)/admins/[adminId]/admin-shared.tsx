export function renderJson(value: Record<string, unknown> | null) {
  if (!value) {
    return <p className="muted">No metadata.</p>;
  }
  return (
    <pre className="mono rounded-card border border-white/8 bg-black/20 p-3">{JSON.stringify(value, null, 2)}</pre>
  );
}
