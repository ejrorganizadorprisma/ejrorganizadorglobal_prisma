import { useRef } from 'react';

interface QuantityInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  allowDecimals?: boolean;
}

export function QuantityInput({
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  label,
  required = false,
  disabled = false,
  placeholder = '0',
  className = '',
  allowDecimals = false,
}: QuantityInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFocus = () => {
    // Seleciona todo o conteúdo ao focar
    setTimeout(() => {
      inputRef.current?.select();
    }, 0);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;

    // Permite campo vazio temporariamente (será tratado como 0)
    if (rawValue === '') {
      onChange(0);
      return;
    }

    const newValue = allowDecimals ? parseFloat(rawValue) : parseInt(rawValue, 10);

    if (isNaN(newValue)) {
      return;
    }

    // Aplica limites
    let finalValue = newValue;
    if (min !== undefined && finalValue < min) {
      finalValue = min;
    }
    if (max !== undefined && finalValue > max) {
      finalValue = max;
    }

    onChange(finalValue);
  };

  const inputClasses = `
    w-full px-3 py-2 border border-gray-300 rounded
    focus:outline-none focus:ring-2 focus:ring-blue-500
    disabled:bg-gray-100 disabled:cursor-not-allowed
    [appearance:textfield]
    [&::-webkit-outer-spin-button]:appearance-none
    [&::-webkit-inner-spin-button]:appearance-none
    ${className}
  `.trim();

  if (label) {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <input
          ref={inputRef}
          type="number"
          value={value}
          onChange={handleChange}
          onFocus={handleFocus}
          onClick={handleFocus}
          min={min}
          max={max}
          step={step}
          required={required}
          disabled={disabled}
          placeholder={placeholder}
          className={inputClasses}
        />
      </div>
    );
  }

  return (
    <input
      ref={inputRef}
      type="number"
      value={value}
      onChange={handleChange}
      onFocus={handleFocus}
      onClick={handleFocus}
      min={min}
      max={max}
      step={step}
      required={required}
      disabled={disabled}
      placeholder={placeholder}
      className={inputClasses}
    />
  );
}

export default QuantityInput;
