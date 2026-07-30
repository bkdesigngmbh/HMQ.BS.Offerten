"use client";

import { ButtonHTMLAttributes, forwardRef, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    children,
    variant = 'primary',
    size = 'md',
    isLoading = false,
    leftIcon,
    rightIcon,
    className = '',
    disabled,
    ...props
  }, ref) => {
    const baseStyles = `
      inline-flex items-center justify-center gap-2
      font-semibold rounded-xl
      smooth duration-200
      focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
      disabled:opacity-50 disabled:cursor-not-allowed
      disabled:shadow-none disabled:hover:translate-y-0
    `;

    // Coloured glow plus a 3px lift on hover: the shared HMQ interaction grammar
    const variants = {
      primary: `
        bg-hmq-blue text-white
        hover:bg-hmq-blue-light hover:-translate-y-[3px]
        active:bg-hmq-blue-dark active:translate-y-0
        shadow-button hover:shadow-button-hover
        focus-visible:ring-hmq-blue
      `,
      secondary: `
        bg-white text-gray-700 border border-gray-200
        hover:border-hmq-blue hover:text-hmq-blue hover:-translate-y-[3px]
        active:bg-gray-50 active:translate-y-0
        shadow-card hover:shadow-card-hover
        focus-visible:ring-hmq-blue
      `,
      ghost: `
        bg-transparent text-gray-600
        hover:bg-hmq-blue/8 hover:text-hmq-blue
        active:bg-hmq-blue/12
        focus-visible:ring-hmq-blue
      `,
      danger: `
        bg-danger text-white
        hover:bg-danger-dark hover:-translate-y-[3px]
        active:bg-danger-dark active:translate-y-0
        shadow-card hover:shadow-card-hover
        focus-visible:ring-danger
      `,
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2.5 text-sm',
      lg: 'px-6 py-3 text-base',
    };

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span>Wird generiert...</span>
          </>
        ) : (
          <>
            {leftIcon}
            {children}
            {rightIcon}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
export default Button;
