export function shouldFinalizeLoginLoading(didNavigate: boolean): boolean {
  return !didNavigate;
}
