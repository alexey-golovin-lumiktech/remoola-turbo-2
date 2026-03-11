'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import type { IConsumerExchangeBalance, IConsumerExchangeQuote } from '@remoola/api-types';

import { AmountCurrencyInput } from '../../../shared/ui/AmountCurrencyInput';
import { Button } from '../../../shared/ui/Button';
import { AlertTriangleIcon } from '../../../shared/ui/icons/AlertTriangleIcon';
import { CheckIcon } from '../../../shared/ui/icons/CheckIcon';
import { ClockIcon } from '../../../shared/ui/icons/ClockIcon';
import { CurrencyDollarIcon } from '../../../shared/ui/icons/CurrencyDollarIcon';
import { ExchangeIcon } from '../../../shared/ui/icons/ExchangeIcon';
import { getExchangeQuote, executeExchange } from '../actions';

interface Currency {
  code: string;
  symbol: string;
  name?: string;
}

interface ExchangeWidgetProps {
  availableCurrencies: Currency[];
  balances?: IConsumerExchangeBalance[];
}

export function ExchangeWidget({ availableCurrencies, balances }: ExchangeWidgetProps) {
  const router = useRouter();
  const [fromCurrency, setFromCurrency] = useState(`USD`);
  const [toCurrency, setToCurrency] = useState(`EUR`);
  const [amount, setAmount] = useState(``);
  const [quote, setQuote] = useState<IConsumerExchangeQuote | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isSameCurrency = fromCurrency === toCurrency;

  const handleGetQuote = async () => {
    if (isSameCurrency) {
      setError(`Please select different source and target currencies`);
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      setError(`Please enter a valid amount`);
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    const result = await getExchangeQuote(fromCurrency, toCurrency, parseFloat(amount));

    if (!result.ok) {
      setError(result.error.message);
      setQuote(null);
      setIsLoading(false);
      return;
    }

    setQuote(result.data);
    setIsLoading(false);
  };

  const handleExchange = async () => {
    if (!quote) {
      await handleGetQuote();
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    const idempotencyKey = `exchange-${Date.now()}-${Math.random()}`;
    const result = await executeExchange(fromCurrency, toCurrency, parseFloat(amount), idempotencyKey);

    if (!result.ok) {
      setError(result.error.message);
      setIsLoading(false);
      return;
    }

    setSuccess(`Exchange completed successfully!`);
    setAmount(``);
    setQuote(null);
    setIsLoading(false);

    router.refresh();
  };

  const handleSwapCurrencies = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
    setQuote(null);
    setError(null);
  };

  const convertedAmount = quote ? quote.amountTo : 0;

  const getBalanceForCurrency = (currency: string): number => {
    const balance = balances?.find((b) => b.currency === currency);
    return balance ? balance.amountCents / 100 : 0;
  };

  return (
    <div
      className={`
      overflow-hidden
      rounded-2xl
      border
      border-slate-700
      bg-slate-800/90
      shadow-xl
      transition-all
      duration-300
      hover:shadow-2xl
    `}
    >
      <div
        className={`
        border-b
        border-slate-700
        bg-linear-to-br
        from-slate-800
        to-slate-900
        px-5
        py-4
      `}
      >
        <div className={`flex items-start gap-3`}>
          <div
            className={`
            flex
            h-10
            w-10
            items-center
            justify-center
            rounded-xl
            bg-linear-to-br
            from-primary-500
            to-primary-600
            shadow-lg
          `}
          >
            <ExchangeIcon className={`h-5 w-5 text-white`} strokeWidth={2} />
          </div>
          <div className={`flex-1`}>
            <h3 className={`text-lg font-bold text-slate-100`}>Exchange currency</h3>
            <p
              className={`
              mt-0.5
              text-xs
              font-medium
              text-slate-400
            `}
            >
              Convert between currencies at live exchange rates
            </p>
          </div>
        </div>
      </div>

      <div className={`space-y-5 p-5`}>
        <div>
          <div
            className={`
            mb-2
            flex
            items-center
            justify-between
          `}
          >
            <label
              className={`
              flex
              items-center
              gap-1.5
              text-sm
              font-bold
              text-slate-200
            `}
            >
              <CurrencyDollarIcon className={`h-4 w-4 text-slate-400`} strokeWidth={2} />
              From
            </label>
            <span className={`text-xs font-semibold text-slate-400`}>
              Available:{` `}
              <span className={`text-slate-300`}>
                {getBalanceForCurrency(fromCurrency).toFixed(2)} {fromCurrency}
              </span>
            </span>
          </div>
          <AmountCurrencyInput
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setQuote(null);
              setError(null);
              setSuccess(null);
            }}
            currency={fromCurrency}
            onCurrencyChange={(curr) => {
              setFromCurrency(curr);
              setQuote(null);
              setError(null);
              setSuccess(null);
            }}
            availableCurrencies={availableCurrencies}
            placeholder="0.00"
            error={!!error}
          />
        </div>

        <div className={`flex justify-center`}>
          <button
            onClick={handleSwapCurrencies}
            className={`
              group
              flex
              min-h-12
              min-w-12
              items-center
              justify-center
              rounded-2xl
              bg-linear-to-br
              from-slate-700
              to-slate-800
              p-3
              text-slate-300
              shadow-lg
              transition-all
              duration-300
              hover:from-primary-600
              hover:to-primary-700
              hover:text-white
              hover:shadow-xl
              hover:scale-110
              focus:outline-hidden
              focus:ring-2
              focus:ring-primary-500
              focus:ring-offset-2
              focus:ring-offset-slate-800
              active:scale-95
            `}
            aria-label="Swap currencies"
          >
            <ExchangeIcon
              className={`
                h-6
                w-6
                transition-transform
                duration-500
                group-hover:rotate-180
              `}
              strokeWidth={2.5}
            />
          </button>
        </div>

        <div>
          <label
            className={`
            mb-2
            flex
            items-center
            gap-1.5
            text-sm
            font-bold
            text-slate-200
          `}
          >
            <CurrencyDollarIcon className={`h-4 w-4 text-slate-400`} strokeWidth={2} />
            To
          </label>
          <AmountCurrencyInput
            value={convertedAmount > 0 ? convertedAmount.toFixed(2) : ``}
            currency={toCurrency}
            onCurrencyChange={(curr) => {
              setToCurrency(curr);
              setQuote(null);
              setError(null);
              setSuccess(null);
            }}
            availableCurrencies={availableCurrencies}
            placeholder="0.00"
            readOnly
            disabled
          />
        </div>

        {quote && (
          <div
            className={`
            animate-slideDown
            rounded-xl
            border
            border-blue-700
            bg-linear-to-br
            from-blue-900/50
            to-blue-800/30
            p-4
            shadow-lg
          `}
          >
            <div
              className={`
              flex
              items-center
              justify-between
              mb-2
            `}
            >
              <span className={`text-sm font-bold text-blue-300`}>Exchange rate</span>
              <span className={`text-base font-extrabold text-blue-200`}>
                1 {fromCurrency} = {quote.rate.toFixed(4)} {toCurrency}
              </span>
            </div>
            <div className={`flex items-center gap-1.5`}>
              <ClockIcon className={`h-3.5 w-3.5 text-blue-400`} />
              <p className={`text-xs font-medium text-blue-300`}>
                {(() => {
                  const date = quote.timestamp ? new Date(quote.timestamp) : new Date();
                  const timeLabel = Number.isNaN(date.getTime()) ? `just now` : date.toLocaleTimeString();
                  return `Updated ${timeLabel}`;
                })()}
              </p>
            </div>
          </div>
        )}

        {success && (
          <div
            className={`
            animate-slideDown
            rounded-xl
            border
            border-green-700
            bg-linear-to-br
            from-green-900/50
            to-green-800/30
            p-4
            shadow-lg
          `}
          >
            <div className={`flex items-start gap-3`}>
              <div
                className={`
                flex
                h-8
                w-8
                shrink-0
                items-center
                justify-center
                rounded-full
                bg-green-500
              `}
              >
                <CheckIcon className={`h-5 w-5 text-white`} strokeWidth={3} />
              </div>
              <p className={`text-sm font-semibold text-green-200`}>{success}</p>
            </div>
          </div>
        )}

        {error && (
          <div
            className={`
            animate-slideDown
            rounded-xl
            border
            border-red-700
            bg-linear-to-br
            from-red-900/50
            to-red-800/30
            p-4
            shadow-lg
          `}
          >
            <div className={`flex items-start gap-3`}>
              <div
                className={`
                flex
                h-8
                w-8
                shrink-0
                items-center
                justify-center
                rounded-full
                bg-red-500
              `}
              >
                <AlertTriangleIcon className={`h-5 w-5 text-white`} strokeWidth={2} />
              </div>
              <p className={`text-sm font-semibold text-red-200`}>{error}</p>
            </div>
          </div>
        )}

        <div
          className={`
          grid
          grid-cols-2
          gap-3
          pt-2
        `}
        >
          <Button
            variant="outline"
            size="md"
            onClick={handleGetQuote}
            isLoading={isLoading}
            disabled={!amount || parseFloat(amount) <= 0 || isSameCurrency}
            className={`min-h-12 font-bold`}
          >
            Get quote
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleExchange}
            isLoading={isLoading}
            disabled={!amount || parseFloat(amount) <= 0 || isSameCurrency}
            className={`min-h-12 font-bold`}
          >
            {quote ? `Exchange now` : `Get quote`}
          </Button>
        </div>
      </div>
    </div>
  );
}
