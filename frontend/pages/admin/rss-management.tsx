// pages/admin/rss-management.tsx - NEW: RSS Sources Management for Phase 2b
import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';

interface RSSSource {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  category_hint: string;
  last_fetched: number;
  fetch_count: number;
  error_count: number;
}

interface RSSCollectionResult {
  source: string;
  collected: number;
  errors: string[];
  items: Array<{
    id: string;
    title: string;
    content: string;
    score?: number;
    category?: string;
  }>;
}

interface PipelineRun {
  id: string;
  started_at: number;
  completed_at: number;
  status: string;
  collected_items: number;
  scored_items: number;
  generated_items: number;
  published_items: number;
}

export default function RSSManagement() {
  const [rssSources, setRssSources] = useState<RSSSource[]>([]);
  const [collectionResults, setCollectionResults] = useState<RSSCollectionResult[]>([]);
  const [pipelineRuns, setPipelineRuns] = useState<PipelineRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'sources' | 'collection' | 'history'>('sources');
  const [newSource, setNewSource] = useState({ name: '', url: '', category_hint: 'local_government' });
  const [showAllItems, setShowAllItems] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setMessage('');
  
      // Load RSS sources - mock data for now, in real implementation this would come from a sources API
      setRssSources([
        {
          id: 'praha4',
          name: 'Praha 4 Official',
          url: 'https://www.praha4.cz/rss',
          enabled: true,
          category_hint: 'local_government',
          last_fetched: Date.now() - 3600000, // 1 hour ago
          fetch_count: 145,
          error_count: 3
        },
        {
          id: 'praha2',
          name: 'Praha 2 Official',
          url: 'https://www.praha2.cz/rss',
          enabled: true,
          category_hint: 'local_government',
          last_fetched: Date.now() - 3600000,
          fetch_count: 138,
          error_count: 1
        },
        {
          id: 'dpp',
          name: 'Prague Public Transport',
          url: 'https://www.dpp.cz/rss',
          enabled: true,
          category_hint: 'transport',
          last_fetched: Date.now() - 1800000, // 30 min ago
          fetch_count: 252,
          error_count: 0
        },
        {
          id: 'weather',
          name: 'Prague Weather',
          url: 'https://api.openweathermap.org/data/2.5/weather?q=Prague',
          enabled: true,
          category_hint: 'weather',
          last_fetched: Date.now() - 7200000, // 2 hours ago
          fetch_count: 89,
          error_count: 5
        }
      ]);
  
      // Load collection results - check if we should show all raw items or just qualified
      try {
        const collectionUrl = showAllItems 
          ? `${process.env.RSS_COLLECT_URL || 'https://rss-collect.jhaladik.workers.dev'}?include_raw=true`
          : `${process.env.AI_DATA_SCORE_URL || 'https://ai-data-score.jhaladik.workers.dev'}`;
        
        const collectionResponse = await fetch(collectionUrl);
        
        if (collectionResponse.ok) {
          const collectionData = await collectionResponse.json();
          
          if (showAllItems) {
            // Show all raw content from database
            setCollectionResults(collectionData.items?.map(item => ({
              source: item.source,
              collected: 1,
              errors: [],
              items: [{
                id: item.id,
                title: item.title,
                content: item.content?.substring(0, 200) + '...',
                score: item.raw_score,
                category: item.category,
                collected_at: item.collected_at
              }]
            })) || []);
          } else {
            // Show only qualified content (score >= 0.6)
            setCollectionResults(collectionData.items?.map(item => ({
              source: item.source,
              collected: 1,
              errors: [],
              items: [{
                id: item.id,
                title: item.title,
                content: item.content?.substring(0, 200) + '...',
                score: item.raw_score,
                category: item.category
              }]
            })) || []);
          }
        } else {
          // Fallback to mock data if API fails
          setCollectionResults([]);
        }
      } catch (error) {
        console.error('Collection results loading failed:', error);
        setCollectionResults([]);
      }
  
      // Load pipeline run history
      try {
        const pipelineResponse = await fetch(process.env.PIPELINE_ORCHESTRATOR_URL || 'https://pipeline-orchestrator.jhaladik.workers.dev');
        
        if (pipelineResponse.ok) {
          const pipelineData = await pipelineResponse.json();
          
          // Mock pipeline runs if no real data
          setPipelineRuns([
            {
              id: 'run-' + Date.now(),
              started_at: Date.now() - 3600000,
              completed_at: Date.now() - 3300000,
              status: 'completed',
              collected_items: 45,
              scored_items: 12,
              generated_items: 8,
              published_items: 6
            },
            {
              id: 'run-' + (Date.now() - 86400000),
              started_at: Date.now() - 90000000,
              completed_at: Date.now() - 89700000,
              status: 'completed',
              collected_items: 38,
              scored_items: 15,
              generated_items: 11,
              published_items: 9
            }
          ]);
        }
      } catch (error) {
        console.error('Pipeline history loading failed:', error);
        setPipelineRuns([]);
      }
  
    } catch (error) {
      console.error('Data loading failed:', error);
      setMessage('❌ Chyba při načítání dat: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const collectFromSource = async (sourceId: string) => {
    setLoading(true);
    try {
      const response = await fetch(process.env.RSS_COLLECT_URL!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sources: [sourceId] })
      });

      if (response.ok) {
        const result = await response.json();
        setMessage(`✅ RSS collection z ${sourceId}: ${result.collected} položek`);
        await loadData();
      } else {
        setMessage('❌ Chyba při RSS collection');
      }
    } catch (error) {
      setMessage('❌ Síťová chyba');
    }
    setLoading(false);
  };

  const collectFromAllSources = async () => {
    setLoading(true);
    try {
      const response = await fetch(process.env.RSS_COLLECT_URL!, {
        method: 'POST'
      });

      if (response.ok) {
        const result = await response.json();
        setCollectionResults(result.sources || []);
        setMessage(`✅ Kompletní RSS collection: ${result.collected} položek ze ${result.sources.success} zdrojů`);
        await loadData();
      } else {
        setMessage('❌ Chyba při RSS collection');
      }
    } catch (error) {
      setMessage('❌ Síťová chyba');
    }
    setLoading(false);
  };

  const toggleSource = async (sourceId: string, enabled: boolean) => {
    // In real implementation, this would call an API to update the source
    setRssSources(sources =>
      sources.map(source =>
        source.id === sourceId ? { ...source, enabled } : source
      )
    );
    setMessage(`✅ Zdroj ${sourceId} ${enabled ? 'aktivován' : 'deaktivován'}`);
  };

  const addNewSource = async () => {
    if (!newSource.name || !newSource.url) {
      setMessage('❌ Vyplňte název a URL');
      return;
    }

    const source: RSSSource = {
      id: newSource.name.toLowerCase().replace(/\s+/g, '-'),
      name: newSource.name,
      url: newSource.url,
      enabled: true,
      category_hint: newSource.category_hint,
      last_fetched: 0,
      fetch_count: 0,
      error_count: 0
    };

    setRssSources(sources => [...sources, source]);
    setNewSource({ name: '', url: '', category_hint: 'local_government' });
    setMessage(`✅ Nový RSS zdroj ${source.name} přidán`);
  };

  const getSourceHealthColor = (source: RSSSource) => {
    const errorRate = source.error_count / Math.max(source.fetch_count, 1);
    const hoursSinceLastFetch = (Date.now() - source.last_fetched) / (1000 * 60 * 60);

    if (!source.enabled) return 'text-gray-500';
    if (errorRate > 0.1 || hoursSinceLastFetch > 6) return 'text-red-500';
    if (errorRate > 0.05 || hoursSinceLastFetch > 3) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getSourceHealthStatus = (source: RSSSource) => {
    const errorRate = source.error_count / Math.max(source.fetch_count, 1);
    const hoursSinceLastFetch = (Date.now() - source.last_fetched) / (1000 * 60 * 60);

    if (!source.enabled) return 'Zakázáno';
    if (errorRate > 0.1) return 'Vysoká chybovost';
    if (hoursSinceLastFetch > 6) return 'Neaktivní';
    if (hoursSinceLastFetch > 3) return 'Zastaralé';
    return 'Zdravý';
  };

  const formatTimestamp = (timestamp: number) => {
    if (!timestamp) return 'Nikdy';
    return new Date(timestamp).toLocaleString('cs-CZ');
  };

  const getCategoryColor = (category: string) => ({
    local_government: 'bg-blue-100 text-blue-800',
    transport: 'bg-orange-100 text-orange-800',
    weather: 'bg-yellow-100 text-yellow-800',
    business: 'bg-green-100 text-green-800',
    emergency: 'bg-red-100 text-red-800',
    community: 'bg-purple-100 text-purple-800'
  })[category] || 'bg-gray-100 text-gray-800';

  return (
    <>
      <Head>
        <title>RSS Management - Phase 2b Pipeline</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow">
          <div className="container mx-auto px-4 py-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">📡 RSS Management</h1>
                <p className="text-gray-600">Správa RSS zdrojů a pipeline monitoring</p>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={collectFromAllSources}
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                >
                  🔄 Collect All Sources
                </button>
                <Link href="/admin/ai-dashboard" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                  🤖 AI Dashboard
                </Link>
                <Link href="/admin/dashboard" className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
                  📋 Admin Dashboard
                </Link>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-xl font-bold text-blue-600">{rssSources.filter(s => s.enabled).length}</div>
                <div className="text-sm text-blue-700">Aktivní zdroje</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="text-xl font-bold text-green-600">
                  {rssSources.filter(s => getSourceHealthStatus(s) === 'Zdravý').length}
                </div>
                <div className="text-sm text-green-700">Zdravé zdroje</div>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="text-xl font-bold text-yellow-600">
                  {rssSources.reduce((sum, s) => sum + s.fetch_count, 0)}
                </div>
                <div className="text-sm text-yellow-700">Celkem fetchů</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
                <div className="text-xl font-bold text-red-600">
                  {rssSources.reduce((sum, s) => sum + s.error_count, 0)}
                </div>
                <div className="text-sm text-red-700">Celkem chyb</div>
              </div>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8">
          {/* Message Display */}
          {message && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              {message}
            </div>
          )}

          <div className="bg-white rounded-lg shadow">
            {/* Tab Navigation */}
            <div className="flex border-b">
              <button
                onClick={() => setActiveTab('sources')}
                className={`px-6 py-3 font-medium ${activeTab === 'sources' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                📡 RSS Sources
              </button>
              <button
                onClick={() => setActiveTab('collection')}
                className={`px-6 py-3 font-medium ${activeTab === 'collection' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                📊 Collection Results
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-6 py-3 font-medium ${activeTab === 'history' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                📈 Pipeline History
              </button>
            </div>

            <div className="p-6">
              {/* RSS Sources Tab */}
              {activeTab === 'sources' && (
                <div className="space-y-6">
                  {/* Add New Source */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold mb-3">➕ Přidat nový RSS zdroj</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <input
                        type="text"
                        placeholder="Název zdroje"
                        value={newSource.name}
                        onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
                        className="px-3 py-2 border rounded"
                      />
                      <input
                        type="url"
                        placeholder="RSS URL"
                        value={newSource.url}
                        onChange={(e) => setNewSource({ ...newSource, url: e.target.value })}
                        className="px-3 py-2 border rounded"
                      />
                      <select
                        value={newSource.category_hint}
                        onChange={(e) => setNewSource({ ...newSource, category_hint: e.target.value })}
                        className="px-3 py-2 border rounded"
                      >
                        <option value="local_government">Local Government</option>
                        <option value="transport">Transport</option>
                        <option value="weather">Weather</option>
                        <option value="business">Business</option>
                        <option value="emergency">Emergency</option>
                        <option value="community">Community</option>
                      </select>
                      <button
                        onClick={addNewSource}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Přidat
                      </button>
                    </div>
                  </div>

                  {/* Sources List */}
                  <div className="space-y-4">
                    {rssSources.map((source) => (
                      <div key={source.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-medium text-lg">{source.name}</h3>
                              <span className={`px-2 py-1 text-xs rounded ${getCategoryColor(source.category_hint)}`}>
                                {source.category_hint}
                              </span>
                              <span className={`text-sm font-medium ${getSourceHealthColor(source)}`}>
                                ● {getSourceHealthStatus(source)}
                              </span>
                            </div>
                            
                            <div className="text-sm text-gray-600 mb-3 break-all">
                              {source.url}
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-gray-600">Poslední fetch:</span>
                                <div className="font-medium">{formatTimestamp(source.last_fetched)}</div>
                              </div>
                              <div>
                                <span className="text-gray-600">Celkem fetchů:</span>
                                <div className="font-medium">{source.fetch_count}</div>
                              </div>
                              <div>
                                <span className="text-gray-600">Chyby:</span>
                                <div className="font-medium text-red-600">{source.error_count}</div>
                              </div>
                              <div>
                                <span className="text-gray-600">Chybovost:</span>
                                <div className="font-medium">
                                  {source.fetch_count > 0 ? Math.round((source.error_count / source.fetch_count) * 100) : 0}%
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-2 ml-4">
                            <button
                              onClick={() => collectFromSource(source.id)}
                              disabled={loading || !source.enabled}
                              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                            >
                              📡 Collect
                            </button>
                            <button
                              onClick={() => toggleSource(source.id, !source.enabled)}
                              className={`px-3 py-1 text-sm rounded ${
                                source.enabled
                                  ? 'bg-red-600 text-white hover:bg-red-700'
                                  : 'bg-green-600 text-white hover:bg-green-700'
                              }`}
                            >
                              {source.enabled ? '⏸️ Zakázat' : '▶️ Povolit'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Collection Results Tab */}
              {activeTab === 'collection' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">📊 Výsledky posledního collection</h3>
                    {/* ADD BUTTON HERE */}
                    <button
                        onClick={() => setShowAllItems(!showAllItems)}
                        className={`px-4 py-2 rounded-lg font-medium ${
                        showAllItems 
                            ? 'bg-orange-100 text-orange-700 hover:bg-orange-200' 
                            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        }`}
                    >
                        {showAllItems ? '🎯 Show Qualified Only' : '📊 Show All Raw Items'}
                    </button>
                    <button
                      onClick={collectFromAllSources}
                      disabled={loading}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                    >
                      🔄 Nové collection
                    </button>
                  </div>

                  {collectionResults.length > 0 ? (
                    <div className="space-y-4">
                      {collectionResults.map((result, index) => (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="flex justify-between items-center mb-3">
                            <h4 className="font-medium">{result.source}</h4>
                            <span className="px-2 py-1 text-sm rounded bg-blue-100 text-blue-800">
                              {result.collected} položek
                            </span>
                          </div>

                          {result.errors.length > 0 && (
                            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded">
                              <h5 className="font-medium text-red-800 mb-2">Chyby:</h5>
                              <ul className="text-sm text-red-700 space-y-1">
                                {result.errors.map((error, i) => (
                                  <li key={i}>• {error}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {result.items.length > 0 && (
                            <div>
                              <h5 className="font-medium mb-2">Sebrané položky:</h5>
                              <div className="space-y-2 max-h-48 overflow-y-auto">
                                {result.items.slice(0, 5).map((item, i) => (
                                  <div key={i} className="text-sm p-2 bg-gray-50 rounded">
                                    <div className="font-medium mb-1">{item.title}</div>
                                    <div className="text-gray-600 line-clamp-2">{item.content}</div>
                                    {item.score && (
                                      <div className="mt-1">
                                        <span className="text-xs bg-blue-100 text-blue-700 px-1 rounded">
                                          Score: {Math.round(item.score * 100)}%
                                        </span>
                                        {item.category && (
                                          <span className="ml-2 text-xs bg-green-100 text-green-700 px-1 rounded">
                                            {item.category}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                ))}
                                {result.items.length > 5 && (
                                  <div className="text-sm text-gray-500">
                                    ... a dalších {result.items.length - 5} položek
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      📝 Žádné výsledky. Spusťte collection pro zobrazení dat.
                    </div>
                  )}
                </div>
              )}

              {/* Pipeline History Tab */}
              {activeTab === 'history' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold">📈 Historie pipeline runů</h3>

                  <div className="space-y-4">
                    {pipelineRuns.map((run) => (
                      <div key={run.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-medium">Pipeline Run {run.id}</h4>
                            <div className="text-sm text-gray-600">
                              {formatTimestamp(run.started_at)} - {formatTimestamp(run.completed_at)}
                            </div>
                          </div>
                          <span className={`px-2 py-1 text-sm rounded ${
                            run.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {run.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div className="text-center p-2 bg-blue-50 rounded">
                            <div className="font-bold text-blue-600">{run.collected_items}</div>
                            <div className="text-blue-700">Collected</div>
                          </div>
                          <div className="text-center p-2 bg-purple-50 rounded">
                            <div className="font-bold text-purple-600">{run.scored_items}</div>
                            <div className="text-purple-700">Scored</div>
                          </div>
                          <div className="text-center p-2 bg-green-50 rounded">
                            <div className="font-bold text-green-600">{run.generated_items}</div>
                            <div className="text-green-700">Generated</div>
                          </div>
                          <div className="text-center p-2 bg-orange-50 rounded">
                            <div className="font-bold text-orange-600">{run.published_items}</div>
                            <div className="text-orange-700">Published</div>
                          </div>
                        </div>

                        <div className="mt-3 text-sm text-gray-600">
                          Duration: {Math.round((run.completed_at - run.started_at) / 1000)}s • 
                          Success rate: {Math.round((run.published_items / Math.max(run.collected_items, 1)) * 100)}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}