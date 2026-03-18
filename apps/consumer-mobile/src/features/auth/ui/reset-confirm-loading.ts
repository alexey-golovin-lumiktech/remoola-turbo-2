export function shouldFinalizeResetConfirmLoading(didNavigate: boolean): boolean {
  return !didNavigate;
}
