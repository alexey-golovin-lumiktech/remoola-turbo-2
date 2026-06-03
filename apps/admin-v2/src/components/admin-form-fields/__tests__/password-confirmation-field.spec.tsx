import { describe, expect, it } from '@jest/globals';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { PasswordConfirmationField } from '../password-confirmation-field';

describe(`PasswordConfirmationField`, () => {
  it(`renders a label wrapping a span and a password input`, () => {
    const markup = renderToStaticMarkup(<PasswordConfirmationField />);

    expect(markup).toContain(`Current password`);
    expect(markup).toContain(`name="passwordConfirmation"`);
    expect(markup).toContain(`type="password"`);
    expect(markup).toContain(`autoComplete="current-password"`);
    expect(markup).toContain(`placeholder="Confirm with your current password"`);
  });

  it(`includes the required attribute`, () => {
    const markup = renderToStaticMarkup(<PasswordConfirmationField />);
    expect(markup).toContain(`required`);
  });

  it(`does not render a disabled attribute when called with default props`, () => {
    const markup = renderToStaticMarkup(<PasswordConfirmationField />);
    expect(markup).not.toContain(`disabled`);
  });

  it(`renders disabled attribute when disabled={true}`, () => {
    const markup = renderToStaticMarkup(<PasswordConfirmationField disabled={true} />);
    expect(markup).toContain(`disabled`);
  });
});
