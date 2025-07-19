// pages/admin/ai-dashboard.tsx - Comprehensive AI Content Generation Dashboard
import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect } from 'react';

interface AIMetrics {
  ai_worker_performance: Array<{
    created_by: string;
    total_generated: number;
    avg_confidence: number;
    published_count: number;
    high_quality_count: number;
  }>;
  confidence_distribution: Array<{
    confidence_range: string;
    count: number;
    published_in_range: number;
  }>;
  recent_daily_summaries: Array<{
    date: string;
    content_generation: {
      neighborhoods_processed: number;
      content_generated: number;
      generation_failures: number;
    };
    data_collection: {
      prague_points: number;
      transport_disruptions: number;
    };
    validation: {
      items_scored: number;
    };
    auto_approval: {
      items_approved: number;
    };
  }>;
}

interface DataCollectionStatus {
  prague_data: {
    success: boolean;
    collected: number;
    timestamp: number;
    kv_stored: boolean;
    preview: {
      weather: string;
      temperature: number;
      events: string;
    };
  };
  transport_data: {
    success: boolean;
    disruptions: number;
    stored_articles: number;
    kv_stored: boolean;
    active_issues: Array<{
      line: string;
      type: string;
      severity: string;
      title: string;
    }>;
  };
}

interface AutoApprovalSettings {
  threshold: number;
  enabled: boolean;
  max_items: number;
  dry_run: boolean;
}

export default function AIDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'generation' | 'data' | 'quality' | 'settings'>('overview');
  const [aiMetrics, setAIMetrics] = useState<AIMetrics | null>(null);
  const [dataStatus, setDataStatus] = useState<DataCollectionStatus | null>(null);
  const [autoApprovalSettings, setAutoApprovalSettings] = useState<AutoApprovalSettings>({
    threshold: 0.85,
    enabled: true,
    max_items: 20,
    dry_run: false
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  // Load AI metrics and status
  useEffect(() => {
    const loadAIData = async () => {
      setLoading(true);
      try {
        // Load AI metrics
        const metricsResponse = await fetch(`${process.env.ADMIN_REVIEW_URL}/?view=ai_metrics`);
        if (metricsResponse.ok) {
          const metrics = await metricsResponse.json();
          setAIMetrics(metrics);
        }

        // Load data collection status
        const pragueResponse = await fetch(process.env.DATA_COLLECT_PRAGUE_URL!);
        const transportResponse = await fetch(process.env.DATA_COLLECT_DPP_URL!);
        
        const [pragueData, transportData] = await Promise.all([
          pragueResponse.json(),
          transportResponse.json()
        ]);

        setDataStatus({
          prague_data: pragueData,
          transport_data: transportData
        });

      } catch (error) {
        console.error('Error loading AI data:', error);
        setMessage('⚠️ Chyba při načítání AI dat');
      } finally {
        setLoading(false);
      }
    };

    loadAIData();
  }, []);

  // Manual content generation
  const handleGenerateContent = async (neighborhood: string, category: string) => {
    setLoading(true);
    try {
      const response = await fetch(process.env.AI_GENERATE_URL!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          neighborhood,
          category,
          type: 'manual_request'
        })
      });

      if (response.ok) {
        const result = await response.json();
        setMessage(`✅ Obsah vygenerován: "${result.title}" (ID: ${result.id})`);
      } else {
        setMessage('❌ Chyba při generování obsahu');
      }
    } catch (error) {
      setMessage('❌ Síťová chyba při generování');
    } finally {
      setLoading(false);
    }
  };

  // Manual pipeline execution
  const handleRunPipeline = async () => {
    setLoading(true);
    try {
      const response = await fetch(process.env.SCHEDULER_DAILY_URL!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        setMessage('✅ Denní pipeline spuštěn úspěšně');
      } else {
        setMessage('❌ Chyba při spuštění pipeline');
      }
    } catch (error) {
      setMessage('❌ Síťová chyba');
    } finally {
      setLoading(false);
    }
  };

  // Auto-approval control
  const handleAutoApproval = async () => {
    setLoading(true);
    try {
      const response = await fetch(process.env.CONTENT_AUTO_APPROVE_URL!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(autoApprovalSettings)
      });

      if (response.ok) {
        const result = await response.json();
        setMessage(`✅ Auto-schválení: ${result.approved} článků schváleno`);
      } else {
        setMessage('❌ Chyba při auto-schválení');
      }
    } catch (error) {
      setMessage('❌ Síťová chyba');
    } finally {
      setLoading(false);
    }
  };

  // Tab content components
  const OverviewTab = () => (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="text-2xl font-bold text-blue-600">
            {aiMetrics?.ai_worker_performance.reduce((sum, worker) => sum + worker.total_generated, 0) || 0}
          </div>
          <div className="text-sm text-blue-700">Celkem AI článků</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="text-2xl font-bold text-green-600">
            {aiMetrics?.ai_worker_performance.reduce((sum, worker) => sum + worker.published_count, 0) || 0}
          </div>
          <div className="text-sm text-green-700">Publikováno</div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <div className="text-2xl font-bold text-purple-600">
            {aiMetrics?.ai_worker_performance[0]?.avg_confidence.toFixed(2) || '0.00'}
          </div>
          <div className="text-sm text-purple-700">Průměrná důvěra</div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <div className="text-2xl font-bold text-yellow-600">
            {dataStatus?.prague_data.collected || 0}
          </div>
          <div className="text-sm text-yellow-700">Data body dnes</div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-bold mb-4">📈 Nedávná aktivita</h3>
        <div className="space-y-3">
          {aiMetrics?.recent_daily_summaries.slice(0, 3).map((summary, index) => (
            <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <div>
                <div className="font-medium">{summary.date}</div>
                <div className="text-sm text-gray-600">
                  {summary.content_generation.content_generated} článků, {summary.data_collection.prague_points} dat. bodů
                </div>
              </div>
              <div className="text-right">
                <div className="text-green-600 font-medium">
                  {summary.auto_approval.items_approved} auto-schváleno
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-bold mb-4">⚡ Rychlé akce</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={handleRunPipeline}
            disabled={loading}
            className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            🔄 Spustit denní pipeline
          </button>
          <button
            onClick={handleAutoApproval}
            disabled={loading}
            className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            ✅ Auto-schválení
          </button>
          <Link href="/admin/dashboard" className="px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-center">
            📋 Review Queue
          </Link>
        </div>
      </div>
    </div>
  );

  const GenerationTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-bold mb-4">🤖 Manuální generování obsahu</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {['vinohrady', 'karlin', 'smichov', 'zizkov'].map(neighborhood => (
            <div key={neighborhood} className="border rounded-lg p-4">
              <h4 className="font-medium mb-3 capitalize">{neighborhood}</h4>
              <div className="space-y-2">
                {['local', 'weather', 'transport', 'events'].map(category => (
                  <button
                    key={category}
                    onClick={() => handleGenerateContent(neighborhood, category)}
                    disabled={loading}
                    className="w-full px-3 py-2 text-sm bg-blue-100 text-blue-800 rounded hover:bg-blue-200 disabled:opacity-50"
                  >
                    Generovat {category}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Worker Performance */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-bold mb-4">📊 Výkon AI workerů</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Worker</th>
                <th className="text-left p-2">Generováno</th>
                <th className="text-left p-2">Publikováno</th>
                <th className="text-left p-2">Průměrná důvěra</th>
                <th className="text-left p-2">Vysoká kvalita</th>
              </tr>
            </thead>
            <tbody>
              {aiMetrics?.ai_worker_performance.map((worker, index) => (
                <tr key={index} className="border-b">
                  <td className="p-2 font-medium">{worker.created_by}</td>
                  <td className="p-2">{worker.total_generated}</td>
                  <td className="p-2 text-green-600">{worker.published_count}</td>
                  <td className="p-2">{worker.avg_confidence.toFixed(2)}</td>
                  <td className="p-2 text-blue-600">{worker.high_quality_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const DataTab = () => (
    <div className="space-y-6">
      {/* Data Collection Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold mb-4">🌤️ Pražská data</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span>Status:</span>
              <span className={dataStatus?.prague_data.success ? 'text-green-600' : 'text-red-600'}>
                {dataStatus?.prague_data.success ? '✅ Aktivní' : '❌ Chyba'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Data body:</span>
              <span>{dataStatus?.prague_data.collected || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>KV Storage:</span>
              <span className={dataStatus?.prague_data.kv_stored ? 'text-green-600' : 'text-red-600'}>
                {dataStatus?.prague_data.kv_stored ? '✅ Funkční' : '❌ Nedostupné'}
              </span>
            </div>
            {dataStatus?.prague_data.preview && (
              <div className="mt-4 p-3 bg-blue-50 rounded">
                <div className="text-sm">
                  <div><strong>Počasí:</strong> {dataStatus.prague_data.preview.weather}</div>
                  <div><strong>Teplota:</strong> {dataStatus.prague_data.preview.temperature}°C</div>
                  <div><strong>Události:</strong> {dataStatus.prague_data.preview.events}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold mb-4">🚌 Dopravní data</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span>Status:</span>
              <span className={dataStatus?.transport_data.success ? 'text-green-600' : 'text-red-600'}>
                {dataStatus?.transport_data.success ? '✅ Aktivní' : '❌ Chyba'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Omezení:</span>
              <span>{dataStatus?.transport_data.disruptions || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Články vytvořeny:</span>
              <span>{dataStatus?.transport_data.stored_articles || 0}</span>
            </div>
            {dataStatus?.transport_data.active_issues && dataStatus.transport_data.active_issues.length > 0 && (
              <div className="mt-4">
                <div className="text-sm font-medium mb-2">Aktivní problémy:</div>
                <div className="space-y-1">
                  {dataStatus.transport_data.active_issues.map((issue, index) => (
                    <div key={index} className="text-xs p-2 bg-yellow-50 rounded">
                      <div className="font-medium">Linka {issue.line}: {issue.title}</div>
                      <div className="text-gray-600">{issue.type} - {issue.severity}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const QualityTab = () => (
    <div className="space-y-6">
      {/* Confidence Distribution */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-bold mb-4">📈 Distribuce důvěry AI</h3>
        <div className="space-y-3">
          {aiMetrics?.confidence_distribution.map((range, index) => {
            const percentage = range.count > 0 ? (range.published_in_range / range.count * 100) : 0;
            return (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div className="flex-1">
                  <div className="font-medium">{range.confidence_range}</div>
                  <div className="text-sm text-gray-600">
                    {range.count} článků, {range.published_in_range} publikováno
                  </div>
                </div>
                <div className="flex-1 mx-4">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">{percentage.toFixed(1)}%</div>
                  <div className="text-sm text-gray-600">úspěšnost</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const SettingsTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-bold mb-4">⚙️ Nastavení auto-schválení</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Práh důvěry</label>
            <input
              type="number"
              min="0"
              max="1"
              step="0.01"
              value={autoApprovalSettings.threshold}
              onChange={(e) => setAutoApprovalSettings(prev => ({ ...prev, threshold: parseFloat(e.target.value) }))}
              className="w-full px-3 py-2 border rounded-md"
            />
            <div className="text-xs text-gray-500 mt-1">Články s důvěrou vyšší než {autoApprovalSettings.threshold} budou automaticky schváleny</div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Maximální počet za běh</label>
            <input
              type="number"
              min="1"
              max="100"
              value={autoApprovalSettings.max_items}
              onChange={(e) => setAutoApprovalSettings(prev => ({ ...prev, max_items: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={autoApprovalSettings.enabled}
                onChange={(e) => setAutoApprovalSettings(prev => ({ ...prev, enabled: e.target.checked }))}
                className="mr-2"
              />
              Povolit auto-schválení
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={autoApprovalSettings.dry_run}
                onChange={(e) => setAutoApprovalSettings(prev => ({ ...prev, dry_run: e.target.checked }))}
                className="mr-2"
              />
              Dry run (pouze test)
            </label>
          </div>

          <button
            onClick={handleAutoApproval}
            disabled={loading || !autoApprovalSettings.enabled}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {autoApprovalSettings.dry_run ? 'Test auto-schválení' : 'Spustit auto-schválení'}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Head>
        <title>AI Dashboard - Místní Zprávy</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow">
          <div className="container mx-auto px-4 py-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">🤖 AI Content Dashboard</h1>
                <p className="text-gray-600">Správa AI generování obsahu - Phase 2</p>
              </div>
              <div className="flex gap-4">
                <Link href="/admin/dashboard" className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
                  📋 Review Queue
                </Link>
                <Link href="/" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                  🏠 Domů
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Navigation Tabs */}
        <div className="container mx-auto px-4 py-4">
          <div className="bg-white rounded-lg shadow">
            <div className="flex border-b">
              {[
                { id: 'overview', label: '📊 Přehled', icon: '📊' },
                { id: 'generation', label: '🤖 Generování', icon: '🤖' },
                { id: 'data', label: '📡 Data', icon: '📡' },
                { id: 'quality', label: '🎯 Kvalita', icon: '🎯' },
                { id: 'settings', label: '⚙️ Nastavení', icon: '⚙️' }
              ].map(tab => (
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

            {/* Tab Content */}
            <div className="p-6">
              {message && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-blue-800">{message}</p>
                </div>
              )}

              {loading && activeTab !== 'overview' && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-500">Načítání...</p>
                </div>
              )}

              {activeTab === 'overview' && <OverviewTab />}
              {activeTab === 'generation' && <GenerationTab />}
              {activeTab === 'data' && <DataTab />}
              {activeTab === 'quality' && <QualityTab />}
              {activeTab === 'settings' && <SettingsTab />}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}