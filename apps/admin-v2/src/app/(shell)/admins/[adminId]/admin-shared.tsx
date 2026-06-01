import { fieldClass, fieldLabelClass, textInputClass } from '../../../../components/ui-classes';
import { formatDateTime } from '../../../../lib/admin-format';

export const formatDate = formatDateTime;

export function renderJson(value: Record<string, unknown> | null) {
  if (!value) {
    return <p className="muted">No metadata.</p>;
  }
  return (
    <pre className="mono rounded-card border border-white/8 bg-black/20 p-3">{JSON.stringify(value, null, 2)}</pre>
  );
}

export function StepUpPasswordField({ disabled = false }: { disabled?: boolean }) {
  return (
    <label className={fieldClass}>
      <span className={fieldLabelClass}>Current password</span>
      <input
        className={textInputClass}
        name="passwordConfirmation"
        type="password"
        autoComplete="current-password"
        required
        placeholder="Confirm with your current password"
        disabled={disabled}
      />
    </label>
  );
}
