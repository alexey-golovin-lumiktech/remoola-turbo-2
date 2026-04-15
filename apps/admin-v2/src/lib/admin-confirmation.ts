const TRUTHY_FORM_VALUES = new Set([`true`, `on`, `1`, `yes`]);

export function parseConfirmedFormValue(formData: FormData, fieldNames: string | string[] = `confirmed`): boolean {
  const names = Array.isArray(fieldNames) ? fieldNames : [fieldNames];
  const values = names
    .flatMap((fieldName) => formData.getAll(fieldName))
    .map((value) => (typeof value === `string` ? value.trim().toLowerCase() : ``))
    .filter(Boolean);

  return values.some((value) => TRUTHY_FORM_VALUES.has(value));
}
