"use client";

import { InputHTMLAttributes, forwardRef } from "react";

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, className = "", id, ...props }, ref) => {
    const checkboxId = id || props.name;

    return (
      <label
        htmlFor={checkboxId}
        className={`flex items-center gap-2 cursor-pointer ${className}`}
      >
        <input
          ref={ref}
          type="checkbox"
          id={checkboxId}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          {...props}
        />
        <span className="text-sm text-gray-700">{label}</span>
      </label>
    );
  }
);

Checkbox.displayName = "Checkbox";

export default Checkbox;
