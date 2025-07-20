// pages/index.tsx
// Public landing page with content discovery and newsletter signup

import React, { useState, useEffect } from 'react';
import Layout, { PageWrapper } from '../components/layout/Layout';
import { Content, Neighborhood, NewsletterSignupForm } from '../lib/types';
import { useAuth } from '../components/auth/AuthProvider';
import apiClient from '../lib/api-client';
import { formatDate, formatNumber } from '../lib/utils';
import ContentList from '../components/content/ContentList';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { LoadingInline } from '../components/ui/Loading';
import { useToastActions } from '../components/ui/Toast';

const LandingPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [content, setContent] = useState<Content[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [signupForm, setSignupForm] = useState<NewsletterSignupForm>({
    email: '',
    neighborhood_id: '',
    categories: ['local', 'community', 'events']
  });
  const [subscribing, setSubscribing] = useState(false);
  
  const { showSuccess, showError } = useToastActions();

  // Check for signup parameter in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('signup') === 'true') {
      setShowSignupModal(true);
    }
  }, []);

  // Load published content
  const loadContent = async (neighborhood?: string, category?: string) => {
    setLoading(true);
    try {
      const data = await apiClient.getPublishedContent({
        neighborhood: neighborhood || undefined,
        category: category || undefined,
        limit: 20,
        status: 'published'
      });
      setContent(data.content);
    } catch (error) {
      console.error('Error loading content:', error);
      showError('Failed to load content');
    } finally {
      setLoading(false);
    }
  };

  // Handle newsletter signup
  const handleSignup = async () => {
    if (!signupForm.email || !signupForm.neighborhood_id) {
      showError('Please provide email and select a neighborhood');
      return;
    }

    setSubscribing(true);
    try {
      await apiClient.subscribeToNewsletter(signupForm);
      showSuccess('Successfully subscribed to newsletter!', 'Welcome to AI News Prague');
      setShowSignupModal(false);
      setSignupForm({
        email: '',
        neighborhood_id: '',
        categories: ['local', 'community', 'events']
      });
    } catch (error) {
      console.error('Error subscribing:', error);
      showError('Failed to subscribe to newsletter');
    } finally {
      setSubscribing(false);
    }
  };

  // Handle filter changes
  const handleNeighborhoodChange = (neighborhoodSlug: string) => {
    setSelectedNeighborhood(neighborhoodSlug);
    loadContent(neighborhoodSlug, selectedCategory);
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    loadContent(selectedNeighborhood, category);
  };

  // Toggle category in signup form
  const toggleSignupCategory = (category: string) => {
    setSignupForm(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category]
    }));
  };

  // Load initial data
  useEffect(() => {
    loadContent();
    
    // Mock neighborhoods data - would typically be loaded from API
    setNeighborhoods([
      { id: '1', name: 'Vinohrady', slug: 'vinohrady', subscriber_count: 1200, status: 'active', created_at: Date.now() },
      { id: '2', name: 'Praha 1 - Staré Město', slug: 'praha1', subscriber_count: 980, status: 'active', created_at: Date.now() },
      { id: '3', name: 'Praha 2 - Nové Město', slug: 'praha2', subscriber_count: 1450, status: 'active', created_at: Date.now() },
      { id: '4', name: 'Karlín', slug: 'karlin', subscriber_count: 890, status: 'active', created_at: Date.now() },
      { id: '5', name: 'Smíchov', slug: 'smichov', subscriber_count: 756, status: 'active', created_at: Date.now() },
      { id: '6', name: 'Holešovice', slug: 'holesovice', subscriber_count: 634, status: 'active', created_at: Date.now() },
      { id: '7', name: 'Břevnov', slug: 'brevnov', subscriber_count: 423, status: 'active', created_at: Date.now() },
      { id: '8', name: 'Dejvice', slug: 'dejvice', subscriber_count: 567, status: 'active', created_at: Date.now() }
    ]);
  }, []);

  const categories = [
    { id: 'emergency', name: 'Emergency', color: 'bg-red-500', description: 'Critical alerts and safety information' },
    { id: 'local', name: 'Local News', color: 'bg-blue-500', description: 'General neighborhood news and updates' },
    { id: 'business', name: 'Business', color: 'bg-green-500', description: 'Local business news and economic updates' },
    { id: 'community', name: 'Community', color: 'bg-purple-500', description: 'Community events and social activities' },
    { id: 'events', name: 'Events', color: 'bg-orange-500', description: 'Concerts, festivals, and cultural events' }
  ];

  return (
    <Layout 
      title="AI News Prague - Hyperlocal News for Prague Neighborhoods"
      description="Stay informed about your Prague neighborhood with AI-curated local news, events, and community updates delivered directly to your inbox."
    >
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-600 via-blue-700 to-purple-800 text-white">
        <PageWrapper maxWidth="xl" padding={false}>
          <div className="px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
            <div className="text-center">
              <h1 className="text-4xl md:text-6xl font-bold mb-6">
                Your Prague Neighborhood,
                <br />
                <span className="text-blue-200">AI-Curated</span>
              </h1>
              
              <p className="text-xl md:text-2xl text-blue-100 mb-8 max-w-3xl mx-auto">
                Get hyperlocal news, events, and community updates for your specific Prague neighborhood, 
                powered by artificial intelligence and delivered straight to your inbox.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => setShowSignupModal(true)}
                  className="bg-white text-blue-600 hover:bg-blue-50 font-semibold px-8 py-4 text-lg"
                >
                  Subscribe to Newsletter
                </Button>
                
                {!isAuthenticated && (
                  <Button
                    variant="ghost"
                    size="lg"
                    onClick={() => window.location.href = '/login'}
                    className="text-white border-white hover:bg-white hover:text-blue-600 px-8 py-4 text-lg"
                  >
                    Sign In
                  </Button>
                )}
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-3 gap-8 mt-16 pt-8 border-t border-blue-500">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-200">{neighborhoods.length}</div>
                  <div className="text-blue-100 text-sm">Neighborhoods</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-200">106+</div>
                  <div className="text-blue-100 text-sm">News Articles</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-200">
                    {formatNumber(neighborhoods.reduce((sum, n) => sum + n.subscriber_count, 0))}
                  </div>
                  <div className="text-blue-100 text-sm">Subscribers</div>
                </div>
              </div>
            </div>
          </div>
        </PageWrapper>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-gray-50">
        <PageWrapper maxWidth="xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Hyperlocal News, Powered by AI
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Our AI system automatically collects, filters, and curates news specifically for your Prague neighborhood.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">AI-Powered Curation</h3>
              <p className="text-gray-600">
                Our intelligent system automatically selects the most relevant news for your specific neighborhood.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Hyperlocal Focus</h3>
              <p className="text-gray-600">
                Get news that matters to your specific Prague neighborhood, from Vinohrady to Karlín.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 3.26a2 2 0 001.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Regular Updates</h3>
              <p className="text-gray-600">
                Choose your notification frequency - daily, weekly, or monthly newsletters delivered to your inbox.
              </p>
            </div>
          </div>
        </PageWrapper>
      </section>

      {/* Content Discovery */}
      <section className="py-16">
        <PageWrapper maxWidth="xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Latest News</h2>
              <p className="text-gray-600">
                Discover what's happening in Prague neighborhoods right now
              </p>
            </div>
            
            {isAuthenticated && (
              <Button
                variant="primary"
                onClick={() => window.location.href = '/dashboard'}
              >
                View Your Dashboard
              </Button>
            )}
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Neighborhood Filter */}
            <div>
              <Card title="Neighborhoods" padding="sm">
                <div className="space-y-2">
                  <button
                    onClick={() => handleNeighborhoodChange('')}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      selectedNeighborhood === ''
                        ? 'bg-blue-100 text-blue-800'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    All Neighborhoods
                  </button>
                  {neighborhoods.map((neighborhood) => (
                    <button
                      key={neighborhood.id}
                      onClick={() => handleNeighborhoodChange(neighborhood.slug)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        selectedNeighborhood === neighborhood.slug
                          ? 'bg-blue-100 text-blue-800'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{neighborhood.name}</span>
                        <span className="text-xs text-gray-500">
                          {formatNumber(neighborhood.subscriber_count)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </Card>

              {/* Category Filter */}
              <Card title="Categories" padding="sm" className="mt-4">
                <div className="space-y-2">
                  <button
                    onClick={() => handleCategoryChange('')}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      selectedCategory === ''
                        ? 'bg-blue-100 text-blue-800'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    All Categories
                  </button>
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => handleCategoryChange(category.id)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        selectedCategory === category.id
                          ? 'bg-blue-100 text-blue-800'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${category.color}`} />
                        <span>{category.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </Card>
            </div>

            {/* Content List */}
            <div className="lg:col-span-3">
              {loading ? (
                <LoadingInline message="Loading latest news..." />
              ) : (
                <ContentList
                  content={content}
                  loading={loading}
                  variant="default"
                  searchable={true}
                  sortable={true}
                  emptyMessage="No news found for this selection"
                  emptyAction={{
                    label: 'Subscribe for Updates',
                    onClick: () => setShowSignupModal(true)
                  }}
                />
              )}
            </div>
          </div>
        </PageWrapper>
      </section>

      {/* Newsletter CTA */}
      <section className="bg-blue-600 text-white py-16">
        <PageWrapper maxWidth="lg">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-4">
              Never Miss Local News Again
            </h2>
            <p className="text-xl text-blue-100 mb-8">
              Join thousands of Prague residents staying informed about their neighborhoods
            </p>
            <Button
              variant="primary"
              size="lg"
              onClick={() => setShowSignupModal(true)}
              className="bg-white text-blue-600 hover:bg-blue-50 font-semibold px-8 py-4 text-lg"
            >
              Subscribe for Free
            </Button>
          </div>
        </PageWrapper>
      </section>

      {/* Newsletter Signup Modal */}
      <Modal
        isOpen={showSignupModal}
        onClose={() => setShowSignupModal(false)}
        title="Subscribe to Newsletter"
        size="lg"
      >
        <div className="space-y-6">
          <div className="text-center">
            <p className="text-gray-600">
              Get hyperlocal news and updates delivered to your inbox. Choose your neighborhood and interests below.
            </p>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={signupForm.email}
              onChange={(e) => setSignupForm(prev => ({ ...prev, email: e.target.value }))}
              placeholder="your-email@example.com"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          {/* Neighborhood */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Primary Neighborhood
            </label>
            <select
              value={signupForm.neighborhood_id}
              onChange={(e) => setSignupForm(prev => ({ ...prev, neighborhood_id: e.target.value }))}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">Select your neighborhood...</option>
              {neighborhoods.map((neighborhood) => (
                <option key={neighborhood.id} value={neighborhood.id}>
                  {neighborhood.name} ({formatNumber(neighborhood.subscriber_count)} subscribers)
                </option>
              ))}
            </select>
          </div>

          {/* Categories */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Content Interests (select all that apply)
            </label>
            <div className="space-y-3">
              {categories.map((category) => (
                <label key={category.id} className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    checked={signupForm.categories.includes(category.id)}
                    onChange={() => toggleSignupCategory(category.id)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${category.color}`} />
                      <span className="text-sm font-medium text-gray-900">{category.name}</span>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">{category.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <Button
              variant="ghost"
              onClick={() => setShowSignupModal(false)}
              disabled={subscribing}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSignup}
              loading={subscribing}
              disabled={!signupForm.email || !signupForm.neighborhood_id || signupForm.categories.length === 0}
            >
              Subscribe
            </Button>
          </div>
        </div>
      </Modal>
    </Layout>
  );
};

export default LandingPage;