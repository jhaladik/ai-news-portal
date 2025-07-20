// pages/admin/dashboard.tsx - Enhanced with Phase 2b RSS Pipeline features
import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';

interface ReviewItem {
  id: string;
  title: string;
  content: string;
  category: string;
  ai_confidence: number;
  status: string;
  created_at: number;
  raw_source?: string;
  raw_score?: number;
  priority?: string;
  insights?: string[];
}

interface CategoryInsights {
  category: string;
  total_content: number;
  avg_confidence: number;
  published_count: number;
  rejected_count: number;
}

interface PipelineStats {
  rss_collected_today: number;
  ai_scored_today: number;
  generated_today: number;
  published_today: number;
  auto_approval_rate: number;
}
export default function AdminDashboard() {
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [categoryInsights, setCategoryInsights] = useState<CategoryInsights[]>([]);
  const [pipelineStats, setPipelineStats] = useState<PipelineStats | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'queue' | 'insights' | 'pipeline'>('queue');
  const [rssStats, setRssStats] = useState<{
    collected_today: number;
    generated_today: number;
    pipeline_status: string;
  } | null>(null);
  
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load enhanced review queue with RSS data
      const reviewResponse = await fetch(process.env.ADMIN_REVIEW_URL!);
      const reviewData = await reviewResponse.json();
      setReviewItems(reviewData.queue || []);
      

      // Load category insights
      const insightsResponse = await fetch(`${process.env.ADMIN_REVIEW_URL}?action=insights`);
      const insightsData = await insightsResponse.json();
      setCategoryInsights(insightsData.insights || []);

      // Load pipeline statistics
      const pipelineResponse = await fetch(process.env.SCHEDULER_DAILY_URL!);
      const pipelineData = await pipelineResponse.json();
      setPipelineStats(pipelineData.today_stats || null);

      const rssResponse = await fetch(process.env.SCHEDULER_DAILY_URL!);
      if (rssResponse.ok) {
        const rssData = await rssResponse.json();
        setRssStats(rssData.today_stats || { 
          collected_today: 0, 
          generated_today: 0, 
          pipeline_status: 'active' 
        });
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const handleApprove = async (id: string) => {
    setLoading(true);
    try {
      const response = await fetch(`${process.env.ADMIN_REVIEW_URL}?action=approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content_id: id, publish_immediately: true })
      });

      if (response.ok) {
        setReviewItems(items => items.filter(item => item.id !== id));
        setMessage('✅ Obsah schválen a publikován');
      } else {
        setMessage('❌ Chyba při schvalování');
      }
    } catch (error) {
      setMessage('❌ Síťová chyba');
    }
    setLoading(false);
  };

  const handleBatchApprove = async () => {
    if (selectedItems.length === 0) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${process.env.ADMIN_REVIEW_URL}?action=batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content_ids: selectedItems, min_confidence: 0.85 })
      });

      if (response.ok) {
        const result = await response.json();
        setReviewItems(items => items.filter(item => !selectedItems.includes(item.id)));
        setSelectedItems([]);
        setMessage(`✅ ${result.approved} článků hromadně schváleno`);
      } else {
        setMessage('❌ Chyba při hromadném schvalování');
      }
    } catch (error) {
      setMessage('❌ Síťová chyba');
    }
    setLoading(false);
  };

  const runPipelineManualy = async () => {
    setLoading(true);
    try {
      const response = await fetch(process.env.PIPELINE_ORCHESTRATOR_URL!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'full' })
      });

      if (response.ok) {
        const result = await response.json();
        setMessage(`✅ Pipeline spuštěn: ${result.collected} RSS, ${result.generated} generováno`);
        await loadData(); // Refresh data
      } else {
        setMessage('❌ Chyba při spouštění pipeline');
      }
    } catch (error) {
      setMessage('❌ Síťová chyba');
    }
    setLoading(false);
  };

  const getCategoryColor = (category: string) => ({
    emergency: 'bg-red-100 text-red-800 border-red-300',
    transport: 'bg-orange-100 text-orange-800 border-orange-300',
    local_government: 'bg-blue-100 text-blue-800 border-blue-300',
    community: 'bg-green-100 text-green-800 border-green-300',
    business: 'bg-purple-100 text-purple-800 border-purple-300',
    weather: 'bg-yellow-100 text-yellow-800 border-yellow-300'
  })[category] || 'bg-gray-100 text-gray-800 border-gray-300';

  const getConfidenceColor = (confidence: number) => 
    confidence >= 0.9 ? 'text-green-600' :
    confidence >= 0.8 ? 'text-blue-600' :
    confidence >= 0.7 ? 'text-yellow-600' : 'text-red-600';

  const getPriorityColor = (priority: string) => ({
    urgent: 'bg-red-100 text-red-700 border-red-300',
    high: 'bg-orange-100 text-orange-700 border-orange-300',
    medium: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    low: 'bg-gray-100 text-gray-700 border-gray-300'
  })[priority] || 'bg-gray-100 text-gray-700 border-gray-300';

  const highConfidenceItems = reviewItems.filter(item => item.ai_confidence >= 0.85);
  const urgentItems = reviewItems.filter(item => item.priority === 'urgent');

  return (
    <>
      <Head>
        <title>Admin Dashboard - Phase 2b RSS Pipeline</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header with Pipeline Stats */}
        <header className="bg-white shadow">
          <div className="container mx-auto px-4 py-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">📋 Admin Dashboard - Phase 2b</h1>
                <p className="text-gray-600">Správa obsahu s RSS Pipeline</p>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={runPipelineManualy}
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                >
                  🔄 Spustit Pipeline
                </button>
                <Link href="/admin/ai-dashboard" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                  🤖 AI Dashboard
                </Link>
                <Link href="/" className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
                  🏠 Domů
                </Link>
              </div>
            </div>

            {/* Pipeline Stats Row */}
            <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-4">
              {/* Existing metrics */}
              <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-xl font-bold text-blue-600">{reviewItems.length}</div>
                <div className="text-sm text-blue-700">Čeká na schválení</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="text-xl font-bold text-green-600">{highConfidenceItems.length}</div>
                <div className="text-sm text-green-700">Vysoká AI důvěra</div>
              </div>
              {/* NEW: RSS Pipeline Metrics */}
              <div className="text-center p-3 bg-purple-50 rounded-lg border border-purple-200">
                <div className="text-xl font-bold text-purple-600">{rssStats?.collected_today || 0}</div>
                <div className="text-sm text-purple-700">RSS dnes</div>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg border border-orange-200">
                <div className="text-xl font-bold text-orange-600">{rssStats?.generated_today || 0}</div>
                <div className="text-sm text-orange-700">AI generováno</div>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="text-xl font-bold text-yellow-600">{urgentItems.length}</div>
                <div className="text-sm text-yellow-700">Urgentní</div>
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

          {/* Tab Navigation */}
          <div className="mb-6 bg-white rounded-lg shadow">
            <div className="flex border-b">
              <button
                onClick={() => setActiveTab('queue')}
                className={`px-6 py-3 font-medium ${activeTab === 'queue' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                📋 Review Queue
              </button>
              <button
                onClick={() => setActiveTab('insights')}
                className={`px-6 py-3 font-medium ${activeTab === 'insights' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                📊 Category Insights
              </button>
              <button
                onClick={() => setActiveTab('pipeline')}
                className={`px-6 py-3 font-medium ${activeTab === 'pipeline' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                🔄 Pipeline Status
              </button>
            </div>

            <div className="p-6">
              {/* Review Queue Tab */}
              {activeTab === 'queue' && (
                <div className="space-y-6">
                  {/* Batch Actions */}
                  <div className="flex gap-4">
                    <button
                      onClick={handleBatchApprove}
                      disabled={selectedItems.length === 0 || loading}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                    >
                      ⚡ Hromadně schválit ({selectedItems.length})
                    </button>
                    <button
                      onClick={() => setSelectedItems(highConfidenceItems.map(item => item.id))}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      🎯 Vybrat vysokou důvěru
                    </button>
                    <button
                      onClick={() => setSelectedItems([])}
                      className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                    >
                      ❌ Zrušit výběr
                    </button>
                  </div>

                  {/* Review Items */}
                  <div className="space-y-4">
                    {reviewItems.map((item) => (
                      <div key={item.id} className="bg-white border rounded-lg p-4 shadow-sm">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <input
                                type="checkbox"
                                checked={selectedItems.includes(item.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedItems([...selectedItems, item.id]);
                                  } else {
                                    setSelectedItems(selectedItems.filter(id => id !== item.id));
                                  }
                                }}
                                className="rounded"
                              />
                              <h3 className="font-medium text-lg text-gray-900">{item.title}</h3>
                              {item.priority && (
                                <span className={`px-2 py-1 text-xs rounded border ${getPriorityColor(item.priority)}`}>
                                  {item.priority.toUpperCase()}
                                </span>
                              )}
                            </div>
                            
                            <div className="flex flex-wrap gap-2 mb-3">
                              <span className={`px-2 py-1 text-xs rounded border ${getCategoryColor(item.category)}`}>
                                {item.category}
                              </span>
                              <span className={`px-2 py-1 text-xs rounded bg-gray-100 ${getConfidenceColor(item.ai_confidence)}`}>
                                AI: {(item.ai_confidence * 100).toFixed(0)}%
                              </span>
                              {item.raw_source && (
                                <span className="px-2 py-1 text-xs rounded bg-purple-100 text-purple-800">
                                  📡 {item.raw_source}
                                </span>
                              )}
                              {item.raw_score && (
                                <span className="px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-800">
                                  RSS: {(item.raw_score * 100).toFixed(0)}%
                                </span>
                              )}
                            </div>

                            <p className="text-gray-700 mb-3 line-clamp-3">{item.content}</p>

                            {/* AI Insights */}
                            {item.insights && item.insights.length > 0 && (
                              <div className="mb-3">
                                <p className="text-sm font-medium text-gray-600 mb-1">🤖 AI Insights:</p>
                                <ul className="text-sm text-gray-600 space-y-1">
                                  {item.insights.map((insight, index) => (
                                    <li key={index} className="flex items-center gap-2">
                                      <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                                      {insight}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2 ml-4">
                            <button
                              onClick={() => handleApprove(item.id)}
                              disabled={loading}
                              className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
                            >
                              ✅ Schválit
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}

                    {reviewItems.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        📝 Žádné položky k review. RSS pipeline funguje automaticky!
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Category Insights Tab */}
              {activeTab === 'insights' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categoryInsights.map((insight) => (
                      <div key={insight.category} className="bg-white border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className={`px-3 py-1 text-sm rounded border ${getCategoryColor(insight.category)}`}>
                            {insight.category}
                          </span>
                          <span className="text-2xl font-bold text-gray-900">{insight.total_content}</span>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Publikováno:</span>
                            <span className="font-medium">{insight.published_count}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Průměrná důvěra:</span>
                            <span className={`font-medium ${getConfidenceColor(insight.avg_confidence)}`}>
                              {(insight.avg_confidence * 100).toFixed(0)}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Zamítnuto:</span>
                            <span className="font-medium text-red-600">{insight.rejected_count}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pipeline Status Tab */}
              {activeTab === 'pipeline' && (
                <div className="space-y-6">
                  {pipelineStats && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                        <h3 className="font-semibold text-blue-900 mb-4">📡 RSS Collection</h3>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>Dnes zpracováno:</span>
                            <span className="font-bold">{pipelineStats.rss_collected_today}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>AI skórováno:</span>
                            <span className="font-bold">{pipelineStats.ai_scored_today}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-green-50 p-6 rounded-lg border border-green-200">
                        <h3 className="font-semibold text-green-900 mb-4">🤖 AI Generation</h3>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>Dnes generováno:</span>
                            <span className="font-bold">{pipelineStats.generated_today}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Auto-schváleno:</span>
                            <span className="font-bold">{Math.round(pipelineStats.auto_approval_rate * 100)}%</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
                        <h3 className="font-semibold text-purple-900 mb-4">📰 Publication</h3>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>Dnes publikováno:</span>
                            <span className="font-bold">{pipelineStats.published_today}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Čekající:</span>
                            <span className="font-bold">{reviewItems.length}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}