// pages/[neighborhood].tsx - Neighborhood news page with client-side data fetching
import { GetStaticPaths, GetStaticProps } from 'next';
import Head from 'next/head';
import { useState, useEffect } from 'react';

interface Article {
  id: string;
  title: string;
  content: string;
  category: string;
  neighborhood: {
    id: string;
    name: string;
  };
  ai_confidence?: number;
  created_at: number;
  published_at?: number;
}

interface NewsPageProps {
  neighborhood: string;
  neighborhoodName: string;
}

export default function NewsPage({ neighborhood, neighborhoodName }: NewsPageProps) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [email, setEmail] = useState('');
  const [signupStatus, setSignupStatus] = useState('');

  // Load articles from worker
  useEffect(() => {
    const loadArticles = async () => {
      try {
        const response = await fetch(
          `${process.env.CONTENT_LIST_URL}/?neighborhood=${neighborhood}&status=published`
        );
        const data = await response.json();
        setArticles(data.articles || []);
      } catch (error) {
        console.error('Error loading articles:', error);
        // Use demo data as fallback
        setArticles([
          {
            id: 'demo-1',
            title: 'Vítejte v AI News Portal!',
            content: 'Váš hyperlocal news systém je nasazen a funkční. Micro-workers jsou připojené a zpracovávají požadavky.',
            category: 'local',
            neighborhood: { id: neighborhood, name: neighborhoodName },
            ai_confidence: 0.95,
            created_at: Date.now(),
            published_at: Date.now()
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    loadArticles();
  }, [neighborhood, neighborhoodName]);

  const categories = ['all', 'emergency', 'local', 'business', 'community'];
  
  const filteredArticles = selectedCategory === 'all' 
    ? articles 
    : articles.filter(article => article.category === selectedCategory);

  const handleNewsletterSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch(process.env.NEWSLETTER_SIGNUP_URL!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, neighborhood_id: neighborhood })
      });

      const result = await response.json();
      
      if (result.success) {
        setSignupStatus('success');
        setEmail('');
      } else {
        setSignupStatus(result.error || 'Signup failed');
      }
    } catch (error) {
      setSignupStatus('Network error');
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'emergency': return '🚨';
      case 'local': return '📍';
      case 'business': return '🏪';
      case 'community': return '🤝';
      default: return '📰';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'emergency': return 'bg-red-100 border-red-500 text-red-800';
      case 'local': return 'bg-blue-100 border-blue-500 text-blue-800';
      case 'business': return 'bg-green-100 border-green-500 text-green-800';
      case 'community': return 'bg-yellow-100 border-yellow-500 text-yellow-800';
      default: return 'bg-gray-100 border-gray-500 text-gray-800';
    }
  };

  return (
    <>
      <Head>
        <title>{`Místní Zprávy - ${neighborhoodName}`}</title>
        <meta name="description" content={`Denní zprávy z ${neighborhoodName}`} />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <div className="container mx-auto px-4 py-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold">📰 Místní Zprávy</h1>
                <p className="text-blue-200">Denní zpravodajství z {neighborhoodName}</p>
              </div>
              <div className="text-right">
                <p className="text-sm opacity-90">
                  {new Date().toLocaleDateString('cs-CZ', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              {/* Category Filter */}
              <div className="mb-6">
                <div className="flex flex-wrap gap-2">
                  {categories.map(category => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        selectedCategory === category
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-600 hover:bg-blue-50'
                      }`}
                    >
                      {category === 'all' ? '📰 Vše' : `${getCategoryIcon(category)} ${category}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Loading State */}
              {loading ? (
                <div className="bg-white rounded-lg shadow p-8 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-500">Načítání článků...</p>
                </div>
              ) : (
                /* Articles */
                <div className="space-y-6">
                  {filteredArticles.length === 0 ? (
                    <div className="bg-white rounded-lg shadow p-8 text-center">
                      <p className="text-gray-500">Žádné články zatím nebyly publikovány.</p>
                    </div>
                  ) : (
                    filteredArticles.map(article => (
                      <article key={article.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
                        <div className={`p-6 border-l-4 ${getCategoryColor(article.category)}`}>
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-lg">{getCategoryIcon(article.category)}</span>
                            <span className="text-sm font-medium uppercase tracking-wide text-gray-500">
                              {article.category}
                            </span>
                            {article.ai_confidence && article.ai_confidence > 0.8 && (
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                🤖 AI Ověřeno
                              </span>
                            )}
                          </div>
                          
                          <h2 className="text-xl font-bold text-gray-900 mb-3">
                            {article.title}
                          </h2>
                          
                          <div className="prose prose-sm max-w-none text-gray-700 mb-4">
                            {article.content.split('\n').map((paragraph, index) => (
                              <p key={index} className="mb-2">{paragraph}</p>
                            ))}
                          </div>
                          
                          <div className="text-xs text-gray-500">
                            Publikováno: {new Date(article.published_at || article.created_at).toLocaleString('cs-CZ')}
                          </div>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Newsletter Signup */}
              <div className="bg-gradient-to-br from-blue-600 to-purple-600 text-white p-6 rounded-lg">
                <h3 className="text-lg font-bold mb-2">📧 Denní newsletter</h3>
                <p className="text-blue-100 text-sm mb-4">
                  Dostávejte zprávy každé ráno v 7:30
                </p>
                
                <form onSubmit={handleNewsletterSignup} className="space-y-3">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="váš email"
                    className="w-full px-3 py-2 rounded text-gray-900 text-sm"
                    required
                  />
                  <button
                    type="submit"
                    className="w-full bg-gray-900 text-white py-2 px-4 rounded font-medium hover:bg-gray-800 transition-colors"
                  >
                    Odebírat
                  </button>
                </form>
                
                {signupStatus && (
                  <p className={`text-sm mt-2 ${
                    signupStatus === 'success' ? 'text-green-200' : 'text-red-200'
                  }`}>
                    {signupStatus === 'success' ? '✅ Úspěšně přihlášeno!' : `❌ ${signupStatus}`}
                  </p>
                )}
              </div>

              {/* Quick Stats */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="font-bold mb-4">📊 Dnes</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Nové články:</span>
                    <span className="font-medium">{articles.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Emergency:</span>
                    <span className="font-medium text-red-600">
                      {articles.filter(a => a.category === 'emergency').length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Místní zprávy:</span>
                    <span className="font-medium text-blue-600">
                      {articles.filter(a => a.category === 'local').length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Links */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="font-bold mb-4">🔗 Užitečné odkazy</h3>
                <div className="space-y-2 text-sm">
                  <a href="#" className="block text-blue-600 hover:text-blue-800">🚌 Doprava MHD</a>
                  <a href="#" className="block text-blue-600 hover:text-blue-800">🏥 Pohotovost</a>
                  <a href="#" className="block text-blue-600 hover:text-blue-800">📞 Úřad Prahy 2</a>
                  <a href="#" className="block text-blue-600 hover:text-blue-800">🚓 Policie</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const neighborhoods = ['vinohrady', 'karlin', 'smichov', 'zizkov'];
  
  const paths = neighborhoods.map((neighborhood) => ({
    params: { neighborhood }
  }));

  return {
    paths,
    fallback: false
  };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const neighborhood = params?.neighborhood as string || 'vinohrady';
  
  const neighborhoodNames: Record<string, string> = {
    'vinohrady': 'Vinohrady',
    'karlin': 'Karlín',
    'smichov': 'Smíchov',
    'zizkov': 'Žižkov'
  };

  return {
    props: {
      neighborhood,
      neighborhoodName: neighborhoodNames[neighborhood] || neighborhood
    }
  };
};