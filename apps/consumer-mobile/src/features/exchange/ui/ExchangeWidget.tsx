'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { AmountCurrencyInput } from '../../../shared/ui/AmountCurrencyInput';
import { Button } from '../../../shared/ui/Button';
import { getExchangeQuote, executeExchange } from '../actions';

interface Currency {
  code: string;
  symbol: string;
  name?: string;
}

interface Balance {
  currency: string;
  amountCents: number;
  symbol: string;
}

interface ExchangeQuote {
  from: string;
  to: string;
  rate: number;
  amountFrom: number;
  amountTo: number;
  timestamp: string;
  expiresAt?: string;
}

interface ExchangeWidgetProps {
  availableCurrencies: Currency[];
  balances?: Balance[];
}

export function ExchangeWidget({ availableCurrencies, balances }: ExchangeWidgetProps) {
  const router = useRouter();
  const [fromCurrency, setFromCurrency] = useState(`USD`);
  const [toCurrency, setToCurrency] = useState(`EUR`);
  const [amount, setAmount] = useState(``);
  const [quote, setQuote] = useState<ExchangeQuote | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleGetQuote = async () => {
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
  };

  const convertedAmount = quote ? quote.amountTo : 0;

  const getBalanceForCurrency = (currency: string): number => {
    const balance = balances?.find((b) => b.currency === currency);
    return balance ? balance.amountCents / 100 : 0;
  };

  return (
    <div
      className="
        overflow-hidden
        rounded-xl
        border
        border-slate-200
        bg-white
        shadow-sm
        dark:border-slate-700
        dark:bg-slate-800
      "
    >
      <div
        className="
          border-b
          border-slate-200
          bg-slate-50
          px-4
          py-3
          dark:border-slate-700
          dark:bg-slate-800/50
        "
      >
        <h3
          className="
            text-lg
            font-semibold
            text-slate-900
            dark:text-white
          "
        >
          Exchange currency
        </h3>
        <p
          className="
            mt-1
            text-xs
            text-slate-600
            dark:text-slate-400
          "
        >
          Convert between currencies at live exchange rates
        </p>
      </div>

      <div
        className="
          space-y-4
          p-4
        "
      >
        <div>
          <div
            className="
              mb-1.5
              flex
              items-center
              justify-between
            "
          >
            <label
              className="
                block
                text-sm
                font-medium
                text-slate-900
                dark:text-white
              "
            >
              From
            </label>
            <span
              className="
                text-xs
                text-slate-500
                dark:text-slate-400
              "
            >
              Available: {getBalanceForCurrency(fromCurrency).toFixed(2)} {fromCurrency}
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

        <div
          className="
            flex
            justify-center
          "
        >
          <button
            onClick={handleSwapCurrencies}
            className="
              min-h-[44px]
              min-w-[44px]
              rounded-full
              bg-slate-100
              p-2
              text-slate-600
              transition-all
              hover:rotate-180
              hover:bg-slate-200
              focus:outline-none
              focus:ring-2
              focus:ring-primary-500
              dark:bg-slate-700
              dark:text-slate-400
              dark:hover:bg-slate-600
            "
            aria-label="Swap currencies"
          >
            <svg
              className="
                h-5
                w-5
                transition-transform
                duration-300
              "
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
              />
            </svg>
          </button>
        </div>

        <div>
          <label
            className="
              mb-1.5
              block
              text-sm
              font-medium
              text-slate-900
              dark:text-white
            "
          >
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
            className="
              rounded-lg
              bg-blue-50
              p-3
              dark:bg-blue-900/20
            "
          >
            <div
              className="
                flex
                items-center
                justify-between
              "
            >
              <span
                className="
                  text-xs
                  font-medium
                  text-blue-900
                  dark:text-blue-300
                "
              >
                Exchange rate
              </span>
              <span
                className="
                  text-sm
                  font-bold
                  text-blue-900
                  dark:text-blue-300
                "
              >
                1 {fromCurrency} = {quote.rate.toFixed(4)} {toCurrency}
              </span>
            </div>
            <p
              className="
                mt-1
                text-xs
                text-blue-700
                dark:text-blue-400
              "
            >
              Updated {new Date(quote.timestamp).toLocaleTimeString()}
            </p>
          </div>
        )}

        {success && (
          <div
            className="
              rounded-lg
              bg-green-50
              p-3
              dark:bg-green-900/20
            "
          >
            <p
              className="
                text-sm
                text-green-800
                dark:text-green-300
              "
            >
              {success}
            </p>
          </div>
        )}

        {error && (
          <div
            className="
              rounded-lg
              bg-red-50
              p-3
              dark:bg-red-900/20
            "
          >
            <p
              className="
                text-sm
                text-red-800
                dark:text-red-300
              "
            >
              {error}
            </p>
          </div>
        )}

        <div
          className="
            flex
            gap-2
            pt-2
          "
        >
          <Button
            variant="outline"
            size="md"
            onClick={handleGetQuote}
            isLoading={isLoading}
            disabled={!amount || parseFloat(amount) <= 0}
            className="
              flex-1
            "
          >
            Get quote
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleExchange}
            isLoading={isLoading}
            disabled={!amount || parseFloat(amount) <= 0}
            className="
              flex-1
            "
          >
            {quote ? `Exchange now` : `Get quote`}
          </Button>
        </div>
      </div>
    </div>
  );
}
