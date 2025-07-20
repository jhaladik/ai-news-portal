// components/ui/Card.tsx
// Reusable Card component for content display and panels

import React from 'react';
import { CardProps } from '../../lib/types';

const Card: React.FC<CardProps> = ({
  children,
  title,
  subtitle,
  className = '',
  padding = 'md'
}) => {
  // Base card styles
  const baseStyles = 'bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200';
  
  // Padding styles
  const paddingStyles = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };
  
  // Header padding (if title exists)
  const headerPaddingStyles = {
    none: '',
    sm: 'px-4 pt-4',
    md: 'px-6 pt-6',
    lg: 'px-8 pt-8'
  };
  
  // Content padding (when header exists)
  const contentPaddingStyles = {
    none: '',
    sm: 'px-4 pb-4',
    md: 'px-6 pb-6',
    lg: 'px-8 pb-8'
  };
  
  return (
    <div className={`${baseStyles} ${!title ? paddingStyles[padding] : ''} ${className}`}>
      {/* Card Header */}
      {title && (
        <div className={`${headerPaddingStyles[padding]} ${subtitle ? 'mb-4' : 'mb-6'}`}>
          <h3 className="text-lg font-semibold text-gray-900">
            {title}
          </h3>
          {subtitle && (
            <p className="mt-1 text-sm text-gray-600">
              {subtitle}
            </p>
          )}
        </div>
      )}
      
      {/* Card Content */}
      <div className={title ? contentPaddingStyles[padding] : ''}>
        {children}
      </div>
    </div>
  );
};

export default Card;