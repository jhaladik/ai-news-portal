// components/auth/AuthProvider.tsx
// React context provider for authentication state management

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, LoginCredentials, LoginResponse, AuthContextType } from '../../lib/types';
import { authManager, initializeAuth } from '../../lib/auth';
import apiClient from '../../lib/api-client';
import { getErrorMessage } from '../../lib/utils';
import { useToastActions } from '../ui/Toast';

// Create Auth Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Auth Provider Props
interface AuthProviderProps {
  children: React.ReactNode;
}

// Auth Provider Component
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const { showSuccess, showError } = useToastActions();

  // Initialize authentication state
  const initializeAuthState = useCallback(() => {
    try {
      const authState = authManager.getAuthState();
      setUser(authState.user);
      setToken(authState.token);
      setIsAuthenticated(authState.isAuthenticated);
      setIsAdmin(authState.isAdmin);
    } catch (error) {
      console.error('Error initializing auth state:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Login function
  const login = useCallback(async (credentials: LoginCredentials): Promise<LoginResponse> => {
    try {
      const response = await apiClient.login(credentials);
      
      if (response.success && response.token && response.user) {
        // Update auth manager
        authManager.login(response.token, response.user);
        
        // Update local state
        setUser(response.user);
        setToken(response.token);
        setIsAuthenticated(true);
        setIsAdmin(response.user.role === 'admin');
        
        showSuccess('Welcome back!', `Signed in as ${response.user.email}`);
        
        return response;
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      showError('Login failed', errorMessage);
      throw error;
    }
  }, [showSuccess, showError]);

  // Logout function
  const logout = useCallback(() => {
    authManager.logout();
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
    setIsAdmin(false);
    showSuccess('Signed out successfully');
  }, [showSuccess]);

  // Update user data (after profile updates)
  const updateUser = useCallback((updatedUser: User) => {
    authManager.updateUser(updatedUser);
    setUser(updatedUser);
    setIsAdmin(updatedUser.role === 'admin');
  }, []);

  // Setup auth state listener
  useEffect(() => {
    // Initialize authentication
    initializeAuth();
    initializeAuthState();

    // Subscribe to auth changes
    const unsubscribe = authManager.subscribe(() => {
      const authState = authManager.getAuthState();
      setUser(authState.user);
      setToken(authState.token);
      setIsAuthenticated(authState.isAuthenticated);
      setIsAdmin(authState.isAdmin);
    });

    return unsubscribe;
  }, [initializeAuthState]);

  // Periodic token validation
  useEffect(() => {
    if (!isAuthenticated || !token) return;

    const validateToken = () => {
      authManager.checkTokenExpiration();
    };

    // Check token validity every 5 minutes
    const interval = setInterval(validateToken, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [isAuthenticated, token]);

  // Handle window focus (check auth state when user returns)
  useEffect(() => {
    const handleFocus = () => {
      if (isAuthenticated) {
        authManager.checkTokenExpiration();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isAuthenticated]);

  // Context value
  const contextValue: AuthContextType = {
    user,
    token,
    login,
    logout,
    isAuthenticated,
    isAdmin,
    loading
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Higher-order component for authentication requirements
interface WithAuthProps {
  requireAuth?: boolean;
  requireAdmin?: boolean;
  fallback?: React.ComponentType;
  redirectTo?: string;
}

export const withAuth = <P extends object>(
  Component: React.ComponentType<P>,
  options: WithAuthProps = {}
) => {
  const { requireAuth = false, requireAdmin = false, fallback: Fallback, redirectTo } = options;

  return (props: P) => {
    const { isAuthenticated, isAdmin, loading } = useAuth();

    // Show loading state
    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-b-2 border-blue-600 rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      );
    }

    // Check authentication requirements
    if (requireAuth && !isAuthenticated) {
      if (redirectTo) {
        window.location.href = redirectTo;
        return null;
      }
      
      if (Fallback) {
        return <Fallback />;
      }
      
      // Default redirect to login
      window.location.href = '/login';
      return null;
    }

    // Check admin requirements
    if (requireAdmin && !isAdmin) {
      if (redirectTo) {
        window.location.href = redirectTo;
        return null;
      }
      
      if (Fallback) {
        return <Fallback />;
      }
      
      // Default unauthorized component
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <svg className="h-12 w-12 text-red-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
            <p className="text-gray-600 mb-6">You don't have permission to access this page.</p>
            <button
              onClick={() => window.location.href = '/'}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Go Home
            </button>
          </div>
        </div>
      );
    }

    return <Component {...props} />;
  };
};

// React hooks for common auth patterns
export const useRequireAuth = (redirectTo: string = '/login') => {
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      window.location.href = redirectTo;
    }
  }, [isAuthenticated, loading, redirectTo]);

  return { isAuthenticated, loading };
};

export const useRequireAdmin = (redirectTo: string = '/') => {
  const { isAuthenticated, isAdmin, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        window.location.href = '/login';
      } else if (!isAdmin) {
        window.location.href = redirectTo;
      }
    }
  }, [isAuthenticated, isAdmin, loading, redirectTo]);

  return { isAuthenticated, isAdmin, loading };
};

// Permission checking hooks
export const usePermissions = () => {
  const { user, isAuthenticated, isAdmin } = useAuth();

  const hasPermission = useCallback((permission: string): boolean => {
    if (!isAuthenticated || !user) return false;
    
    // Admin has all permissions
    if (isAdmin) return true;
    
    // Define subscriber permissions
    const subscriberPermissions = [
      'viewDashboard',
      'managePreferences',
      'viewProfile',
      'updateProfile',
      'viewNewsletterArchive',
      'deleteAccount'
    ];
    
    return subscriberPermissions.includes(permission);
  }, [user, isAuthenticated, isAdmin]);

  const canViewContent = useCallback((neighborhoodId?: string): boolean => {
    if (!isAuthenticated || !user) return true; // Public content is viewable
    if (isAdmin) return true; // Admin can view all
    return !neighborhoodId || user.neighborhood_id === neighborhoodId;
  }, [user, isAuthenticated, isAdmin]);

  return {
    hasPermission,
    canViewContent,
    isAuthenticated,
    isAdmin,
    user
  };
};

export default AuthProvider;