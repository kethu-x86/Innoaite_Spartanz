import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'alert' | 'ghost' | 'outline';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  variant = 'primary', 
  children, 
  className = '', 
  ...props 
}) => {
  const baseClass = "px-4 py-2 border-2 uppercase font-mono tracking-widest text-sm transition-all relative font-bold before:absolute before:inset-0 before:-z-10 before:translate-x-1 before:translate-y-1 before:transition-transform hover:before:translate-x-0 hover:before:translate-y-0";
  
  const variants = {
    primary: "border-brand-white text-brand-black bg-brand-white before:bg-brand-green hover:text-brand-black",
    alert: "border-brand-red text-brand-white bg-brand-red before:bg-brand-black hover:text-brand-white",
    ghost: "border-brand-gray text-brand-gray hover:border-brand-white hover:text-brand-white before:bg-transparent",
    outline: "border-brand-gray text-brand-white hover:border-brand-white hover:text-brand-black hover:bg-brand-white before:bg-transparent"
  };

  return (
    <button 
      className={`${baseClass} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
