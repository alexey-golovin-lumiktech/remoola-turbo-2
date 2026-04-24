import { type ReactNode } from 'react';

type ContextStatProps = {
  label: string;
  value: ReactNode;
  tone?: `neutral` | `amber` | `rose` | `emerald` | `cyan`;
};

export function ContextStat({ label, value, tone = `neutral` }: ContextStatProps) {
  return (
    <div className="contextStat" data-tone={tone}>
      <div className="contextStat__value">{value}</div>
      <div className="contextStat__label">{label}</div>
    </div>
  );
}
