// pages/_app.tsx
import type { AppProps } from 'next/app';
import { AuthProvider } from '../components/auth/AuthProvider';
import { ToastProvider } from '../components/ui/Toast';
import '../styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ToastProvider>
      <AuthProvider>
        <Component {...pageProps} />
      </AuthProvider>
    </ToastProvider>
  );
}