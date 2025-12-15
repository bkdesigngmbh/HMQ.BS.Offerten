"use client";

import { InputHTMLAttributes, forwardRef } from 'react';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, className = '', ...props }, ref) => {
    return (
      <label className={`
        flex items-center gap-3 cursor-pointer group
        ${props.disabled ? 'cursor-not-allowed opacity-60' : ''}
        ${className}
      `}>
        <div className="relative flex items-center justify-center">
          <input
            ref={ref}
            type="checkbox"
            className="peer sr-only"
            {...props}
          />
          <div className="
            w-5 h-5
            border-2 border-gray-300 rounded
            bg-white
            transition-all duration-200
            group-hover:border-gray-400
            peer-focus-visible:ring-2 peer-focus-visible:ring-[#1e3a5f]/20 peer-focus-visible:border-[#1e3a5f]
            peer-checked:bg-[#1e3a5f] peer-checked:border-[#1e3a5f]
            peer-disabled:bg-gray-100 peer-disabled:border-gray-200
          "/>
          <svg
            className="
              absolute w-3 h-3 text-white
              opacity-0 peer-checked:opacity-100
              transition-opacity duration-200
              pointer-events-none
            "
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <span className="text-sm text-gray-700 select-none group-hover:text-gray-900 transition-colors">
          {label}
        </span>
      </label>
    );
  }
);

Checkbox.displayName = 'Checkbox';
export default Checkbox;
