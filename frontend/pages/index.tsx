// pages/index.tsx - Landing page with neighborhood selection
import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';

export default function HomePage() {
  const [selectedNeighborhood, setSelectedNeighborhood] = useState('');

  const neighborhoods = [
    { id: 'vinohrady', name: 'Vinohrady', emoji: '🌳', status: 'active', subscribers: '2,847' },
    { id: 'karlin', name: 'Karlín', emoji: '🏭', status: 'active', subscribers: '1,456' },
    { id: 'smichov', name: 'Smíchov', emoji: '🌉', status: 'active', subscribers: '892' },
    { id: 'zizkov', name: 'Žižkov', emoji: '🎭', status: 'active', subscribers: '234' },
    { id: 'dejvice', name: 'Dejvice', emoji: '🎓', status: 'coming-soon', subscribers: 'Brzy!' },
    { id: 'brevnov', name: 'Břevnov', emoji: '⛪', status: 'coming-soon', subscribers: 'Brzy!' },
  ];

  return (
    <>
      <Head>
        <title>Místní Zprávy - AI News Portal</title>
        <meta name="description" content="Denní zpravodajství z vašeho okolí pomocí AI" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
        {/* Header */}
        <header className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <div className="container mx-auto px-4 py-8">
            <div className="text-center">
              <h1 className="text-4xl md:text-6xl font-bold mb-4">
                📰 Místní Zprávy
              </h1>
              <p className="text-xl md:text-2xl text-blue-100 mb-2">
                AI-powered hyperlocal news pro Prahu
              </p>
              <p className="text-blue-200">
                Denní zpravodajství z vašeho okolí • Powered by AI • Phase 1 Ready 🚀
              </p>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-12">
          {/* Neighborhood Selection */}
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                🏠 Vyberte svou čtvrť
              </h2>
              <p className="text-xl text-gray-600">
                Získejte denní zprávy přímo z vašeho okolí
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {neighborhoods.map((neighborhood) => (
                <div
                  key={neighborhood.id}
                  className={`bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 ${
                    neighborhood.status === 'active' 
                      ? 'hover:scale-105 cursor-pointer' 
                      : 'opacity-75 cursor-not-allowed'
                  }`}
                >
                  {neighborhood.status === 'active' ? (
                    <Link href={`/${neighborhood.id}`}>
                      <div className="p-6 text-center">
                        <div className="text-4xl mb-3">{neighborhood.emoji}</div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                          {neighborhood.name}
                        </h3>
                        <p className="text-gray-600 mb-4">
                          {neighborhood.subscribers} odběratelů
                        </p>
                        <div className="inline-block px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                          ✅ Aktivní
                        </div>
                      </div>
                    </Link>
                  ) : (
                    <div className="p-6 text-center">
                      <div className="text-4xl mb-3">{neighborhood.emoji}</div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {neighborhood.name}
                      </h3>
                      <p className="text-gray-600 mb-4">
                        {neighborhood.subscribers}
                      </p>
                      <div className="inline-block px-4 py-2 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                        🚧 Připravujeme
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Quick Access */}
            <div className="text-center">
              <p className="text-gray-600 mb-4">Nebo zkuste nejpopulárnější:</p>
              <Link 
                href="/vinohrady"
                className="inline-block px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-lg"
              >
                🌳 Vinohrady - Nejaktivnější komunita
              </Link>
            </div>
          </div>

          {/* Features */}
          <div className="max-w-6xl mx-auto mt-16">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
              🤖 AI Features - Phase 1
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center p-6 bg-white rounded-xl shadow-lg">
                <div className="text-4xl mb-4">📰</div>
                <h3 className="text-xl font-bold mb-2">Smart Content</h3>
                <p className="text-gray-600">
                  AI kurátorství místních zpráv s automatickým schvalováním
                </p>
              </div>
              
              <div className="text-center p-6 bg-white rounded-xl shadow-lg">
                <div className="text-4xl mb-4">🏪</div>
                <h3 className="text-xl font-bold mb-2">Local Business</h3>
                <p className="text-gray-600">
                  Automatické objevování a marketing pro místní obchody
                </p>
              </div>
              
              <div className="text-center p-6 bg-white rounded-xl shadow-lg">
                <div className="text-4xl mb-4">🤝</div>
                <h3 className="text-xl font-bold mb-2">Community</h3>
                <p className="text-gray-600">
                  Komunitní nástěnka s AI moderováním obsahu
                </p>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="max-w-4xl mx-auto mt-16 text-center">
            <div className="bg-green-50 border border-green-200 rounded-xl p-8">
              <h3 className="text-2xl font-bold text-green-800 mb-4">
                ✅ Phase 1 - Production Ready!
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-green-700">
                <div>✅ Micro-workers deployed</div>
                <div>✅ Content management</div>
                <div>✅ Newsletter system</div>
                <div>✅ Admin dashboard</div>
                <div>✅ GDPR ready</div>
                <div>✅ Mobile responsive</div>
              </div>
              <p className="mt-4 text-green-600">
                Next: Phase 2 - AI Content Generation & Business Intelligence
              </p>
            </div>
          </div>

          {/* Admin Access */}
          <div className="max-w-2xl mx-auto mt-8 text-center">
            <Link 
              href="/admin/dashboard"
              className="inline-block px-6 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors"
            >
              🔧 Admin Dashboard
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}