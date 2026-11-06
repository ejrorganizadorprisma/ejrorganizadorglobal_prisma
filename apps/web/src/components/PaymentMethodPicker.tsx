import { Banknote, CreditCard, Landmark, QrCode, FileText, Receipt, HandCoins, CircleEllipsis, Wallet, Check } from 'lucide-react';
import { PAYMENT_METHOD_LABELS } from '../lib/payment-methods';

const ICONS: Record<string, any> = {
  PIX: QrCode,
  CASH: Banknote,
  CREDIT: HandCoins,
  CREDIT_CARD: CreditCard,
  DEBIT_CARD: CreditCard,
  BANK_TRANSFER: Landmark,
  BOLETO: Receipt,
  CHECK: FileText,
  PROMISSORY: FileText,
  OTHER: CircleEllipsis,
};

/**
 * Seletor de forma de pagamento em "chips". Mostra só as formas aceitas no
 * cadastro do cliente (allowedMethods); sem lista no cadastro, mostra todas.
 * Se o valor atual não estiver entre as opções (ex.: cadastro do cliente mudou),
 * ele aparece marcado como "fora do cadastro" para o usuário corrigir.
 */
export function PaymentMethodPicker({
  value,
  onChange,
  allowedMethods,
  creditMaxDays,
  disabled,
  label = 'Forma de pagamento',
  hint,
  required,
}: {
  value: string;
  onChange: (method: string) => void;
  allowedMethods?: string[] | null;
  creditMaxDays?: number | null;
  disabled?: boolean;
  label?: string;
  hint?: string;
  required?: boolean;
}) {
  const fromCustomer = (allowedMethods || []).length > 0;
  const options = fromCustomer ? (allowedMethods as string[]) : Object.keys(PAYMENT_METHOD_LABELS);
  const outOfList = !!value && !options.includes(value);
  const all = outOfList ? [value, ...options] : options;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 mb-1.5">
        <label className="text-sm font-medium flex items-center gap-1.5">
          <Wallet className="w-4 h-4 text-indigo-500" />
          {label}{required && ' *'}
        </label>
        <span className="text-[11px] text-gray-400 truncate">
          {fromCustomer ? 'Aceitas no cadastro do cliente' : 'Cliente sem restrição — todas liberadas'}
        </span>
      </div>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
        {all.map((m) => {
          const Icon = ICONS[m] || Wallet;
          const active = value === m;
          const invalid = outOfList && m === value;
          return (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => onChange(m)}
              title={invalid ? 'Esta forma não está no cadastro do cliente' : undefined}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium border transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                invalid
                  ? 'border-red-300 bg-red-50 text-red-700 line-through'
                  : active
                    ? 'border-indigo-500 bg-indigo-600 text-white shadow-sm'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-indigo-300 hover:text-indigo-700'
              }`}
            >
              {active && !invalid ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
              {PAYMENT_METHOD_LABELS[m] || m}
              {m === 'CREDIT' && creditMaxDays ? (
                <span className={`text-[10.5px] ${active ? 'text-indigo-100' : 'text-gray-400'}`}>· {creditMaxDays}d</span>
              ) : null}
            </button>
          );
        })}
      </div>
      {outOfList && (
        <p className="mt-1 text-xs text-red-600">A forma atual não é aceita no cadastro do cliente — escolha outra.</p>
      )}
      {hint && !outOfList && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}
