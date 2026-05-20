import { type ReactElement } from 'react';

import { ActionControl, type ActionControlProps } from './action-control';
import { ghostButtonClass } from './ui-classes';

export function ActionGhost(props: ActionControlProps): ReactElement {
  return <ActionControl {...props} baseClassName={ghostButtonClass} />;
}
