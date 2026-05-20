import { type ReactElement } from 'react';

import { ActionControl, type ActionControlProps } from './action-control';
import { primaryButtonClass } from './ui-classes';

export function ActionPrimary(props: ActionControlProps): ReactElement {
  return <ActionControl {...props} baseClassName={primaryButtonClass} />;
}
