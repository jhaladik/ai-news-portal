// components/ui/Loading.tsx
// Loading spinner and skeleton components for various loading states

import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

interface LoadingSkeletonProps {
  type?: 'text' | 'card' | 'avatar' | 'button';
  count?: number;
  className?: string;
}

interface LoadingPageProps {
  message?: string;
}

// Simple spinning loader
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  return (
    <div className={`animate-spin ${sizeClasses[size]} ${className}`}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
  );
};

// Skeleton loading placeholder
export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ 
  type = 'text', 
  count = 1,
  className = '' 
}) => {
  const baseClasses = 'animate-pulse bg-gray-200 rounded';
  
  const skeletonComponents = {
    text: (
      <div className={`${baseClasses} h-4 w-full ${className}`} />
    ),
    card: (
      <div className={`border border-gray-200 rounded-lg p-6 ${className}`}>
        <div className={`${baseClasses} h-6 w-2/3 mb-4`} />
        <div className={`${baseClasses} h-4 w-full mb-2`} />
        <div className={`${baseClasses} h-4 w-5/6 mb-2`} />
        <div className={`${baseClasses} h-4 w-4/5`} />
      </div>
    ),
    avatar: (
      <div className={`${baseClasses} rounded-full h-8 w-8 ${className}`} />
    ),
    button: (
      <div className={`${baseClasses} h-10 w-24 ${className}`} />
    )
  };

  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className={index > 0 ? 'mt-4' : ''}>
          {skeletonComponents[type]}
        </div>
      ))}
    </>
  );
};

// Full page loading state
export const LoadingPage: React.FC<LoadingPageProps> = ({ 
  message = 'Loading...' 
}) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <LoadingSpinner size="lg" className="text-blue-600 mb-4 mx-auto" />
        <p className="text-gray-600 text-lg">{message}</p>
      </div>
    </div>
  );
};

// Inline loading state for components
export const LoadingInline: React.FC<{ message?: string }> = ({ 
  message = 'Loading...' 
}) => {
  return (
    <div className="flex items-center justify-center py-8">
      <LoadingSpinner className="text-blue-600 mr-3" />
      <span className="text-gray-600">{message}</span>
    </div>
  );
};

// Loading overlay for buttons or sections
export const LoadingOverlay: React.FC<{ isVisible: boolean; children: React.ReactNode }> = ({
  isVisible,
  children
}) => {
  return (
    <div className="relative">
      {children}
      {isVisible && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded">
          <LoadingSpinner className="text-blue-600" />
        </div>
      )}
    </div>
  );
};

// Default export for main Loading component
const Loading: React.FC<LoadingPageProps> = LoadingPage;

export default Loading;