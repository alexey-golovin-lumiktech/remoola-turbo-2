import { type BankFormState } from './banking-form-helpers';
import { digitsOnly, normalizeEmail, normalizePhone } from './banking-helpers';

function FieldHint({ message, tone = `muted` }: { message: string; tone?: `muted` | `error` }) {
  return (
    <div
      className={`mt-2 text-xs ${tone === `error` ? `text-[var(--app-danger-text)]` : `text-[var(--app-text-faint)]`}`}
    >
      {message}
    </div>
  );
}

type Props = {
  emailValid: boolean;
  form: BankFormState;
  formValid: boolean;
  isPending: boolean;
  phoneValid: boolean;
  onChange: (form: BankFormState) => void;
  onSubmit: () => void;
};

export function BankAccountForm({ emailValid, form, formValid, isPending, phoneValid, onChange, onSubmit }: Props) {
  return (
    <div className="grid gap-4">
      <div className="rounded-3xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-4 text-sm leading-6 text-[var(--app-text-soft)]">
        Bank accounts saved here keep the bank label, last 4 digits, and billing details. Full routing and account
        numbers are not stored on this Banking surface.
      </div>
      <div>
        <label className="mb-2 block text-sm text-[var(--app-text-muted)]" htmlFor="bank-name">
          Bank name
        </label>
        <input
          id="bank-name"
          value={form.bankName}
          onChange={(event) => onChange({ ...form, bankName: event.target.value })}
          placeholder="Bank name"
          className="w-full rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-3 text-[var(--app-text)] outline-none placeholder:text-[var(--app-text-faint)]"
        />
      </div>
      <div>
        <label className="mb-2 block text-sm text-[var(--app-text-muted)]" htmlFor="bank-last4">
          Last 4 digits
        </label>
        <input
          id="bank-last4"
          value={form.last4}
          inputMode="numeric"
          maxLength={4}
          onChange={(event) => onChange({ ...form, last4: digitsOnly(event.target.value, 4) })}
          placeholder="Last 4 digits"
          aria-invalid={form.last4.length > 0 && form.last4.length !== 4}
          className="w-full rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-3 text-[var(--app-text)] outline-none placeholder:text-[var(--app-text-faint)]"
        />
        {form.last4.length > 0 ? (
          <FieldHint
            message={
              form.last4.length === 4
                ? `Looks good.`
                : `${4 - form.last4.length} more digit${form.last4.length === 3 ? `` : `s`} needed.`
            }
            tone={form.last4.length === 4 ? `muted` : `error`}
          />
        ) : null}
      </div>
      <div>
        <label className="mb-2 block text-sm text-[var(--app-text-muted)]" htmlFor="bank-billing-name">
          Billing name
        </label>
        <input
          id="bank-billing-name"
          value={form.billingName}
          onChange={(event) => onChange({ ...form, billingName: event.target.value })}
          placeholder="Billing name"
          className="w-full rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-3 text-[var(--app-text)] outline-none placeholder:text-[var(--app-text-faint)]"
        />
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm text-[var(--app-text-muted)]" htmlFor="bank-billing-email">
            Billing email
          </label>
          <input
            id="bank-billing-email"
            type="email"
            value={form.billingEmail}
            onChange={(event) => onChange({ ...form, billingEmail: normalizeEmail(event.target.value) })}
            placeholder="Billing email"
            aria-invalid={!emailValid}
            className="w-full rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-3 text-[var(--app-text)] outline-none placeholder:text-[var(--app-text-faint)]"
          />
          {form.billingEmail.length > 0 ? (
            <FieldHint
              message={emailValid ? `Email will be saved in lowercase.` : `Enter a valid email address.`}
              tone={emailValid ? `muted` : `error`}
            />
          ) : null}
        </div>
        <div>
          <label className="mb-2 block text-sm text-[var(--app-text-muted)]" htmlFor="bank-billing-phone">
            Billing phone
          </label>
          <input
            id="bank-billing-phone"
            value={form.billingPhone}
            inputMode="tel"
            onChange={(event) => onChange({ ...form, billingPhone: normalizePhone(event.target.value) })}
            placeholder="Billing phone"
            aria-invalid={!phoneValid}
            className="w-full rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-3 text-[var(--app-text)] outline-none placeholder:text-[var(--app-text-faint)]"
          />
          {form.billingPhone.length > 0 ? (
            <FieldHint
              message={phoneValid ? `Phone is stored as digits with optional leading +.` : `Enter at least 7 digits.`}
              tone={phoneValid ? `muted` : `error`}
            />
          ) : null}
        </div>
      </div>
      <label className="flex items-center gap-3 text-sm text-[var(--app-text-soft)]">
        <input
          type="checkbox"
          checked={form.defaultSelected}
          onChange={(event) => onChange({ ...form, defaultSelected: event.target.checked })}
        />
        Make this the default payout method
      </label>
      <button
        type="button"
        disabled={isPending || !formValid}
        onClick={onSubmit}
        className="w-full rounded-2xl bg-[var(--app-primary)] px-4 py-3 font-medium text-[var(--app-primary-contrast)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? `Saving...` : formValid ? `Add bank account` : `Complete bank account details`}
      </button>
    </div>
  );
}
