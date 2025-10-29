export function Progress({ value, className }: { value: number; className?: string }) {
  return (
    <div className={`rm-progress ${className || ``}`}>
      <div className="rm-progress__bar" style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }} />
    </div>
  );
}
