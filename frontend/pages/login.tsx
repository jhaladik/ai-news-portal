// pages/login.tsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../components/layout/Layout';
import { AuthManager } from '../lib/auth';
import apiClient from '../lib/api-client';

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  const authManager = new AuthManager();

  useEffect(() => {
    // Redirect if already logged in
    if (authManager.isAuthenticated()) {
      if (authManager.isAdmin()) {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError(''); // Clear error when user types
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Use API client to authenticate
      const result = await apiClient.login({
        email: formData.email,
        password: formData.password
      });
      
      if (result.token && result.user) {
        // Store in auth manager
        authManager.login(result.token, result.user);
        
        // Redirect based on user role
        if (result.user.role === 'admin') {
          router.push('/admin');
        } else {
          router.push('/dashboard');
        }
      } else {
        setError('Login failed. Please try again.');
      }
    } catch (error) {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(process.env.AUTH_REGISTER_URL!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          neighborhood_id: 'vinohrady' // Default neighborhood
        })
      });

      const result = await response.json();

      if (response.ok) {
        // Auto-login after successful registration
        const loginResult = await apiClient.login({
          email: formData.email,
          password: formData.password
        });
        
        if (loginResult.token && loginResult.user) {
          authManager.login(loginResult.token, loginResult.user);
          router.push('/dashboard');
        }
      } else {
        setError(result.error || 'Registration failed. Please try again.');
      }
    } catch (error) {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout showFooter={false}>
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-blue-600 mb-2">
              🏙️ Praha Local News
            </h1>
            <h2 className="text-xl text-gray-900">
              {isRegistering ? 'Create Your Account' : 'Welcome Back'}
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {isRegistering 
                ? 'Join thousands of neighbors getting AI-curated local news'
                : 'Sign in to your personalized news dashboard'
              }
            </p>
          </div>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow-lg sm:rounded-lg sm:px-10 border">
            <form onSubmit={isRegistering ? handleRegister : handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <div className="mt-1">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="your.email@example.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <div className="mt-1">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete={isRegistering ? "new-password" : "current-password"}
                    required
                    value={formData.password}
                    onChange={handleInputChange}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder={isRegistering ? "Create a strong password" : "Enter your password"}
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-md bg-red-50 p-4 border border-red-200">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <span className="text-red-400">⚠️</span>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">
                        {error}
                      </h3>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {isRegistering ? 'Creating Account...' : 'Signing In...'}
                    </div>
                  ) : (
                    isRegistering ? 'Create Account' : 'Sign In'
                  )}
                </button>
              </div>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">
                    {isRegistering ? 'Already have an account?' : "Don&apos;t have an account?"}
                  </span>
                </div>
              </div>

              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsRegistering(!isRegistering);
                    setError('');
                    setFormData({ email: '', password: '' });
                  }}
                  className="w-full text-center text-sm text-blue-600 hover:text-blue-500 font-medium"
                >
                  {isRegistering ? 'Sign in to existing account' : 'Create a new account'}
                </button>
              </div>
            </div>

            {/* Demo Credentials */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h4 className="text-xs font-semibold text-gray-700 mb-2">Demo Credentials:</h4>
              <div className="text-xs text-gray-600 space-y-1">
                <div>
                  <strong>Admin:</strong> admin@praha.local / admin123
                </div>
                <div>
                  <strong>User:</strong> user@praha.local / user123
                </div>
              </div>
            </div>
          </div>

          {/* Return to Public Site */}
          <div className="mt-6 text-center">
            <Link href="/" className="text-sm text-blue-600 hover:text-blue-500">
              ← Back to news feed
            </Link>
          </div>
        </div>

        {/* Features Preview */}
        <div className="mt-12 max-w-3xl mx-auto px-4">
          <div className="text-center mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Why join Praha Local News?
            </h3>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl mb-3">🤖</div>
              <h4 className="font-semibold text-gray-900">AI-Curated</h4>
              <p className="text-sm text-gray-600 mt-1">
                Smart algorithms filter through hundreds of sources to bring you only relevant local news
              </p>
            </div>
            
            <div className="text-center">
              <div className="text-3xl mb-3">📍</div>
              <h4 className="font-semibold text-gray-900">Hyperlocal</h4>
              <p className="text-sm text-gray-600 mt-1">
                News specifically for your Prague neighborhood - never miss what affects you
              </p>
            </div>
            
            <div className="text-center">
              <div className="text-3xl mb-3">📧</div>
              <h4 className="font-semibold text-gray-900">Personalized</h4>
              <p className="text-sm text-gray-600 mt-1">
                Daily newsletters tailored to your interests and delivery preferences
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}