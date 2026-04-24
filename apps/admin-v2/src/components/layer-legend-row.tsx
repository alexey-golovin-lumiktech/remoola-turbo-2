import { type ReactElement } from 'react';

export type LayerLegendRowProps = {
  label: string;
  value: string;
};

export function LayerLegendRow({ label, value }: LayerLegendRowProps): ReactElement {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[11px] uppercase tracking-[0.24em] text-white/45">{label}</span>
      <span className="text-right text-[12px] text-white/65">{value}</span>
    </div>
  );
}
