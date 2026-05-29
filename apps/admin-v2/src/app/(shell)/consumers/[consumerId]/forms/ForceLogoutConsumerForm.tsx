import { Panel } from '../../../../../components/panel';
import { forceLogoutConsumerAction } from '../../../../../lib/admin-mutations/consumers.server';

export function ForceLogoutConsumerForm({ consumerId }: { consumerId: string }) {
  return (
    <Panel
      title="Session action"
      description="High-friction session control for active consumer access."
      surface="meta"
    >
      <form action={forceLogoutConsumerAction.bind(null, consumerId)} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="confirmed" value="false" />
        <label className="field">
          <span>Confirm</span>
          <input type="checkbox" name="confirmed" value="true" required />
        </label>
        <button className="dangerButton" type="submit" name="confirmedSubmit" value="true">
          Force logout
        </button>
      </form>
    </Panel>
  );
}
