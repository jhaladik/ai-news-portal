// pages/[neighborhood].tsx - Enhanced neighborhood news page with AI content
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import AIContentCard from '../components/AIContentCard';

interface NewsArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  neighborhood_id: string;
  ai_confidence?: number;
  created_by?: string;
  created_at: number;
  published_at?: number;
  status: string;
}

interface NeighborhoodStats {
  total_articles: number;
  ai_generated: number;
  published_today: number;
  avg_confidence: number;
  last_update: number;
}

export default function NeighborhoodNews() {
  const router = useRouter();
  const { neighborhood } = router.query;
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [stats, setStats] = useState<NeighborhoodStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'ai' | 'manual' | 'high-confidence'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Load neighborhood content
  useEffect(() => {
    if (!neighborhood) return;

    const loadContent = async () => {
      setLoading(true);
      try {
        // Load published articles for this neighborhood
        const response = await fetch(
          `${process.env.CONTENT_LIST_URL}/?neighborhood=${neighborhood}&status=published&limit=50`
        );
        
        if (response.ok) {
          const data = await response.json();
          setArticles(data || []);
          
          // Calculate stats
          const today = new Date().setHours(0, 0, 0, 0);
          const aiArticles = data.filter((article: NewsArticle) => 
            article.created_by?.includes('ai') || article.ai_confidence > 0
          );
          const todayArticles = data.filter((article: NewsArticle) => 
            (article.published_at || article.created_at) >= today
          );
          const avgConfidence = aiArticles.length > 0 
            ? aiArticles.reduce((sum: number, article: NewsArticle) => sum + (article.ai_confidence || 0), 0) / aiArticles.length
            : 0;

          setStats({
            total_articles: data.length,
            ai_generated: aiArticles.length,
            published_today: todayArticles.length,
            avg_confidence: avgConfidence,
            last_update: Date.now()
          });
        } else {
          // Fallback demo data
          const demoArticles: NewsArticle[] = [
            {
              id: 'demo-ai-1',
              title: 'Aktuální počasí a dopravní situace ve Vinohradech',
              content: 'Dnes ve Vinohradech očekáváme příjemné počasí s teplotami kolem 18°C. Veřejná doprava funguje bez výraznějších problémů, všechny tramvajové linky jezdí podle jízdního řádu. Pro obyvatele čtvrti doporučujeme využít krásného počasí k procházce Riegrovy sady.',
              category: 'local',
              neighborhood_id: neighborhood as string,
              ai_confidence: 0.87,
              created_by: 'ai-generate-claude',
              created_at: Date.now() - 3600000,
              published_at: Date.now() - 3600000,
              status: 'published'
            },
            {
              id: 'demo-manual-1',
              title: 'Nové dětské hřiště v Riegrových sadech',
              content: 'Městská část Praha 2 otevřela nové moderní dětské hřiště v Riegrových sadech. Hřiště nabízí bezpečné herní prvky pro děti všech věkových kategorií a je vybaveno novými lavičkami pro rodiče.',
              category: 'community',
              neighborhood_id: neighborhood as string,
              ai_confidence: 0,
              created_by: 'admin',
              created_at: Date.now() - 7200000,
              published_at: Date.now() - 7200000,
              status: 'published'
            }
          ];
          setArticles(demoArticles);
          setStats({
            total_articles: 2,
            ai_generated: 1,
            published_today: 2,
            avg_confidence: 0.87,
            last_update: Date.now()
          });
        }
      } catch (error) {
        console.error('Error loading content:', error);
      } finally {
        setLoading(false);
      }
    };

    loadContent();
  }, [neighborhood]);

  // Filter articles based on selected filters
  const filteredArticles = articles.filter(article => {
    // AI/Manual filter
    if (filter === 'ai' && (!article.created_by?.includes('ai') && article.ai_confidence === 0)) return false;
    if (filter === 'manual' && (article.created_by?.includes('ai') || article.ai_confidence > 0)) return false;
    if (filter === 'high-confidence' && article.ai_confidence < 0.8) return false;
    
    // Category filter
    if (categoryFilter !== 'all' && article.category !== categoryFilter) return false;
    
    return true;
  });

  // Get neighborhood display name
  const getNeighborhoodName = (slug: string) => {
    const names = {
      vinohrady: 'Vinohrady',
      karlin: 'Karlín',
      smichov: 'Smíchov',
      zizkov: 'Žižkov'
    };
    return names[slug as keyof typeof names] || slug;
  };

  // Get categories available
  const availableCategories = Array.from(new Set(articles.map(article => article.category)));

  if (!neighborhood) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <Head>
        <title>Místní Zprávy - {getNeighborhoodName(neighborhood as string)}</title>
        <meta name="description" content={`Aktuální zprávy a informace z ${getNeighborhoodName(neighborhood as string)}, Praha`} />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow">
          <div className="container mx-auto px-4 py-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  📍 Místní Zprávy - {getNeighborhoodName(neighborhood as string)}
                </h1>
                <p className="text-gray-600 mt-1">Aktuální informace z vaší čtvrti</p>
              </div>
              
              <div className="flex gap-3">
                <Link href="/admin/dashboard" className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
                  📋 Admin
                </Link>
                <Link href="/" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                  🏠 Domů
                </Link>
              </div>
            </div>

            {/* Stats Row */}
            {stats && (
              <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="text-2xl font-bold text-blue-600">{stats.total_articles}</div>
                  <div className="text-sm text-blue-700">Celkem článků</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className="text-2xl font-bold text-green-600">{stats.ai_generated}</div>
                  <div className="text-sm text-green-700">AI generované</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <div className="text-2xl font-bold text-purple-600">{stats.published_today}</div>
                  <div className="text-sm text-purple-700">Dnes publikováno</div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <div className="text-2xl font-bold text-yellow-600">
                    {stats.avg_confidence > 0 ? (stats.avg_confidence * 100).toFixed(0) + '%' : 'N/A'}
                  </div>
                  <div className="text-sm text-yellow-700">Průměrná AI důvěra</div>
                </div>
              </div>
            )}
          </div>
        </header>

        <div className="container mx-auto px-4 py-8">
          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h3 className="text-lg font-semibold mb-4">🔍 Filtry obsahu</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Content Source Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Zdroj obsahu</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'all', label: 'Vše', icon: '📰' },
                    { id: 'ai', label: 'AI generované', icon: '🤖' },
                    { id: 'manual', label: 'Manuální', icon: '✍️' },
                    { id: 'high-confidence', label: 'Vysoká AI důvěra', icon: '🎯' }
                  ].map(filterOption => (
                    <button
                      key={filterOption.id}
                      onClick={() => setFilter(filterOption.id as any)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        filter === filterOption.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {filterOption.icon} {filterOption.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Kategorie</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">Všechny kategorie</option>
                  {availableCategories.map(category => (
                    <option key={category} value={category}>
                      {category === 'local' ? '📍 Místní' :
                       category === 'emergency' ? '🚨 Nouzové' :
                       category === 'weather' ? '🌤️ Počasí' :
                       category === 'transport' ? '🚌 Doprava' :
                       category === 'community' ? '👥 Komunita' :
                       category === 'business' ? '💼 Business' : category}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 text-sm text-gray-600">
              Zobrazeno: {filteredArticles.length} z {articles.length} článků
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Načítání článků...</p>
            </div>
          )}

          {/* Articles Grid */}
          {!loading && (
            <>
              {filteredArticles.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-8 text-center">
                  <p className="text-gray-500 mb-4">
                    {filter === 'all' 
                      ? 'Zatím žádné články pro tuto čtvrť.'
                      : 'Žádné články nevyhovují zvoleným filtrům.'
                    }
                  </p>
                  <Link href="/admin/ai-dashboard" className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                    🤖 Generovat AI obsah
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {filteredArticles.map((article) => (
                    <AIContentCard
                      key={article.id}
                      id={article.id}
                      title={article.title}
                      content={article.content}
                      category={article.category}
                      neighborhood={getNeighborhoodName(article.neighborhood_id)}
                      ai_confidence={article.ai_confidence}
                      created_by={article.created_by}
                      created_at={article.created_at}
                      published_at={article.published_at}
                      status={article.status}
                      showAIBadge={true}
                      showActions={false}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {/* Newsletter Signup */}
          <div className="mt-12 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg shadow p-8 text-center border border-blue-200">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              📧 Odebírejte zprávy z {getNeighborhoodName(neighborhood as string)}
            </h3>
            <p className="text-gray-600 mb-6">
              Získávejte nejnovější informace ze své čtvrti přímo do emailu. 
              Kombinace AI generovaného obsahu a manuálně vybraných novinek.
            </p>
            <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                placeholder="váš@email.cz"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Odebírat
              </button>
            </form>
            <p className="text-xs text-gray-500 mt-3">
              🤖 Část obsahu je generována AI systémem s lidskou kontrolou kvality
            </p>
          </div>
        </div>
      </div>
    </>
  );
}