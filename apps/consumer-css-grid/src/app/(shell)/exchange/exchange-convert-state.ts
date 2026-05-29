import { getExchangeCurrencyOptions } from './exchange-shared';

type ConvertForm = {
  from: string;
  to: string;
  amount: string;
};

type Input = {
  balances: Record<string, number> | null;
  convertForm: ConvertForm;
  currencies: Array<{ code: string; symbol: string }>;
};

export function applyExchangeConvertFormPatch(current: ConvertForm, patch: Partial<ConvertForm>): ConvertForm {
  return { ...current, ...patch };
}

export function buildExchangeConvertState({ balances, convertForm, currencies }: Input) {
  const currencyOptions = getExchangeCurrencyOptions(currencies);
  const convertCurrenciesDiffer = convertForm.from !== convertForm.to;
  const convertAvailableBalanceMinor = balances?.[convertForm.from] ?? 0;
  const convertAmountValue = convertForm.amount.trim();
  const parsedConvertAmount = Number(convertAmountValue);
  const convertAmountValid =
    convertAmountValue !== `` && Number.isFinite(parsedConvertAmount) && parsedConvertAmount > 0;
  const requestedConvertMinorAmount = convertAmountValid ? Math.round(parsedConvertAmount * 100) : 0;
  const convertHasInsufficientFunds = convertAmountValid && requestedConvertMinorAmount > convertAvailableBalanceMinor;
  const convertFormValid = convertCurrenciesDiffer && convertAmountValid;

  return {
    convertAmountValid,
    convertAmountValue,
    convertAvailableBalanceMinor,
    convertCurrenciesDiffer,
    convertFormValid,
    convertHasInsufficientFunds,
    currencyOptions,
    parsedConvertAmount,
    requestedConvertMinorAmount,
  };
}
