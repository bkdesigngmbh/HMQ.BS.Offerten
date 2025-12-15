import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = '', required, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        <label className="flex items-center gap-1 text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-accent">*</span>}
        </label>
        <input
          ref={ref}
          className={`
            w-full px-4 py-2.5
            bg-white border border-gray-200 rounded-lg
            text-gray-900 text-sm
            placeholder:text-gray-400
            transition-all duration-200
            hover:border-gray-300
            focus:border-[#1e3a5f] focus:ring-2 focus:ring-[#1e3a5f]/10 focus:outline-none
            disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
            ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : ''}
            ${className}
          `}
          {...props}
        />
        {hint && !error && (
          <p className="text-xs text-gray-500">{hint}</p>
        )}
        {error && (
          <p className="text-xs text-red-600 flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
