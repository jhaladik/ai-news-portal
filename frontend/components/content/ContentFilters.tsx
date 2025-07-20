// components/content/ContentFilters.tsx
// Advanced filtering component for content with neighborhoods, categories, and status

import React, { useState, useEffect } from 'react';
import { type ContentFilters, Neighborhood } from '../../lib/types';
import { CATEGORIES, CONTENT_STATUSES } from '../../lib/types';
import { formatCategory, capitalizeWords } from '../../lib/utils';
import Button from '../ui/Button';
import Card from '../ui/Card';

interface ContentFiltersProps {
  filters: ContentFilters;
  neighborhoods: Neighborhood[];
  onFiltersChange: (filters: ContentFilters) => void;
  showStatus?: boolean;
  showAdvanced?: boolean;
  variant?: 'sidebar' | 'horizontal' | 'compact';
  className?: string;
}

const ContentFilters: React.FC<ContentFiltersProps> = ({
  filters,
  neighborhoods = [],
  onFiltersChange,
  showStatus = false,
  showAdvanced = false,
  variant = 'sidebar',
  className = ''
}) => {
  const [localFilters, setLocalFilters] = useState<ContentFilters>(filters);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasActiveFilters, setHasActiveFilters] = useState(false);

  // Update local filters when props change
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  // Check if there are active filters
  useEffect(() => {
    const active = !!(
      localFilters.neighborhood ||
      localFilters.category ||
      localFilters.status
    );
    setHasActiveFilters(active);
  }, [localFilters]);

  // Handle filter changes
  const updateFilter = (key: keyof ContentFilters, value: string | undefined) => {
    const newFilters = {
      ...localFilters,
      [key]: value || undefined
    };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  // Clear all filters
  const clearFilters = () => {
    const clearedFilters: ContentFilters = {};
    setLocalFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  // Get active filter count
  const getActiveFilterCount = () => {
    let count = 0;
    if (localFilters.neighborhood) count++;
    if (localFilters.category) count++;
    if (localFilters.status) count++;
    return count;
  };

  // Render filter section
  const renderFilterSection = () => (
    <>
      {/* Neighborhood Filter */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          Neighborhood
        </label>
        <select
          value={localFilters.neighborhood || ''}
          onChange={(e) => updateFilter('neighborhood', e.target.value)}
          className="block w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">All Neighborhoods</option>
          {neighborhoods.map((neighborhood) => (
            <option key={neighborhood.id} value={neighborhood.slug}>
              {neighborhood.name}
            </option>
          ))}
        </select>
      </div>

      {/* Category Filter */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          Category
        </label>
        <div className="space-y-2">
          {variant === 'horizontal' ? (
            <select
              value={localFilters.category || ''}
              onChange={(e) => updateFilter('category', e.target.value)}
              className="block w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {formatCategory(category)}
                </option>
              ))}
            </select>
          ) : (
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="category"
                  value=""
                  checked={!localFilters.category}
                  onChange={(e) => updateFilter('category', e.target.value)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">All Categories</span>
              </label>
              {CATEGORIES.map((category) => (
                <label key={category} className="flex items-center">
                  <input
                    type="radio"
                    name="category"
                    value={category}
                    checked={localFilters.category === category}
                    onChange={(e) => updateFilter('category', e.target.value)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    {formatCategory(category)}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Status Filter (Admin only) */}
      {showStatus && (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Status
          </label>
          <select
            value={localFilters.status || ''}
            onChange={(e) => updateFilter('status', e.target.value)}
            className="block w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Statuses</option>
            {CONTENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {capitalizeWords(status.replace('_', ' '))}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Clear Filters */}
      {hasActiveFilters && (
        <div className="pt-4 border-t border-gray-200">
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="w-full"
          >
            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Clear All Filters
          </Button>
        </div>
      )}
    </>
  );

  // Render based on variant
  if (variant === 'horizontal') {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {renderFilterSection()}
        </div>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={className}>
        {/* Mobile Toggle */}
        <div className="md:hidden mb-4">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full"
          >
            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
            </svg>
            Filters
            {hasActiveFilters && (
              <span className="ml-2 bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs">
                {getActiveFilterCount()}
              </span>
            )}
          </Button>
        </div>

        {/* Filters Content */}
        <div className={`md:block ${isExpanded ? 'block' : 'hidden'}`}>
          <Card padding="sm">
            <div className="space-y-4">
              {renderFilterSection()}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Default sidebar variant
  return (
    <div className={className}>
      <Card title="Filters" padding="md">
        <div className="space-y-6">
          {renderFilterSection()}
        </div>
      </Card>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <Card className="mt-4" padding="sm">
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-900">Active Filters</h4>
            <div className="space-y-1">
              {localFilters.neighborhood && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Neighborhood:</span>
                  <span className="font-medium">
                    {neighborhoods.find(n => n.slug === localFilters.neighborhood)?.name || localFilters.neighborhood}
                  </span>
                </div>
              )}
              {localFilters.category && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Category:</span>
                  <span className="font-medium">{formatCategory(localFilters.category)}</span>
                </div>
              )}
              {localFilters.status && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Status:</span>
                  <span className="font-medium">{capitalizeWords(localFilters.status.replace('_', ' '))}</span>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Filter Statistics */}
      {showAdvanced && (
        <Card className="mt-4" padding="sm">
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-900">Statistics</h4>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-lg font-semibold text-blue-600">{neighborhoods.length}</div>
                <div className="text-xs text-gray-600">Neighborhoods</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-green-600">{CATEGORIES.length}</div>
                <div className="text-xs text-gray-600">Categories</div>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default ContentFilters;