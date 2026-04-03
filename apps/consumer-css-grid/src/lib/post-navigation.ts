export function submitPostNavigation(action: string): void {
  if (typeof document === `undefined`) return;

  const form = document.createElement(`form`);
  form.method = `POST`;
  form.action = action;
  form.style.display = `none`;
  document.body.appendChild(form);
  form.submit();
}
