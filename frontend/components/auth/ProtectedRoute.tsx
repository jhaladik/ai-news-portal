// components/auth/ProtectedRoute.tsx
// Route protection component for authentication and authorization

import React, { useEffect, useState } from 'react';
import { useAuth } from './AuthProvider';
import { LoadingPage } from '../ui/Loading';
import Button from '../ui/Button';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireAdmin?: boolean;
  requireVerified?: boolean;
  fallback?: React.ReactNode;
  loadingComponent?: React.ReactNode;
  unauthorizedComponent?: React.ReactNode;
  redirectTo?: string;
  onUnauthorized?: () => void;
  className?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAuth = true,
  requireAdmin = false,
  requireVerified = false,
  fallback,
  loadingComponent,
  unauthorizedComponent,
  redirectTo,
  onUnauthorized,
  className = ''
}) => {
  const { user, isAuthenticated, isAdmin, loading } = useAuth();
  const [shouldRender, setShouldRender] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  // Check access permissions
  useEffect(() => {
    if (loading) return;

    const checkAccess = () => {
      // No auth required
      if (!requireAuth) {
        setShouldRender(true);
        return;
      }

      // Auth required but not authenticated
      if (requireAuth && !isAuthenticated) {
        handleUnauthorized('/login');
        return;
      }

      // Admin required but not admin
      if (requireAdmin && !isAdmin) {
        handleUnauthorized('/');
        return;
      }

      // Verification required but not verified
      if (requireVerified && user && !user.verified) {
        handleUnauthorized('/verify-email');
        return;
      }

      // All checks passed
      setShouldRender(true);
    };

    checkAccess();
  }, [
    loading,
    isAuthenticated,
    isAdmin,
    user,
    requireAuth,
    requireAdmin,
    requireVerified
  ]);

  // Handle unauthorized access
  const handleUnauthorized = (defaultRedirect: string) => {
    if (onUnauthorized) {
      onUnauthorized();
      return;
    }

    const redirect = redirectTo || defaultRedirect;
    
    if (redirect) {
      setRedirecting(true);
      // Small delay to show loading state
      setTimeout(() => {
        window.location.href = redirect;
      }, 100);
    }
  };

  // Loading state
  if (loading || redirecting) {
    if (loadingComponent) {
      return <>{loadingComponent}</>;
    }
    
    return (
      <LoadingPage 
        message={redirecting ? 'Redirecting...' : 'Checking permissions...'} 
      />
    );
  }

  // Not authorized
  if (!shouldRender) {
    if (unauthorizedComponent) {
      return <>{unauthorizedComponent}</>;
    }

    if (fallback) {
      return <>{fallback}</>;
    }

    // Default unauthorized component
    return <UnauthorizedComponent />;
  }

  // Authorized - render children
  return <div className={className}>{children}</div>;
};

// Default unauthorized component
const UnauthorizedComponent: React.FC = () => {
  const { isAuthenticated, isAdmin } = useAuth();

  const getTitle = () => {
    if (!isAuthenticated) return 'Authentication Required';
    if (!isAdmin) return 'Access Denied';
    return 'Unauthorized';
  };

  const getMessage = () => {
    if (!isAuthenticated) {
      return 'Please sign in to access this page.';
    }
    if (!isAdmin) {
      return 'You need administrator privileges to access this page.';
    }
    return 'You do not have permission to access this page.';
  };

  const getAction = () => {
    if (!isAuthenticated) {
      return {
        label: 'Sign In',
        onClick: () => window.location.href = '/login'
      };
    }
    return {
      label: 'Go Home',
      onClick: () => window.location.href = '/'
    };
  };

  const action = getAction();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
        {/* Icon */}
        <div className="mb-6">
          {!isAuthenticated ? (
            <svg className="h-16 w-16 text-blue-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          ) : (
            <svg className="h-16 w-16 text-red-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          )}
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          {getTitle()}
        </h1>

        {/* Message */}
        <p className="text-gray-600 mb-8">
          {getMessage()}
        </p>

        {/* Action Button */}
        <div className="space-y-4">
          <Button
            variant="primary"
            size="lg"
            onClick={action.onClick}
            className="w-full"
          >
            {action.label}
          </Button>

          {/* Secondary action */}
          {!isAuthenticated && (
            <Button
              variant="ghost"
              size="md"
              onClick={() => window.location.href = '/'}
              className="w-full"
            >
              Continue as Guest
            </Button>
          )}
        </div>

        {/* Help Text */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            Need help? <a href="/contact" className="text-blue-600 hover:text-blue-500">Contact support</a>
          </p>
        </div>
      </div>
    </div>
  );
};

// Specific route protection components for common patterns
export const AuthenticatedRoute: React.FC<Omit<ProtectedRouteProps, 'requireAuth'>> = (props) => (
  <ProtectedRoute {...props} requireAuth={true} />
);

export const AdminRoute: React.FC<Omit<ProtectedRouteProps, 'requireAuth' | 'requireAdmin'>> = (props) => (
  <ProtectedRoute {...props} requireAuth={true} requireAdmin={true} />
);

export const VerifiedRoute: React.FC<Omit<ProtectedRouteProps, 'requireAuth' | 'requireVerified'>> = (props) => (
  <ProtectedRoute {...props} requireAuth={true} requireVerified={true} />
);

// HOC for protecting components
export const withProtection = <P extends object>(
  Component: React.ComponentType<P>,
  protectionOptions: Omit<ProtectedRouteProps, 'children'>
) => {
  return (props: P) => (
    <ProtectedRoute {...protectionOptions}>
      <Component {...props} />
    </ProtectedRoute>
  );
};

// Hook for checking route access
export const useRouteAccess = (requirements: {
  requireAuth?: boolean;
  requireAdmin?: boolean;
  requireVerified?: boolean;
}) => {
  const { user, isAuthenticated, isAdmin, loading } = useAuth();
  const [hasAccess, setHasAccess] = useState(false);
  const [checkComplete, setCheckComplete] = useState(false);

  useEffect(() => {
    if (loading) return;

    const {
      requireAuth = false,
      requireAdmin = false,
      requireVerified = false
    } = requirements;

    let access = true;

    if (requireAuth && !isAuthenticated) access = false;
    if (requireAdmin && !isAdmin) access = false;
    if (requireVerified && user && !user.verified) access = false;

    setHasAccess(access);
    setCheckComplete(true);
  }, [loading, isAuthenticated, isAdmin, user, requirements]);

  return {
    hasAccess,
    checkComplete,
    loading,
    isAuthenticated,
    isAdmin,
    user
  };
};

export default ProtectedRoute;