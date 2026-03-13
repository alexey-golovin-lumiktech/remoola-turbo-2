'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { type IConsumerExchangeBalance, type IConsumerExchangeQuote } from '@remoola/api-types';

import { getErrorMessageForUser, getLocalToastMessage, localToastKeys } from '../../../lib/error-messages';
import { showErrorToast } from '../../../lib/toast.client';
import { AmountCurrencyInput } from '../../../shared/ui/AmountCurrencyInput';
import { Button } from '../../../shared/ui/Button';
import { CheckIcon } from '../../../shared/ui/icons/CheckIcon';
import { ClockIcon } from '../../../shared/ui/icons/ClockIcon';
import { CurrencyDollarIcon } from '../../../shared/ui/icons/CurrencyDollarIcon';
import { ExchangeIcon } from '../../../shared/ui/icons/ExchangeIcon';
import { getExchangeQuote, executeExchange } from '../actions';
import styles from './ExchangeWidget.module.css';

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
  const [success, setSuccess] = useState<string | null>(null);

  const isSameCurrency = fromCurrency === toCurrency;

  const handleGetQuote = async () => {
    if (isSameCurrency) {
      showErrorToast(`Please select different source and target currencies`);
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      showErrorToast(`Please enter a valid amount`);
      return;
    }

    setIsLoading(true);
    setSuccess(null);

    const result = await getExchangeQuote(fromCurrency, toCurrency, parseFloat(amount));

    if (!result.ok) {
      showErrorToast(
        getErrorMessageForUser(result.error.code, getLocalToastMessage(localToastKeys.CONVERSION_FAILED)),
        { code: result.error.code },
      );
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
    setSuccess(null);

    const idempotencyKey = `exchange-${Date.now()}-${Math.random()}`;
    const result = await executeExchange(fromCurrency, toCurrency, parseFloat(amount), idempotencyKey);

    if (!result.ok) {
      showErrorToast(
        getErrorMessageForUser(result.error.code, getLocalToastMessage(localToastKeys.CONVERSION_FAILED)),
        { code: result.error.code },
      );
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
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.headerRow}>
          <div className={styles.headerIconWrap}>
            <ExchangeIcon className={styles.headerIcon} strokeWidth={2} />
          </div>
          <div className={styles.headerText}>
            <h3 className={styles.headerTitle}>Exchange currency</h3>
            <p className={styles.headerSubtitle}>Convert between currencies at live exchange rates</p>
          </div>
        </div>
      </div>

      <div className={styles.body}>
        <div>
          <div className={styles.fieldRow}>
            <label className={styles.fieldLabel}>
              <CurrencyDollarIcon className={styles.fieldLabelIcon} strokeWidth={2} />
              From
            </label>
            <span className={styles.availableLabel}>
              Available:{` `}
              <span className={styles.availableValue}>
                {getBalanceForCurrency(fromCurrency).toFixed(2)} {fromCurrency}
              </span>
            </span>
          </div>
          <AmountCurrencyInput
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setQuote(null);
              setSuccess(null);
            }}
            currency={fromCurrency}
            onCurrencyChange={(curr) => {
              setFromCurrency(curr);
              setQuote(null);
              setSuccess(null);
            }}
            availableCurrencies={availableCurrencies}
            placeholder="0.00"
          />
        </div>

        <div className={styles.swapWrap}>
          <button onClick={handleSwapCurrencies} className={styles.swapBtn} aria-label="Swap currencies">
            <ExchangeIcon className={styles.swapIcon} strokeWidth={2.5} />
          </button>
        </div>

        <div>
          <label className={styles.toLabel}>
            <CurrencyDollarIcon className={styles.fieldLabelIcon} strokeWidth={2} />
            To
          </label>
          <AmountCurrencyInput
            value={convertedAmount > 0 ? convertedAmount.toFixed(2) : ``}
            currency={toCurrency}
            onCurrencyChange={(curr) => {
              setToCurrency(curr);
              setQuote(null);
              setSuccess(null);
            }}
            availableCurrencies={availableCurrencies}
            placeholder="0.00"
            readOnly
            disabled
          />
        </div>

        {quote ? (
          <div className={styles.quoteBox}>
            <div className={styles.quoteRow}>
              <span className={styles.quoteLabel}>Exchange rate</span>
              <span className={styles.quoteValue}>
                1 {fromCurrency} = {quote.rate.toFixed(4)} {toCurrency}
              </span>
            </div>
            <div className={styles.quoteMeta}>
              <ClockIcon className={styles.quoteMetaIcon} />
              <p className={styles.quoteMetaText}>
                {(() => {
                  const date = quote.timestamp ? new Date(quote.timestamp) : new Date();
                  const timeLabel = Number.isNaN(date.getTime()) ? `just now` : date.toLocaleTimeString();
                  return `Updated ${timeLabel}`;
                })()}
              </p>
            </div>
          </div>
        ) : null}

        {success ? (
          <div className={styles.successBox}>
            <div className={styles.successRow}>
              <div className={styles.successIconWrap}>
                <CheckIcon className={styles.successIcon} strokeWidth={3} />
              </div>
              <p className={styles.successText}>{success}</p>
            </div>
          </div>
        ) : null}

        <div className={styles.actions}>
          {quote ? (
            <>
              <Button
                variant="outline"
                size="md"
                onClick={handleGetQuote}
                isLoading={isLoading}
                disabled={!amount || parseFloat(amount) <= 0 || isSameCurrency}
                className={styles.actionBtn}
              >
                Get new quote
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleExchange}
                isLoading={isLoading}
                disabled={!amount || parseFloat(amount) <= 0 || isSameCurrency}
                className={styles.actionBtn}
              >
                Exchange now
              </Button>
            </>
          ) : (
            <Button
              variant="primary"
              size="md"
              onClick={handleExchange}
              isLoading={isLoading}
              disabled={!amount || parseFloat(amount) <= 0 || isSameCurrency}
              className={styles.actionBtn}
            >
              Get quote
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
