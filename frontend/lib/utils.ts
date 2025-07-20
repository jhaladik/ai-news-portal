// lib/utils.ts
// Common utility functions for the AI News Portal frontend

import { Content, APIError, ToastMessage } from './types';

// ============================================================================
// CLASS NAME UTILITIES
// ============================================================================

/**
 * Conditionally join class names (similar to clsx)
 */
export const cn = (...classes: (string | undefined | null | false)[]): string => {
  return classes.filter(Boolean).join(' ');
};

/**
 * Create conditional class names based on conditions
 */
export const conditionalClass = (
  baseClass: string,
  condition: boolean,
  trueClass: string,
  falseClass?: string
): string => {
  return cn(baseClass, condition ? trueClass : falseClass);
};

// ============================================================================
// DATE AND TIME UTILITIES
// ============================================================================

/**
 * Format Unix timestamp to readable date string
 */
export const formatDate = (timestamp: number, options: {
  includeTime?: boolean;
  relative?: boolean;
  short?: boolean;
} = {}): string => {
  const date = new Date(timestamp * 1000);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  // Return relative time if requested and recent
  if (options.relative) {
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  }

  // Format options
  const formatOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: options.short ? 'short' : 'long',
    day: 'numeric'
  };

  if (options.includeTime) {
    formatOptions.hour = 'numeric';
    formatOptions.minute = '2-digit';
    formatOptions.hour12 = true;
  }

  return date.toLocaleDateString('en-US', formatOptions);
};

/**
 * Format time duration in human readable format
 */
export const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
};

/**
 * Get time ago string
 */
export const timeAgo = (timestamp: number): string => {
  return formatDate(timestamp, { relative: true });
};

// ============================================================================
// STRING UTILITIES
// ============================================================================

/**
 * Truncate text to specified length with ellipsis
 */
export const truncateText = (text: string, maxLength: number, suffix: string = '...'): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - suffix.length) + suffix;
};

/**
 * Convert string to slug format
 */
export const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

/**
 * Capitalize first letter of each word
 */
export const capitalizeWords = (text: string): string => {
  return text.replace(/\b\w/g, (char) => char.toUpperCase());
};

/**
 * Format category names for display
 */
export const formatCategory = (category: string): string => {
  return capitalizeWords(category.replace(/_/g, ' '));
};

/**
 * Extract preview text from content
 */
export const getContentPreview = (content: string, maxLength: number = 150): string => {
  // Remove HTML tags if present
  const textOnly = content.replace(/<[^>]*>/g, '');
  return truncateText(textOnly, maxLength);
};

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate URL format
 */
export const isValidURL = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Validate password strength
 */
export const validatePassword = (password: string): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// ============================================================================
// CONTENT UTILITIES
// ============================================================================

/**
 * Get content status badge color
 */
export const getContentStatusColor = (status: string): string => {
  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800',
    ai_generated: 'bg-blue-100 text-blue-800',
    review: 'bg-yellow-100 text-yellow-800',
    published: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    failed: 'bg-red-100 text-red-800'
  };

  return statusColors[status] || 'bg-gray-100 text-gray-800';
};

/**
 * Get category color for badges
 */
export const getCategoryColor = (category: string): string => {
  const categoryColors: Record<string, string> = {
    emergency: 'bg-red-100 text-red-800',
    local: 'bg-blue-100 text-blue-800',
    business: 'bg-green-100 text-green-800',
    community: 'bg-purple-100 text-purple-800',
    events: 'bg-orange-100 text-orange-800'
  };

  return categoryColors[category] || 'bg-gray-100 text-gray-800';
};

/**
 * Sort content by priority (emergency first, then by date)
 */
export const sortContentByPriority = (content: Content[]): Content[] => {
  return [...content].sort((a, b) => {
    // Emergency content always comes first
    if (a.category === 'emergency' && b.category !== 'emergency') return -1;
    if (b.category === 'emergency' && a.category !== 'emergency') return 1;
    
    // Then sort by creation date (newest first)
    return b.created_at - a.created_at;
  });
};

/**
 * Filter content by search query
 */
export const filterContentBySearch = (content: Content[], query: string): Content[] => {
  if (!query.trim()) return content;
  
  const lowercaseQuery = query.toLowerCase();
  
  return content.filter(item =>
    item.title.toLowerCase().includes(lowercaseQuery) ||
    item.content.toLowerCase().includes(lowercaseQuery) ||
    item.neighborhood_name.toLowerCase().includes(lowercaseQuery) ||
    item.category.toLowerCase().includes(lowercaseQuery)
  );
};

// ============================================================================
// API ERROR HANDLING
// ============================================================================

/**
 * Extract user-friendly error message from API error
 */
export const getErrorMessage = (error: unknown): string => {
  if (typeof error === 'string') return error;
  
  if (error && typeof error === 'object') {
    const apiError = error as APIError;
    if (apiError.error) return apiError.error;
    if ('message' in error && typeof error.message === 'string') {
      return error.message;
    }
  }
  
  return 'An unexpected error occurred';
};

/**
 * Convert API error to toast message
 */
export const errorToToast = (error: unknown, defaultTitle: string = 'Error'): Omit<ToastMessage, 'id'> => {
  const message = getErrorMessage(error);
  
  return {
    type: 'error',
    title: defaultTitle,
    message
  };
};

/**
 * Handle common API errors with user-friendly messages
 */
export const handleAPIError = (error: APIError): string => {
  switch (error.status) {
    case 400:
      return error.details || 'Invalid request. Please check your input.';
    case 401:
      return 'You need to log in to access this feature.';
    case 403:
      return 'You do not have permission to perform this action.';
    case 404:
      return 'The requested resource was not found.';
    case 409:
      return 'This operation conflicts with existing data.';
    case 429:
      return 'Too many requests. Please try again later.';
    case 500:
      return 'Server error. Please try again later.';
    default:
      return error.error || 'An unexpected error occurred.';
  }
};

// ============================================================================
// FORMATTING UTILITIES
// ============================================================================

/**
 * Format numbers with thousands separators
 */
export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('en-US').format(num);
};

/**
 * Format percentage values
 */
export const formatPercentage = (value: number, decimals: number = 1): string => {
  return `${(value * 100).toFixed(decimals)}%`;
};

/**
 * Format confidence score for display
 */
export const formatConfidence = (confidence: number): string => {
  return formatPercentage(confidence);
};

/**
 * Format file sizes
 */
export const formatFileSize = (bytes: number): string => {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
};

// ============================================================================
// BROWSER UTILITIES
// ============================================================================

/**
 * Copy text to clipboard
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    }
  } catch {
    return false;
  }
};

/**
 * Download data as file
 */
export const downloadAsFile = (data: string, filename: string, mimeType: string = 'text/plain'): void => {
  const blob = new Blob([data], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

/**
 * Detect if user is on mobile device
 */
export const isMobile = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768;
};

/**
 * Scroll to element smoothly
 */
export const scrollToElement = (elementId: string, offset: number = 0): void => {
  const element = document.getElementById(elementId);
  if (element) {
    const elementPosition = element.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - offset;

    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth'
    });
  }
};

// ============================================================================
// DEBOUNCE AND THROTTLE
// ============================================================================

/**
 * Debounce function calls
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Throttle function calls
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// ============================================================================
// LOCAL STORAGE UTILITIES
// ============================================================================

/**
 * Safe localStorage operations with error handling
 */
export const storage = {
  get: <T>(key: string, defaultValue: T): T => {
    if (typeof window === 'undefined') return defaultValue;
    
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  },

  set: <T>(key: string, value: T): boolean => {
    if (typeof window === 'undefined') return false;
    
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },

  remove: (key: string): boolean => {
    if (typeof window === 'undefined') return false;
    
    try {
      localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  }
};