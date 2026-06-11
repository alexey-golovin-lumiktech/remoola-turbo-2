'use client';

import { type Dispatch, type SetStateAction } from 'react';

import { type ContactFormStateResult } from './contact-form-state';

type ContactFormValues = ContactFormStateResult[`form`];
type ContactFormMessage = ContactFormStateResult[`message`];

export function ContactsFormSection({
  cancelEditing,
  editingContactId,
  form,
  isPending,
  message,
  onFormSubmit,
  setForm,
  setMessage,
}: {
  cancelEditing: () => void;
  editingContactId: string | null;
  form: ContactFormValues;
  isPending: boolean;
  message: ContactFormMessage;
  onFormSubmit: () => void;
  setForm: Dispatch<SetStateAction<ContactFormValues>>;
  setMessage: (next: ContactFormMessage) => void;
}) {
  const patch = (field: keyof ContactFormValues, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setMessage(null);
  };

  return (
    <>
      <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm text-(--app-text-muted)" htmlFor="contact-email">
            Email
          </label>
          <input
            id="contact-email"
            type="email"
            value={form.email}
            onChange={(event) => patch(`email`, event.target.value)}
            className="w-full rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-3 text-(--app-text) outline-none placeholder:text-(--app-text-faint)"
            placeholder="partner@example.com"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm text-(--app-text-muted)" htmlFor="contact-name">
            Name
          </label>
          <input
            id="contact-name"
            value={form.name}
            onChange={(event) => patch(`name`, event.target.value)}
            className="w-full rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-3 text-(--app-text) outline-none placeholder:text-(--app-text-faint)"
            placeholder="Partner name"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm text-(--app-text-muted)" htmlFor="contact-street">
            Street
          </label>
          <input
            id="contact-street"
            value={form.street}
            onChange={(event) => patch(`street`, event.target.value)}
            className="w-full rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-3 text-(--app-text) outline-none placeholder:text-(--app-text-faint)"
            placeholder="221B Baker Street"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm text-(--app-text-muted)" htmlFor="contact-city">
            City
          </label>
          <input
            id="contact-city"
            value={form.city}
            onChange={(event) => patch(`city`, event.target.value)}
            className="w-full rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-3 text-(--app-text) outline-none placeholder:text-(--app-text-faint)"
            placeholder="London"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm text-(--app-text-muted)" htmlFor="contact-state">
            State / Region
          </label>
          <input
            id="contact-state"
            value={form.state}
            onChange={(event) => patch(`state`, event.target.value)}
            className="w-full rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-3 text-(--app-text) outline-none placeholder:text-(--app-text-faint)"
            placeholder="Greater London"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm text-(--app-text-muted)" htmlFor="contact-postal-code">
            Postal code
          </label>
          <input
            id="contact-postal-code"
            value={form.postalCode}
            onChange={(event) => patch(`postalCode`, event.target.value)}
            className="w-full rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-3 text-(--app-text) outline-none placeholder:text-(--app-text-faint)"
            placeholder="NW1 6XE"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm text-(--app-text-muted)" htmlFor="contact-country">
            Country
          </label>
          <input
            id="contact-country"
            value={form.country}
            onChange={(event) => patch(`country`, event.target.value)}
            className="w-full rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-3 text-(--app-text) outline-none placeholder:text-(--app-text-faint)"
            placeholder="United Kingdom"
          />
        </div>
      </div>
      {message ? (
        <div
          className={
            message.type === `error`
              ? `mb-4 rounded-2xl border border-(--app-danger-soft) bg-(--app-danger-soft) px-4 py-3 text-sm text-(--app-danger-text)`
              : `mb-4 rounded-2xl border border-(--app-success-soft) bg-(--app-success-soft) px-4 py-3 text-sm text-(--app-success-text)`
          }
        >
          {message.text}
        </div>
      ) : null}
      <button
        type="button"
        disabled={isPending}
        onClick={onFormSubmit}
        className="mb-5 rounded-2xl bg-(--app-primary) px-4 py-3 font-medium text-(--app-text) disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? `Saving...` : editingContactId ? `Save changes` : `Add contact`}
      </button>
      {editingContactId ? (
        <button
          type="button"
          disabled={isPending}
          onClick={cancelEditing}
          className="mb-5 ml-3 rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-3 font-medium text-(--app-text-soft) disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel edit
        </button>
      ) : null}
    </>
  );
}
