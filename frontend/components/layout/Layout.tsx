// components/layout/Layout.tsx
// Main layout component that wraps all pages

import React, { useEffect, useState } from 'react';
import Header from './Header';
import Footer from './Footer';
import { ToastProvider } from '../ui/Toast';
import { LoadingPage } from '../ui/Loading';
import { User, AuthContextType } from '../../lib/types';
import { authManager, initializeAuth } from '../../lib/auth';
import apiClient from '../../lib/api-client';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  showFooter?: boolean;
  fullHeight?: boolean;
  className?: string;
}

const Layout: React.FC<LayoutProps> = ({
  children,
  title,
  description,
  showFooter = true,
  fullHeight = false,
  className = ''
}) => {
  const [authState, setAuthState] = useState<{
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isAdmin: boolean;
    loading: boolean;
  }>({
    user: null,
    token: null,
    isAuthenticated: false,
    isAdmin: false,
    loading: true
  });

  // Initialize authentication on mount
  useEffect(() => {
    initializeAuth();
    
    // Get initial auth state
    const initialState = authManager.getAuthState();
    setAuthState({
      ...initialState,
      loading: false
    });

    // Subscribe to auth changes
    const unsubscribe = authManager.subscribe(() => {
      const newState = authManager.getAuthState();
      setAuthState({
        ...newState,
        loading: false
      });
    });

    return unsubscribe;
  }, []);

  // Set page title and description
  useEffect(() => {
    if (title) {
      document.title = `${title} | AI News Prague`;
    } else {
      document.title = 'AI News Prague - Hyperlocal News';
    }

    if (description) {
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute('content', description);
      } else {
        const meta = document.createElement('meta');
        meta.name = 'description';
        meta.content = description;
        document.head.appendChild(meta);
      }
    }
  }, [title, description]);

  // Handle login navigation
  const handleLogin = () => {
    window.location.href = '/login';
  };

  // Handle logout
  const handleLogout = () => {
    authManager.logout();
    window.location.href = '/';
  };

  // Handle navigation
  const handleNavigation = (path: string) => {
    window.location.href = path;
  };

  // Show loading screen while checking authentication
  if (authState.loading) {
    return <LoadingPage message="Loading..." />;
  }

  return (
    <ToastProvider>
      <div className={`min-h-screen flex flex-col ${className}`}>
        {/* Header */}
        <Header
          user={authState.user}
          isAuthenticated={authState.isAuthenticated}
          isAdmin={authState.isAdmin}
          onLogin={handleLogin}
          onLogout={handleLogout}
          onNavigate={handleNavigation}
        />

        {/* Main Content */}
        <main className={`flex-1 ${fullHeight ? 'flex flex-col' : ''}`}>
          {children}
        </main>

        {/* Footer */}
        {showFooter && (
          <Footer onNavigate={handleNavigation} />
        )}
      </div>
    </ToastProvider>
  );
};

// Higher-order component for pages that require authentication
interface AuthenticatedLayoutProps extends LayoutProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  fallback?: React.ReactNode;
}

export const AuthenticatedLayout: React.FC<AuthenticatedLayoutProps> = ({
  children,
  requireAdmin = false,
  fallback,
  ...layoutProps
}) => {
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      const { isAuthenticated, isAdmin } = authManager.getAuthState();
      
      if (!isAuthenticated) {
        // Redirect to login
        window.location.href = '/login';
        return;
      }
      
      if (requireAdmin && !isAdmin) {
        // Redirect to unauthorized page or home
        window.location.href = '/';
        return;
      }
      
      setIsAuthorized(true);
      setAuthChecked(true);
    };

    // Small delay to ensure auth state is loaded
    const timer = setTimeout(checkAuth, 100);
    return () => clearTimeout(timer);
  }, [requireAdmin]);

  if (!authChecked) {
    return <LoadingPage message="Checking authentication..." />;
  }

  if (!isAuthorized) {
    return fallback || <LoadingPage message="Redirecting..." />;
  }

  return (
    <Layout {...layoutProps}>
      {children}
    </Layout>
  );
};

// Higher-order component for admin-only pages
export const AdminLayout: React.FC<LayoutProps> = (props) => {
  return (
    <AuthenticatedLayout {...props} requireAdmin={true}>
      {props.children}
    </AuthenticatedLayout>
  );
};

// Page wrapper with common layout patterns
interface PageWrapperProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  actions?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  padding?: boolean;
}

export const PageWrapper: React.FC<PageWrapperProps> = ({
  children,
  title,
  subtitle,
  breadcrumbs,
  actions,
  maxWidth = 'xl',
  padding = true
}) => {
  const maxWidthClasses = {
    sm: 'max-w-2xl',
    md: 'max-w-4xl',
    lg: 'max-w-6xl',
    xl: 'max-w-7xl',
    '2xl': 'max-w-screen-2xl',
    full: 'max-w-none'
  };

  return (
    <div className={`${maxWidthClasses[maxWidth]} mx-auto ${padding ? 'px-4 sm:px-6 lg:px-8 py-8' : ''}`}>
      {/* Page Header */}
      {(title || subtitle || breadcrumbs || actions) && (
        <div className="mb-8">
          {/* Breadcrumbs */}
          {breadcrumbs && breadcrumbs.length > 0 && (
            <nav className="mb-4">
              <ol className="flex items-center space-x-2 text-sm text-gray-500">
                {breadcrumbs.map((crumb, index) => (
                  <li key={index} className="flex items-center">
                    {index > 0 && (
                      <svg className="h-4 w-4 mx-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                    {crumb.href ? (
                      <a
                        href={crumb.href}
                        className="hover:text-gray-700 transition-colors"
                      >
                        {crumb.label}
                      </a>
                    ) : (
                      <span className={index === breadcrumbs.length - 1 ? 'text-gray-900 font-medium' : ''}>
                        {crumb.label}
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          )}

          {/* Title and Actions */}
          <div className="flex items-center justify-between">
            <div>
              {title && (
                <h1 className="text-3xl font-bold text-gray-900">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="mt-2 text-lg text-gray-600">
                  {subtitle}
                </p>
              )}
            </div>
            {actions && (
              <div className="flex-shrink-0">
                {actions}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Page Content */}
      {children}
    </div>
  );
};

// Error boundary for layout
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class LayoutErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Layout Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Something went wrong
            </h1>
            <p className="text-gray-600 mb-6">
              We're sorry, but there was an error loading the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default Layout;