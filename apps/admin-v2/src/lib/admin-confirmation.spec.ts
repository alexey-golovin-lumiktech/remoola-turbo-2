import { parseConfirmedFormValue } from './admin-confirmation';

describe(`parseConfirmedFormValue`, () => {
  it(`returns true for checked checkbox semantics with hidden fallback`, () => {
    const formData = new FormData();
    formData.append(`confirmed`, `false`);
    formData.append(`confirmed`, `true`);

    expect(parseConfirmedFormValue(formData)).toBe(true);
  });

  it(`returns true for standard checkbox browser value`, () => {
    const formData = new FormData();
    formData.append(`confirmed`, `on`);

    expect(parseConfirmedFormValue(formData)).toBe(true);
  });

  it(`returns true when the submitter contributes the explicit confirmation signal`, () => {
    const formData = new FormData();
    formData.append(`confirmed`, `false`);
    formData.append(`confirmedSubmit`, `true`);

    expect(parseConfirmedFormValue(formData, [`confirmed`, `confirmedSubmit`])).toBe(true);
  });

  it(`returns false when confirmation was not checked`, () => {
    const formData = new FormData();
    formData.append(`confirmed`, `false`);

    expect(parseConfirmedFormValue(formData)).toBe(false);
  });
});
