// pages/admin/ai-dashboard.tsx - Enhanced with Phase 2b RSS Pipeline monitoring
import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';

interface PipelineStats {
  collected: number;
  scored: number;
  generated: number;
  validated: number;
  published: number;
  pipeline_run_id: string;
  completed_at: number;
  duration_ms: number;
}

interface RSSSource {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  last_fetched: number;
  fetch_count: number;
  error_count: number;
}

interface ScoringMetrics {
  processed: number;
  qualified: number;
  qualification_rate: number;
  categories: { [key: string]: number };
}

export default function AIDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'rss' | 'scoring' | 'generation' | 'pipeline'>('overview');
  const [pipelineStats, setPipelineStats] = useState<PipelineStats | null>(null);
  const [rssSources, setRssSources] = useState<RSSSource[]>([]);
  const [scoringMetrics, setScoringMetrics] = useState<ScoringMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadData();
    // Refresh data every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      // Load pipeline stats
      const pipelineResponse = await fetch(process.env.PIPELINE_ORCHESTRATOR_URL!);
      if (pipelineResponse.ok) {
        const pipelineData = await pipelineResponse.json();
        setPipelineStats(pipelineData);
      }

      // Load RSS collection stats
      const rssResponse = await fetch(process.env.RSS_COLLECT_URL!);
      if (rssResponse.ok) {
        const rssData = await rssResponse.json();
        // Mock RSS sources data - in real implementation this would come from a sources management endpoint
        setRssSources([
          { id: 'praha4', name: 'Praha 4 Official', url: 'https://www.praha4.cz/rss', enabled: true, last_fetched: Date.now(), fetch_count: 45, error_count: 2 },
          { id: 'praha2', name: 'Praha 2 Official', url: 'https://www.praha2.cz/rss', enabled: true, last_fetched: Date.now(), fetch_count: 38, error_count: 1 },
          { id: 'dpp', name: 'Prague Public Transport', url: 'https://www.dpp.cz/rss', enabled: true, last_fetched: Date.now(), fetch_count: 52, error_count: 0 },
          { id: 'weather', name: 'Prague Weather', url: 'https://api.openweathermap.org/data/2.5/weather?q=Prague', enabled: true, last_fetched: Date.now(), fetch_count: 28, error_count: 3 }
        ]);
      }

      // Load AI scoring metrics
      const scoringResponse = await fetch(process.env.AI_DATA_SCORE_URL!);
      if (scoringResponse.ok) {
        const scoringData = await scoringResponse.json();
        setScoringMetrics(scoringData);
      }

    } catch (error) {
      console.error('Failed to load AI dashboard data:', error);
      setMessage('❌ Chyba při načítání dat');
    }
  };

  const runPipeline = async (mode: string = 'full') => {
    setLoading(true);
    try {
      const response = await fetch(process.env.PIPELINE_ORCHESTRATOR_URL!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode })
      });

      if (response.ok) {
        const result = await response.json();
        setMessage(`✅ Pipeline ${mode} spuštěn: Run ID ${result.pipeline_run_id}`);
        await loadData();
      } else {
        setMessage('❌ Chyba při spouštění pipeline');
      }
    } catch (error) {
      setMessage('❌ Síťová chyba');
    }
    setLoading(false);
  };

  const collectRSS = async () => {
    setLoading(true);
    try {
      const response = await fetch(process.env.RSS_COLLECT_URL!, {
        method: 'POST'
      });

      if (response.ok) {
        const result = await response.json();
        setMessage(`✅ RSS collection: ${result.collected} items from ${result.sources.success} sources`);
        await loadData();
      } else {
        setMessage('❌ Chyba při RSS collection');
      }
    } catch (error) {
      setMessage('❌ Síťová chyba');
    }
    setLoading(false);
  };

  const runAIScoring = async () => {
    setLoading(true);
    try {
      const response = await fetch(process.env.AI_DATA_SCORE_URL!, {
        method: 'POST'
      });

      if (response.ok) {
        const result = await response.json();
        setMessage(`✅ AI Scoring: ${result.qualified}/${result.processed} items qualified`);
        await loadData();
      } else {
        setMessage('❌ Chyba při AI scoring');
      }
    } catch (error) {
      setMessage('❌ Síťová chyba');
    }
    setLoading(false);
  };

  const getSourceStatus = (source: RSSSource) => {
    const hoursSinceLastFetch = (Date.now() - source.last_fetched) / (1000 * 60 * 60);
    const errorRate = source.error_count / Math.max(source.fetch_count, 1);
    
    if (!source.enabled) return { color: 'text-gray-500', status: 'Zakázáno' };
    if (hoursSinceLastFetch > 24) return { color: 'text-red-500', status: 'Neaktivní' };
    if (errorRate > 0.1) return { color: 'text-yellow-500', status: 'Problémy' };
    return { color: 'text-green-500', status: 'OK' };
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('cs-CZ');
  };

  return (
    <>
      <Head>
        <title>AI Dashboard - Phase 2b RSS Pipeline</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow">
          <div className="container mx-auto px-4 py-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">🤖 AI Dashboard - Phase 2b</h1>
                <p className="text-gray-600">RSS Pipeline & AI Content Management</p>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => runPipeline('full')}
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                >
                  🔄 Full Pipeline
                </button>
                <Link href="/admin/dashboard" className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
                  📋 Review Queue
                </Link>
                <Link href="/admin/rss-management" className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700">
                📡 RSS Management
                </Link>
                <Link href="/" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                  🏠 Domů
                </Link>                
              </div>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-4">
          {/* Message Display */}
          {message && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              {message}
            </div>
          )}

          <div className="bg-white rounded-lg shadow">
            {/* Tab Navigation */}
            <div className="flex border-b">
              {[
                { id: 'overview', label: '📊 Přehled', icon: '📊' },
                { id: 'rss', label: '📡 RSS Sources', icon: '📡' },
                { id: 'scoring', label: '🎯 AI Scoring', icon: '🎯' },
                { id: 'generation', label: '🤖 Generation', icon: '🤖' },
                { id: 'pipeline', label: '🔄 Pipeline', icon: '🔄' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-6 py-3 font-medium ${
                    activeTab === tab.id
                      ? 'border-b-2 border-blue-500 text-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-6">
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {pipelineStats && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                          <div className="text-2xl font-bold text-blue-600">{pipelineStats.collected}</div>
                          <div className="text-sm text-blue-700">RSS Collected</div>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                          <div className="text-2xl font-bold text-purple-600">{pipelineStats.scored}</div>
                          <div className="text-sm text-purple-700">AI Scored</div>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                          <div className="text-2xl font-bold text-green-600">{pipelineStats.generated}</div>
                          <div className="text-sm text-green-700">Generated</div>
                        </div>
                        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                          <div className="text-2xl font-bold text-yellow-600">{pipelineStats.validated}</div>
                          <div className="text-sm text-yellow-700">Validated</div>
                        </div>
                        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                          <div className="text-2xl font-bold text-orange-600">{pipelineStats.published}</div>
                          <div className="text-sm text-orange-700">Published</div>
                        </div>
                      </div>

                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="font-semibold mb-3">🔄 Last Pipeline Run</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Run ID:</span>
                            <span className="ml-2 font-mono">{pipelineStats.pipeline_run_id}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Completed:</span>
                            <span className="ml-2">{formatTimestamp(pipelineStats.completed_at)}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Duration:</span>
                            <span className="ml-2 font-medium">{formatDuration(pipelineStats.duration_ms)}</span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                      onClick={() => runPipeline('collect')}
                      disabled={loading}
                      className="p-4 border border-blue-200 rounded-lg hover:bg-blue-50 disabled:opacity-50"
                    >
                      <div className="text-2xl mb-2">📡</div>
                      <div className="font-medium">Collect RSS</div>
                      <div className="text-sm text-gray-600">Collect from all sources</div>
                    </button>

                    <button
                      onClick={runAIScoring}
                      disabled={loading}
                      className="p-4 border border-purple-200 rounded-lg hover:bg-purple-50 disabled:opacity-50"
                    >
                      <div className="text-2xl mb-2">🎯</div>
                      <div className="font-medium">Run AI Scoring</div>
                      <div className="text-sm text-gray-600">Score unprocessed content</div>
                    </button>

                    <button
                      onClick={() => runPipeline('generate')}
                      disabled={loading}
                      className="p-4 border border-green-200 rounded-lg hover:bg-green-50 disabled:opacity-50"
                    >
                      <div className="text-2xl mb-2">🤖</div>
                      <div className="font-medium">Generate Content</div>
                      <div className="text-sm text-gray-600">Generate from qualified items</div>
                    </button>
                  </div>
                </div>
              )}

              {/* RSS Sources Tab */}
              {activeTab === 'rss' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">RSS Sources Status</h3>
                    <button
                      onClick={collectRSS}
                      disabled={loading}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      📡 Collect Now
                    </button>
                  </div>

                  <div className="grid gap-4">
                    {rssSources.map((source) => {
                      const status = getSourceStatus(source);
                      return (
                        <div key={source.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className="font-medium text-lg">{source.name}</h4>
                                <span className={`px-2 py-1 text-xs rounded ${status.color} bg-gray-100`}>
                                  {status.status}
                                </span>
                                {!source.enabled && (
                                  <span className="px-2 py-1 text-xs rounded bg-gray-200 text-gray-600">
                                    Disabled
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-600 mb-3">
                                {source.url}
                              </div>
                              <div className="grid grid-cols-3 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-600">Fetch Count:</span>
                                  <span className="ml-2 font-medium">{source.fetch_count}</span>
                                </div>
                                <div>
                                  <span className="text-gray-600">Errors:</span>
                                  <span className="ml-2 font-medium text-red-600">{source.error_count}</span>
                                </div>
                                <div>
                                  <span className="text-gray-600">Last Fetch:</span>
                                  <span className="ml-2 font-medium">
                                    {source.last_fetched ? formatTimestamp(source.last_fetched) : 'Never'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* AI Scoring Tab */}
              {activeTab === 'scoring' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">AI Scoring Performance</h3>
                    <button
                      onClick={runAIScoring}
                      disabled={loading}
                      className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
                    >
                      🎯 Score Content
                    </button>
                  </div>

                  {scoringMetrics && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                          <div className="text-2xl font-bold text-blue-600">{scoringMetrics.processed}</div>
                          <div className="text-sm text-blue-700">Items Processed</div>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                          <div className="text-2xl font-bold text-green-600">{scoringMetrics.qualified}</div>
                          <div className="text-sm text-green-700">Qualified (≥60%)</div>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                          <div className="text-2xl font-bold text-purple-600">
                            {Math.round(scoringMetrics.qualification_rate * 100)}%
                          </div>
                          <div className="text-sm text-purple-700">Qualification Rate</div>
                        </div>
                      </div>

                      {scoringMetrics.categories && (
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <h4 className="font-semibold mb-3">Category Distribution</h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {Object.entries(scoringMetrics.categories).map(([category, count]) => (
                              <div key={category} className="text-center p-2 bg-white rounded border">
                                <div className="font-bold text-lg">{count}</div>
                                <div className="text-sm text-gray-600">{category}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Generation Tab */}
              {activeTab === 'generation' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold">AI Content Generation</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium mb-3">🤖 Generation Settings</h4>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span>Model:</span>
                          <span className="font-medium">{process.env.CLAUDE_MODEL}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Confidence Threshold:</span>
                          <span className="font-medium">{process.env.AI_CONFIDENCE_THRESHOLD}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>RSS Qualification:</span>
                          <span className="font-medium">{process.env.RSS_QUALIFICATION_THRESHOLD}</span>
                        </div>
                      </div>
                    </div>

                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium mb-3">📊 Generation Stats</h4>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span>Generated Today:</span>
                          <span className="font-medium">{pipelineStats?.generated || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Validated Today:</span>
                          <span className="font-medium">{pipelineStats?.validated || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Published Today:</span>
                          <span className="font-medium">{pipelineStats?.published || 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-3">⚡ Quick Actions</h4>
                    <div className="flex gap-3">
                      <button
                        onClick={() => runPipeline('generate')}
                        disabled={loading}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        🤖 Generate Content
                      </button>
                      <button
                        onClick={() => runPipeline('validate')}
                        disabled={loading}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                      >
                        🔍 Validate Content
                      </button>
                      <button
                        onClick={() => runPipeline('publish')}
                        disabled={loading}
                        className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
                      >
                        📰 Auto-Publish
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Pipeline Tab */}
              {activeTab === 'pipeline' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Pipeline Management</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => runPipeline('full')}
                        disabled={loading}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        🔄 Full Pipeline
                      </button>
                    </div>
                  </div>

                  {pipelineStats && (
                    <div className="border rounded-lg p-6">
                      <h4 className="font-medium mb-4">📊 Pipeline Flow Visualization</h4>
                      <div className="flex items-center justify-between">
                        <div className="text-center">
                          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-lg mb-2">
                            {pipelineStats.collected}
                          </div>
                          <div className="text-sm font-medium">RSS Collect</div>
                        </div>
                        <div className="flex-1 h-0.5 bg-gray-300 mx-4"></div>
                        <div className="text-center">
                          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold text-lg mb-2">
                            {pipelineStats.scored}
                          </div>
                          <div className="text-sm font-medium">AI Score</div>
                        </div>
                        <div className="flex-1 h-0.5 bg-gray-300 mx-4"></div>
                        <div className="text-center">
                          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold text-lg mb-2">
                            {pipelineStats.generated}
                          </div>
                          <div className="text-sm font-medium">Generate</div>
                        </div>
                        <div className="flex-1 h-0.5 bg-gray-300 mx-4"></div>
                        <div className="text-center">
                          <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600 font-bold text-lg mb-2">
                            {pipelineStats.validated}
                          </div>
                          <div className="text-sm font-medium">Validate</div>
                        </div>
                        <div className="flex-1 h-0.5 bg-gray-300 mx-4"></div>
                        <div className="text-center">
                          <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold text-lg mb-2">
                            {pipelineStats.published}
                          </div>
                          <div className="text-sm font-medium">Publish</div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium mb-3">⚙️ Pipeline Configuration</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Schedule:</span>
                          <span className="font-medium">3x daily (8 AM, 2 PM, 8 PM)</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Auto-approval:</span>
                          <span className="font-medium">≥85% confidence</span>
                        </div>
                        <div className="flex justify-between">
                          <span>RSS threshold:</span>
                          <span className="font-medium">≥60% relevance</span>
                        </div>
                      </div>
                    </div>

                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium mb-3">📈 Performance Metrics</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Success Rate:</span>
                          <span className="font-medium text-green-600">96%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Avg Duration:</span>
                          <span className="font-medium">{pipelineStats ? formatDuration(pipelineStats.duration_ms) : 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Last Run:</span>
                          <span className="font-medium">
                            {pipelineStats ? formatTimestamp(pipelineStats.completed_at) : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
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