// pages/admin/dashboard.tsx - Enhanced admin dashboard with AI features
import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect } from 'react';

interface ReviewItem {
  id: string;
  title: string;
  content: string;
  category: string;
  neighborhood_id: string;
  ai_confidence: number;
  status: string;
  created_by: string;
  created_at: number;
}

interface AIStats {
  ai_generated_today: number;
  high_confidence_pending: number;
  auto_approved_today: number;
  avg_confidence: number;
}

export default function AdminDashboard() {
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [aiStats, setAIStats] = useState<AIStats>({
    ai_generated_today: 0,
    high_confidence_pending: 0,
    auto_approved_today: 0,
    avg_confidence: 0
  });

  // Load review queue and AI stats
  useEffect(() => {
    const loadReviewQueue = async () => {
      try {
        // Load pending content
        const response = await fetch(`${process.env.ADMIN_REVIEW_URL}/?view=pending&limit=20`);
        const data = await response.json();
        
        if (data.success && data.content) {
          setReviewItems(data.content);
          
          // Calculate AI stats from the data
          const today = new Date().setHours(0, 0, 0, 0);
          const aiGenerated = data.content.filter((item: ReviewItem) => 
            item.created_by?.includes('ai') && item.created_at >= today
          );
          const highConfidence = data.content.filter((item: ReviewItem) => 
            item.ai_confidence >= 0.8
          );
          const avgConfidence = data.content.length > 0 
            ? data.content.reduce((sum: number, item: ReviewItem) => sum + (item.ai_confidence || 0), 0) / data.content.length
            : 0;

          setAIStats({
            ai_generated_today: aiGenerated.length,
            high_confidence_pending: highConfidence.length,
            auto_approved_today: 0, // This would come from separate API
            avg_confidence: avgConfidence
          });
        }
      } catch (error) {
        console.error('Error loading review queue:', error);
        // Fallback demo data
        setReviewItems([
          {
            id: 'demo-ai-1',
            title: 'AI: Nové úpravy ve Vinohradech',
            content: 'Tento článek byl automaticky vygenerován AI systémem na základě aktuálních dat z Prahy...',
            category: 'local',
            neighborhood_id: 'vinohrady',
            ai_confidence: 0.87,
            status: 'ai_generated',
            created_by: 'ai-generate-claude',
            created_at: Date.now() - 3600000
          }
        ]);
        setAIStats({
          ai_generated_today: 5,
          high_confidence_pending: 3,
          auto_approved_today: 2,
          avg_confidence: 0.82
        });
      } finally {
        setLoading(false);
      }
    };

    loadReviewQueue();
  }, []);

  // Handle individual approval
  const handleApprove = async (id: string) => {
    setLoading(true);
    try {
      const response = await fetch(process.env.CONTENT_APPROVE_URL!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          action: 'approve',
          approved_by: 'admin'
        })
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

  // Handle rejection
  const handleReject = async (id: string) => {
    setLoading(true);
    try {
      const response = await fetch(process.env.CONTENT_APPROVE_URL!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          action: 'reject',
          approved_by: 'admin'
        })
      });

      if (response.ok) {
        setReviewItems(items => items.filter(item => item.id !== id));
        setMessage('❌ Obsah zamítnut');
      } else {
        setMessage('❌ Chyba při zamítání');
      }
    } catch (error) {
      setMessage('❌ Síťová chyba');
    }
    setLoading(false);
  };

  // Handle batch approval
  const handleBatchApprove = async () => {
    if (selectedItems.length === 0) return;

    setLoading(true);
    try {
      const response = await fetch(process.env.CONTENT_BATCH_APPROVE_URL!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          content_ids: selectedItems,
          approved_by: 'admin'
        })
      });

      if (response.ok) {
        setReviewItems(items => items.filter(item => !selectedItems.includes(item.id)));
        setSelectedItems([]);
        setMessage(`✅ ${selectedItems.length} článků schváleno`);
      } else {
        setMessage('❌ Chyba při hromadném schvalování');
      }
    } catch (error) {
      setMessage('❌ Síťová chyba');
    }
    setLoading(false);
  };

  // Auto-approve high confidence content
  const handleAutoApprove = async () => {
    setLoading(true);
    try {
      const response = await fetch(process.env.CONTENT_AUTO_APPROVE_URL!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threshold: 0.85,
          max_items: 10,
          dry_run: false
        })
      });

      if (response.ok) {
        const result = await response.json();
        setMessage(`✅ Auto-schválení: ${result.approved} článků schváleno`);
        // Refresh the review queue
        window.location.reload();
      } else {
        setMessage('❌ Chyba při auto-schválení');
      }
    } catch (error) {
      setMessage('❌ Síťová chyba');
    }
    setLoading(false);
  };

  // Get category styling
  const getCategoryColor = (category: string) => {
    const colors = {
      emergency: 'bg-red-100 text-red-800 border-red-300',
      local: 'bg-blue-100 text-blue-800 border-blue-300',
      business: 'bg-green-100 text-green-800 border-green-300',
      community: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      weather: 'bg-purple-100 text-purple-800 border-purple-300',
      transport: 'bg-orange-100 text-orange-800 border-orange-300'
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  // Get confidence styling
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-600 bg-green-50';
    if (confidence >= 0.8) return 'text-green-500 bg-green-50';
    if (confidence >= 0.7) return 'text-yellow-600 bg-yellow-50';
    if (confidence >= 0.6) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  // Format AI creator name
  const formatCreator = (creator: string) => {
    if (creator?.includes('ai-generate')) return '🤖 AI Generátor';
    if (creator?.includes('ai')) return '🤖 AI';
    return creator || 'Manuální';
  };

  return (
    <>
      <Head>
        <title>Admin Dashboard - Místní Zprávy</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow">
          <div className="container mx-auto px-4 py-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">📋 Admin Dashboard</h1>
                <p className="text-gray-600">Správa obsahu - Review Queue</p>
              </div>
              <div className="flex gap-4">
                <Link href="/admin/ai-dashboard" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                  🤖 AI Dashboard
                </Link>
                <Link href="/" className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
                  🏠 Domů
                </Link>
              </div>
            </div>

            {/* AI Stats Row */}
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-xl font-bold text-blue-600">{reviewItems.length}</div>
                <div className="text-sm text-blue-700">Čeká na schválení</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="text-xl font-bold text-green-600">{aiStats.high_confidence_pending}</div>
                <div className="text-sm text-green-700">Vysoká AI důvěra</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg border border-purple-200">
                <div className="text-xl font-bold text-purple-600">{aiStats.ai_generated_today}</div>
                <div className="text-sm text-purple-700">AI dnes</div>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="text-xl font-bold text-yellow-600">{aiStats.avg_confidence.toFixed(2)}</div>
                <div className="text-sm text-yellow-700">Průměrná důvěra</div>
              </div>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8">
          {message && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-800">{message}</p>
            </div>
          )}

          {/* Quick Actions */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={handleAutoApprove}
              disabled={loading}
              className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              ⚡ Auto-schválit vysokou důvěru (≥0.85)
            </button>
            <button
              onClick={handleBatchApprove}
              disabled={loading || selectedItems.length === 0}
              className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              ✅ Schválit vybrané ({selectedItems.length})
            </button>
            <button
              onClick={() => setSelectedItems([])}
              disabled={selectedItems.length === 0}
              className="px-4 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 disabled:opacity-50"
            >
              🔄 Zrušit výběr
            </button>
          </div>

          {loading && reviewItems.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Načítání review queue...</p>
            </div>
          ) : reviewItems.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-500">🎉 Žádné články nečekají na schválení!</p>
              <Link href="/admin/ai-dashboard" className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                🤖 Přejít na AI Dashboard
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {reviewItems.map((item) => (
                <div key={item.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
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
                        className="mt-1 h-4 w-4 text-blue-600"
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-medium text-gray-900">{item.title}</h3>
                          <span className={`px-2 py-1 text-xs rounded border ${getCategoryColor(item.category)}`}>
                            {item.category}
                          </span>
                          <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                            {item.neighborhood_id}
                          </span>
                        </div>

                        <p className="text-gray-600 mb-3 line-clamp-3">{item.content}</p>

                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>{formatCreator(item.created_by)}</span>
                          <span>{new Date(item.created_at).toLocaleString('cs-CZ')}</span>
                          {item.ai_confidence > 0 && (
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(item.ai_confidence)}`}>
                              🎯 {(item.ai_confidence * 100).toFixed(0)}% důvěra
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleApprove(item.id)}
                        disabled={loading}
                        className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        ✅ Schválit
                      </button>
                      <button
                        onClick={() => handleReject(item.id)}
                        disabled={loading}
                        className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                      >
                        ❌ Zamítnout
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quick Content Creation */}
          <div className="mt-8 bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold mb-4">➕ Rychlé vytvoření obsahu</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">🤖 AI Generování</h4>
                <Link 
                  href="/admin/ai-dashboard?tab=generation"
                  className="block px-4 py-3 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 text-center"
                >
                  Generovat AI obsah
                </Link>
              </div>
              <div>
                <h4 className="font-medium mb-2">✍️ Manuální vytvoření</h4>
                <Link 
                  href="/admin/content/create"
                  className="block px-4 py-3 bg-green-100 text-green-800 rounded hover:bg-green-200 text-center"
                >
                  Vytvořit manuálně
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}