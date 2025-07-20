// components/layout/Footer.tsx
// Main footer with links, info, and newsletter signup

import React from 'react';
import { formatDate } from '../../lib/utils';

interface FooterProps {
  onNavigate?: (path: string) => void;
  className?: string;
}

const Footer: React.FC<FooterProps> = ({ onNavigate, className = '' }) => {
  const currentYear = new Date().getFullYear();

  const handleNavigation = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      window.location.href = path;
    }
  };

  const handleExternalLink = (url: string) => {
    window.open(url, '_blank', 'noopener noreferrer');
  };

  return (
    <footer className={`bg-gray-50 border-t border-gray-200 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg
                  className="h-5 w-5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3v6m0 0l-3-3m3 3l3-3"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">AI News Prague</h3>
                <p className="text-sm text-gray-600">Hyperlocal AI-curated news</p>
              </div>
            </div>
            
            <p className="text-gray-600 text-sm mb-4 max-w-md">
              Stay informed about your Prague neighborhood with AI-curated local news, 
              events, and community updates delivered directly to your inbox.
            </p>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4 text-center bg-white rounded-lg p-4 border border-gray-200">
              <div>
                <div className="text-lg font-semibold text-blue-600">8</div>
                <div className="text-xs text-gray-600">Neighborhoods</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-green-600">106</div>
                <div className="text-xs text-gray-600">News Items</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-purple-600">5+</div>
                <div className="text-xs text-gray-600">RSS Sources</div>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
              Quick Links
            </h4>
            <ul className="space-y-3">
              <li>
                <button
                  onClick={() => handleNavigation('/')}
                  className="text-gray-600 hover:text-blue-600 text-sm transition-colors"
                >
                  Home
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNavigation('/dashboard')}
                  className="text-gray-600 hover:text-blue-600 text-sm transition-colors"
                >
                  Dashboard
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNavigation('/neighborhoods')}
                  className="text-gray-600 hover:text-blue-600 text-sm transition-colors"
                >
                  Neighborhoods
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNavigation('/about')}
                  className="text-gray-600 hover:text-blue-600 text-sm transition-colors"
                >
                  About
                </button>
              </li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
              Categories
            </h4>
            <ul className="space-y-3">
              <li>
                <span className="inline-flex items-center text-gray-600 text-sm">
                  <span className="w-2 h-2 bg-red-400 rounded-full mr-2"></span>
                  Emergency
                </span>
              </li>
              <li>
                <span className="inline-flex items-center text-gray-600 text-sm">
                  <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
                  Local News
                </span>
              </li>
              <li>
                <span className="inline-flex items-center text-gray-600 text-sm">
                  <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                  Business
                </span>
              </li>
              <li>
                <span className="inline-flex items-center text-gray-600 text-sm">
                  <span className="w-2 h-2 bg-purple-400 rounded-full mr-2"></span>
                  Community
                </span>
              </li>
              <li>
                <span className="inline-flex items-center text-gray-600 text-sm">
                  <span className="w-2 h-2 bg-orange-400 rounded-full mr-2"></span>
                  Events
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Newsletter CTA */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <div className="bg-blue-50 rounded-lg p-6 text-center">
            <h4 className="text-lg font-semibold text-gray-900 mb-2">
              Stay Updated
            </h4>
            <p className="text-gray-600 text-sm mb-4">
              Get the latest news from your neighborhood delivered to your inbox
            </p>
            <button
              onClick={() => handleNavigation('/?signup=true')}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
            >
              Subscribe to Newsletter
              <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 3.26a2 2 0 001.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            {/* Copyright */}
            <div className="text-sm text-gray-600">
              © {currentYear} AI News Prague. All rights reserved.
            </div>

            {/* Links */}
            <div className="flex space-x-6">
              <button
                onClick={() => handleNavigation('/privacy')}
                className="text-sm text-gray-600 hover:text-blue-600 transition-colors"
              >
                Privacy Policy
              </button>
              <button
                onClick={() => handleNavigation('/terms')}
                className="text-sm text-gray-600 hover:text-blue-600 transition-colors"
              >
                Terms of Service
              </button>
              <button
                onClick={() => handleNavigation('/contact')}
                className="text-sm text-gray-600 hover:text-blue-600 transition-colors"
              >
                Contact
              </button>
            </div>

            {/* Social Links */}
            <div className="flex space-x-4">
              <button
                onClick={() => handleExternalLink('https://twitter.com/ainewsprague')}
                className="text-gray-400 hover:text-blue-500 transition-colors"
                aria-label="Follow on Twitter"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                </svg>
              </button>
              
              <button
                onClick={() => handleExternalLink('https://github.com/ainewsprague')}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="View on GitHub"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
              </button>
            </div>
          </div>

          {/* System Status */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-center space-x-4 text-xs text-gray-500">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span>All systems operational</span>
              </div>
              <span>•</span>
              <span>Last updated: {formatDate(Math.floor(Date.now() / 1000), { relative: true })}</span>
              <span>•</span>
              <span>Powered by Cloudflare Workers</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;