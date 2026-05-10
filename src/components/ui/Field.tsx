import { ReactNode } from 'react';

interface FieldProps {
  label: string;
  unit?: string;
  hint?: string;
  children: ReactNode;
}

export function Field({ label, unit, hint, children }: FieldProps) {
  return (
    <label className="block">
      <span className="label flex items-center justify-between">
        <span>{label}</span>
        {unit && <span className="text-gold-300/80 normal-case tracking-wider">{unit}</span>}
      </span>
      {children}
      {hint && <span className="block mt-1 text-[10px] text-white/40">{hint}</span>}
    </label>
  );
}

interface NumberInputProps {
  value: number;
  onChange: (n: number) => void;
  step?: number;
  min?: number;
  max?: number;
  placeholder?: string;
}

export function NumberInput({ value, onChange, step = 0.25, min, max, placeholder }: NumberInputProps) {
  return (
    <input
      type="number"
      step={step}
      min={min}
      max={max}
      value={Number.isFinite(value) ? value : ''}
      placeholder={placeholder}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="glass-input font-mono"
    />
  );
}

interface SelectInputProps<T extends string> {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}

export function SelectInput<T extends string>({ value, onChange, options }: SelectInputProps<T>) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="glass-input cursor-pointer"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-presbyta-900 text-white">
          {o.label}
        </option>
      ))}
    </select>
  );
}
