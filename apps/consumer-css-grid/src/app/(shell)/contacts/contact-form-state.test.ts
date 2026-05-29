import { describe, expect, it } from '@jest/globals';

import { createInitialContactForm, toEditableContactForm } from './contact-form-state';

describe(`contact-form-state`, () => {
  it(`builds create-mode initial state with the prefilled email`, () => {
    expect(createInitialContactForm(true, `vendor@example.com`)).toEqual({
      email: `vendor@example.com`,
      name: ``,
      street: ``,
      city: ``,
      state: ``,
      postalCode: ``,
      country: ``,
    });
  });

  it(`hydrates edit mode from the existing contact`, () => {
    expect(
      toEditableContactForm({
        id: `contact-1`,
        email: `vendor@example.com`,
        name: `Vendor LLC`,
        address: {
          street: `221B Baker Street`,
          city: `London`,
          state: `Greater London`,
          postalCode: `NW1 6XE`,
          country: `United Kingdom`,
        },
      }),
    ).toEqual({
      email: `vendor@example.com`,
      name: `Vendor LLC`,
      street: `221B Baker Street`,
      city: `London`,
      state: `Greater London`,
      postalCode: `NW1 6XE`,
      country: `United Kingdom`,
    });
  });

  it(`resets non-create mode back to a blank editable form`, () => {
    expect(createInitialContactForm(false, `vendor@example.com`).email).toBe(``);
  });
});
