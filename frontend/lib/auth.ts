// lib/auth.ts
// Authentication utilities for JWT token management and user state

import { User } from './types';

const TOKEN_KEY = 'ai_news_token';
const USER_KEY = 'ai_news_user';

// JWT payload interface
interface JWTPayload {
  userId: string;
  email: string;
  role: 'subscriber' | 'admin';
  neighborhood_id: string;
  exp: number;
  iat: number;
}

// ============================================================================
// TOKEN MANAGEMENT
// ============================================================================

export const tokenStorage = {
  get: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
  },

  set: (token: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(TOKEN_KEY, token);
  },

  remove: (): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(TOKEN_KEY);
  }
};

export const userStorage = {
  get: (): User | null => {
    if (typeof window === 'undefined') return null;
    const userData = localStorage.getItem(USER_KEY);
    if (!userData) return null;
    
    try {
      return JSON.parse(userData) as User;
    } catch {
      return null;
    }
  },

  set: (user: User): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  remove: (): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(USER_KEY);
  }
};

// ============================================================================
// JWT UTILITIES
// ============================================================================

/**
 * Decode JWT payload without verification
 * Note: This is for client-side role checking only. Server still validates tokens.
 */
export const decodeJWT = (token: string): JWTPayload | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded) as JWTPayload;
  } catch {
    return null;
  }
};

/**
 * Check if JWT token is expired
 */
export const isTokenExpired = (token: string): boolean => {
  const payload = decodeJWT(token);
  if (!payload) return true;

  const currentTime = Math.floor(Date.now() / 1000);
  return payload.exp < currentTime;
};

/**
 * Get user role from JWT token
 */
export const getUserRoleFromToken = (token: string): 'subscriber' | 'admin' | null => {
  const payload = decodeJWT(token);
  return payload?.role || null;
};

/**
 * Get user ID from JWT token
 */
export const getUserIdFromToken = (token: string): string | null => {
  const payload = decodeJWT(token);
  return payload?.userId || null;
};

// ============================================================================
// AUTHENTICATION STATE MANAGEMENT
// ============================================================================

export class AuthManager {
  private static instance: AuthManager;
  private listeners: (() => void)[] = [];

  static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  // Subscribe to auth state changes
  subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Notify all listeners of auth state change
  private notify(): void {
    this.listeners.forEach(listener => listener());
  }

  // Get current authentication state
  getAuthState(): {
    isAuthenticated: boolean;
    user: User | null;
    token: string | null;
    isAdmin: boolean;
  } {
    const token = tokenStorage.get();
    const user = userStorage.get();

    // Check if token exists and is not expired
    const isAuthenticated = Boolean(token && !isTokenExpired(token) && user);
    const isAdmin = isAuthenticated && user?.role === 'admin';

    return {
      isAuthenticated,
      user,
      token,
      isAdmin
    };
  }

  // Login user
  login(token: string, user: User): void {
    tokenStorage.set(token);
    userStorage.set(user);
    this.notify();
  }

  // Logout user
  logout(): void {
    tokenStorage.remove();
    userStorage.remove();
    this.notify();
  }

  // Update user data (after profile updates)
  updateUser(user: User): void {
    userStorage.set(user);
    this.notify();
  }

  // Check if user has admin privileges
  isAdmin(): boolean {
    const { isAuthenticated, user } = this.getAuthState();
    return isAuthenticated && user?.role === 'admin';
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return this.getAuthState().isAuthenticated;
  }

  // Get current user
  getCurrentUser(): User | null {
    return this.getAuthState().user;
  }

  // Get current token
  getCurrentToken(): string | null {
    return this.getAuthState().token;
  }

  // Auto-logout on token expiration
  checkTokenExpiration(): void {
    const token = tokenStorage.get();
    if (token && isTokenExpired(token)) {
      this.logout();
    }
  }
}

// Export singleton instance
export const authManager = AuthManager.getInstance();

// ============================================================================
// AUTHENTICATION HELPERS
// ============================================================================

/**
 * Redirect to login page if not authenticated
 */
export const requireAuth = (redirectTo: string = '/login'): boolean => {
  if (typeof window === 'undefined') return false;
  
  const { isAuthenticated } = authManager.getAuthState();
  
  if (!isAuthenticated) {
    window.location.href = redirectTo;
    return false;
  }
  
  return true;
};

/**
 * Redirect to unauthorized page if not admin
 */
export const requireAdmin = (redirectTo: string = '/'): boolean => {
  if (typeof window === 'undefined') return false;
  
  const { isAuthenticated, isAdmin } = authManager.getAuthState();
  
  if (!isAuthenticated) {
    window.location.href = '/login';
    return false;
  }
  
  if (!isAdmin) {
    window.location.href = redirectTo;
    return false;
  }
  
  return true;
};

/**
 * Get authorization headers for API requests
 */
export const getAuthHeaders = (): Record<string, string> => {
  const token = authManager.getCurrentToken();
  
  if (!token) {
    return {};
  }
  
  return {
    Authorization: `Bearer ${token}`
  };
};

/**
 * Handle API authentication errors
 */
export const handleAuthError = (error: any): void => {
  // If we get a 401 (Unauthorized), logout the user
  if (error && error.status === 401) {
    authManager.logout();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }
};

/**
 * Format user display name
 */
export const getUserDisplayName = (user: User | null): string => {
  if (!user) return 'Guest';
  return user.name || user.email.split('@')[0];
};

/**
 * Check if user belongs to specific neighborhood
 */
export const userBelongsToNeighborhood = (user: User | null, neighborhoodId: string): boolean => {
  return user?.neighborhood_id === neighborhoodId;
};

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize auth manager - call this on app startup
 */
export const initializeAuth = (): void => {
  // Check token expiration on initialization
  authManager.checkTokenExpiration();
  
  // Set up periodic token expiration check (every 5 minutes)
  if (typeof window !== 'undefined') {
    setInterval(() => {
      authManager.checkTokenExpiration();
    }, 5 * 60 * 1000); // 5 minutes
  }
};

// ============================================================================
// ROLE-BASED ACCESS CONTROL
// ============================================================================

export const permissions = {
  // Public permissions (no auth required)
  public: {
    viewPublishedContent: true,
    subscribeToNewsletter: true
  },
  
  // Subscriber permissions
  subscriber: {
    viewDashboard: true,
    managePreferences: true,
    viewProfile: true,
    updateProfile: true,
    viewNewsletterArchive: true,
    deleteAccount: true
  },
  
  // Admin permissions (includes all subscriber permissions)
  admin: {
    // Content management
    viewAllContent: true,
    createContent: true,
    editContent: true,
    deleteContent: true,
    approveContent: true,
    
    // User management
    viewAllUsers: true,
    viewUserAnalytics: true,
    
    // System management
    viewAdminDashboard: true,
    managePipeline: true,
    manageRSSSources: true,
    viewAnalytics: true,
    
    // Newsletter management
    createNewsletter: true,
    sendNewsletter: true,
    viewNewsletterHistory: true,
    
    // System control
    controlPipeline: true,
    viewSystemHealth: true
  }
};

/**
 * Check if user has specific permission
 */
export const hasPermission = (user: User | null, permission: string): boolean => {
  if (!user) {
    return permissions.public[permission as keyof typeof permissions.public] || false;
  }
  
  const userPermissions = user.role === 'admin' 
    ? { ...permissions.subscriber, ...permissions.admin }
    : permissions.subscriber;
    
  return userPermissions[permission as keyof typeof userPermissions] || false;
};

/**
 * React hook for checking permissions
 */
export const usePermission = (permission: string): boolean => {
  const user = authManager.getCurrentUser();
  return hasPermission(user, permission);
};