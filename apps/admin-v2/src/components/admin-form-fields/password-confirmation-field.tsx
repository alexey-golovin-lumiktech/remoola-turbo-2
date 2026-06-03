import { fieldClass, fieldLabelClass, textInputClass } from '../ui-classes';

export function PasswordConfirmationField({ disabled = false }: { disabled?: boolean }) {
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
