/* eslint-disable max-len */
import { type ChangeEvent } from 'react';

type CustomSelectProps = {
  name: string;
  value: string;
  onChange(e: ChangeEvent<HTMLSelectElement>): void;
  label: string;
  options: string[];
  optionToText?: any;
  defaultEmpty: boolean;
};

export function CustomSelect({ defaultEmpty, optionToText, options, label, name, value, onChange }: CustomSelectProps) {
  return (
    <div className="flex flex-col w-full">
      <label htmlFor={name} className="text-sm font-medium text-blue-600 mb-1">
        {label}
      </label>
      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        required
      >
        {defaultEmpty && <option defaultChecked></option>}
        {options.map((option) => (
          <option key={option} value={option}>
            {optionToText && optionToText[option] ? optionToText[option] : option}
          </option>
        ))}
      </select>
    </div>
  );
}
