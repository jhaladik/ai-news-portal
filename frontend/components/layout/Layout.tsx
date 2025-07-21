// components/layout/Layout.tsx
// Main layout component that wraps all pages

import React, { useEffect, useState } from 'react';
import Header from './Header';
import Footer from './Footer';
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
  );
};

// PageWrapper component for consistent content width and spacing
interface PageWrapperProps {
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  padding?: boolean;
  className?: string;
}

export const PageWrapper: React.FC<PageWrapperProps> = ({
  children,
  maxWidth = 'xl',
  padding = true,
  className = ''
}) => {
  const maxWidthClasses = {
    sm: 'max-w-screen-sm',
    md: 'max-w-screen-md',
    lg: 'max-w-screen-lg',
    xl: 'max-w-screen-xl',
    '2xl': 'max-w-screen-2xl',
    full: 'max-w-full'
  };

  const paddingClasses = padding ? 'px-4 sm:px-6 lg:px-8' : '';

  return (
    <div className={`mx-auto ${paddingClasses} ${maxWidthClasses[maxWidth]} ${className}`}>
      {children}
    </div>
  );
};

// Higher-order component for pages that require authentication
interface AuthenticatedLayoutProps extends LayoutProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  fallback?: React.ComponentType;
  redirectTo?: string;
}

export const AuthenticatedLayout: React.FC<AuthenticatedLayoutProps> = ({
  children,
  requireAdmin = false,
  fallback: FallbackComponent,
  redirectTo = '/login',
  ...layoutProps
}) => {
  const [authState, setAuthState] = useState<{
    user: User | null;
    isAuthenticated: boolean;
    isAdmin: boolean;
    loading: boolean;
  }>({
    user: null,
    isAuthenticated: false,
    isAdmin: false,
    loading: true
  });

  useEffect(() => {
    const checkAuth = () => {
      const state = authManager.getAuthState();
      setAuthState({
        ...state,
        loading: false
      });

      // Redirect if not authenticated
      if (!state.isAuthenticated) {
        window.location.href = redirectTo;
        return;
      }

      // Redirect if admin required but user is not admin
      if (requireAdmin && !state.isAdmin) {
        window.location.href = '/';
        return;
      }
    };

    initializeAuth();
    checkAuth();

    const unsubscribe = authManager.subscribe(checkAuth);
    return unsubscribe;
  }, [requireAdmin, redirectTo]);

  if (authState.loading) {
    return <LoadingPage message="Checking authentication..." />;
  }

  if (!authState.isAuthenticated) {
    return FallbackComponent ? <FallbackComponent /> : null;
  }

  if (requireAdmin && !authState.isAdmin) {
    return FallbackComponent ? <FallbackComponent /> : null;
  }

  return (
    <Layout {...layoutProps}>
      {children}
    </Layout>
  );
};

export default Layout;