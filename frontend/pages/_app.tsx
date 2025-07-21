// pages/_app.tsx - Fixed version with proper auth initialization
import type { AppProps } from 'next/app';
import { useEffect } from 'react';
import { AuthProvider } from '../components/auth/AuthProvider';
import { ToastProvider } from '../components/ui/Toast';
import { initializeAuth } from '../lib/auth';
import '../styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    // Initialize auth manager on app startup
    initializeAuth();
    
    // Debug logging for diagnostics
    console.log('🚀 App initialized');
    console.log('🔧 AuthManager available:', typeof (window as any).authManager !== 'undefined');
    console.log('🔧 Token helper available:', typeof (window as any).getToken !== 'undefined');
    
    // Log environment status
    console.log('🌍 Environment variables:');
    console.log('- AUTH_LOGIN_URL:', process.env.AUTH_LOGIN_URL);
    console.log('- USER_PROFILE_URL:', process.env.USER_PROFILE_URL);
    console.log('- USER_DASHBOARD_URL:', process.env.USER_DASHBOARD_URL);
    
  }, []);

  return (
    <ToastProvider>
      <AuthProvider>
        <Component {...pageProps} />
      </AuthProvider>
    </ToastProvider>
  );
}