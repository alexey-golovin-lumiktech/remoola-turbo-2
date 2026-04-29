import { type CardFormState } from './banking-form-helpers';
import { digitsOnly, normalizeEmail, normalizeMonth, normalizePhone } from './banking-helpers';

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
  expired: boolean;
  form: CardFormState;
  formValid: boolean;
  isPending: boolean;
  phoneValid: boolean;
  onChange: (form: CardFormState) => void;
  onSubmit: () => void;
};

export function ManualCardForm({
  emailValid,
  expired,
  form,
  formValid,
  isPending,
  phoneValid,
  onChange,
  onSubmit,
}: Props) {
  return (
    <div className="grid gap-4">
      <div className="rounded-3xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-4 text-sm leading-6 text-[var(--app-text-soft)]">
        Manual card records keep brand, last 4, expiry, and billing details in Banking. They do not create a reusable
        Stripe card for one-click payer payments.
      </div>
      <div>
        <label className="mb-2 block text-sm text-[var(--app-text-muted)]" htmlFor="card-brand">
          Card brand
        </label>
        <input
          id="card-brand"
          value={form.brand}
          onChange={(event) => onChange({ ...form, brand: event.target.value })}
          placeholder="Card brand"
          className="w-full rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-3 text-[var(--app-text)] outline-none placeholder:text-[var(--app-text-faint)]"
        />
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div>
          <label className="mb-2 block text-sm text-[var(--app-text-muted)]" htmlFor="card-last4">
            Last 4
          </label>
          <input
            id="card-last4"
            value={form.last4}
            inputMode="numeric"
            maxLength={4}
            onChange={(event) => onChange({ ...form, last4: digitsOnly(event.target.value, 4) })}
            placeholder="Last 4"
            aria-invalid={form.last4.length > 0 && form.last4.length !== 4}
            className="w-full rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-3 text-[var(--app-text)] outline-none placeholder:text-[var(--app-text-faint)]"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm text-[var(--app-text-muted)]" htmlFor="card-exp-month">
            Exp. month
          </label>
          <input
            id="card-exp-month"
            value={form.expMonth}
            inputMode="numeric"
            maxLength={2}
            onChange={(event) => onChange({ ...form, expMonth: normalizeMonth(event.target.value) })}
            placeholder="MM"
            aria-invalid={form.expMonth.length > 0 && !/^(0[1-9]|1[0-2])$/.test(form.expMonth)}
            className="w-full rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-3 text-[var(--app-text)] outline-none placeholder:text-[var(--app-text-faint)]"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm text-[var(--app-text-muted)]" htmlFor="card-exp-year">
            Exp. year
          </label>
          <input
            id="card-exp-year"
            value={form.expYear}
            inputMode="numeric"
            maxLength={4}
            onChange={(event) => onChange({ ...form, expYear: digitsOnly(event.target.value, 4) })}
            placeholder="YYYY"
            aria-invalid={(form.expYear.length > 0 && !/^\d{4}$/.test(form.expYear)) || expired}
            className="w-full rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-3 text-[var(--app-text)] outline-none placeholder:text-[var(--app-text-faint)]"
          />
        </div>
      </div>
      <FieldHint
        message={
          expired ? `Expiry date cannot be in the past.` : `Manual card values are stored as Banking metadata only.`
        }
        tone={expired ? `error` : `muted`}
      />
      <div>
        <label className="mb-2 block text-sm text-[var(--app-text-muted)]" htmlFor="card-billing-name">
          Billing name
        </label>
        <input
          id="card-billing-name"
          value={form.billingName}
          onChange={(event) => onChange({ ...form, billingName: event.target.value })}
          placeholder="Billing name"
          className="w-full rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-3 text-[var(--app-text)] outline-none placeholder:text-[var(--app-text-faint)]"
        />
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm text-[var(--app-text-muted)]" htmlFor="card-billing-email">
            Billing email
          </label>
          <input
            id="card-billing-email"
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
          <label className="mb-2 block text-sm text-[var(--app-text-muted)]" htmlFor="card-billing-phone">
            Billing phone
          </label>
          <input
            id="card-billing-phone"
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
        Make this the default card in Banking
      </label>
      <FieldHint message="Card defaults stay type-scoped across both manual and reusable card entries." />
      <button
        type="button"
        disabled={isPending || !formValid}
        onClick={onSubmit}
        className="w-full rounded-2xl bg-[var(--app-primary)] px-4 py-3 font-medium text-[var(--app-primary-contrast)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? `Saving...` : formValid ? `Add manual card record` : `Complete manual card details`}
      </button>
    </div>
  );
}
