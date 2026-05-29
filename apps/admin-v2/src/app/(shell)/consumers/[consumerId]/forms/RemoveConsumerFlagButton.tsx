import { removeConsumerFlagAction } from '../../../../../lib/admin-mutations/consumers.server';

export function RemoveConsumerFlagButton({
  consumerId,
  flagId,
  version,
}: {
  consumerId: string;
  flagId: string;
  version: number;
}) {
  return (
    <form action={removeConsumerFlagAction.bind(null, consumerId, flagId)}>
      <input type="hidden" name="version" value={String(version)} />
      <button className="dangerButton" type="submit">
        Remove
      </button>
    </form>
  );
}
