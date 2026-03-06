import { type SVGAttributes } from 'react';

export interface IconProps extends SVGAttributes<SVGSVGElement> {
  size?: number | string;
  className?: string;
}
