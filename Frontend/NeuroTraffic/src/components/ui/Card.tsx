import React from 'react';

export const Card: React.FC<{ children: React.ReactNode, title?: string, className?: string }> = ({ 
  children, 
  title,
  className = ''
}) => {
  return (
    <div className={`border-2 border-brand-gray bg-brand-black p-4 flex flex-col relative ${className}`}>
      {/* Brutalist accents */}
      <div className="absolute top-0 right-0 w-4 h-4 border-b-2 border-l-2 border-brand-gray -mt-0.5 -mr-0.5 bg-brand-black" />
      <div className="absolute bottom-0 left-0 w-4 h-4 border-t-2 border-r-2 border-brand-gray -mb-0.5 -ml-0.5 bg-brand-black" />
      
      {title && (
        <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-brand-white/70 mb-4 border-b-2 border-brand-gray pb-2">
          {title}
        </h3>
      )}
      <div className="flex-1 w-full h-full text-brand-white">
        {children}
      </div>
    </div>
  );
};
