import { forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:pointer-events-none disabled:opacity-50';
    
    const variants = {
      primary: 'bg-gradient-to-r from-[#ff6600] to-[#ff944d] text-white hover:from-[#cc5200] hover:to-[#ff8533] focus-visible:ring-[#ff6600] disabled:from-gray-600 disabled:to-gray-700',
      secondary: 'bg-[#1a1a1a] text-[#ff6600] hover:bg-[#262626] focus-visible:ring-[#ff6600]',
      ghost: 'bg-transparent hover:bg-[#1a1a1a] text-[#ff6600] focus-visible:ring-[#ff6600]',
      outline: 'border border-[#333333] bg-transparent hover:bg-[#1a1a1a] focus-visible:ring-[#ff6600] text-[#ff6600] disabled:text-gray-500 disabled:border-gray-700',
    };

    const sizes = {
      sm: 'h-8 px-3 text-sm',
      md: 'h-10 px-4',
      lg: 'h-12 px-6 text-lg',
    };

    return (
      <button
        ref={ref}
        className={twMerge(
          baseStyles,
          variants[variant],
          sizes[size],
          className
        )}
        disabled={isLoading}
        {...props}
      >
        {isLoading ? (
          <span className="mr-2 animate-spin">⏳</span>
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';