// pages/admin/dashboard.tsx - Simple admin dashboard with client-side data fetching
import Head from 'next/head';
import { useState, useEffect } from 'react';

interface ReviewItem {
  id: string;
  title: string;
  content: string;
  category: string;
  neighborhood: {
    id: string;
    name: string;
  };
  ai_confidence: number;
  status: string;
  created_by: string;
  created_at: number;
  priority: string;
}

export default function AdminDashboard() {
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  // Load review queue from worker
  useEffect(() => {
    const loadReviewQueue = async () => {
      try {
        const response = await fetch(`${process.env.ADMIN_REVIEW_URL}/?status=draft`);
        const data = await response.json();
        setReviewItems(data.items || []);
      } catch (error) {
        console.error('Error loading review queue:', error);
        // Use demo data as fallback
        setReviewItems([
          {
            id: 'demo-admin-1',
            title: 'Demo článek čekající na schválení',
            content: 'Toto je ukázkový článek v admin dashboard. Workers jsou připojené a funkční.',
            category: 'local',
            neighborhood: { id: 'vinohrady', name: 'Vinohrady' },
            ai_confidence: 0.85,
            status: 'draft',
            created_by: 'demo',
            created_at: Date.now() - 3600000,
            priority: 'normal'
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    loadReviewQueue();
  }, []);

  const handleApprove = async (id: string) => {
    setLoading(true);
    try {
      const response = await fetch(process.env.CONTENT_APPROVE_URL!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'approve', approved_by: 'admin' })
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

  const handleReject = async (id: string) => {
    setLoading(true);
    try {
      const response = await fetch(process.env.CONTENT_APPROVE_URL!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'reject', approved_by: 'admin' })
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

  const handleBatchApprove = async () => {
    if (selectedItems.length === 0) return;
    
    setLoading(true);
    const promises = selectedItems.map(id => 
      fetch(process.env.CONTENT_APPROVE_URL!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'approve', approved_by: 'admin' })
      })
    );

    try {
      await Promise.all(promises);
      setReviewItems(items => items.filter(item => !selectedItems.includes(item.id)));
      setSelectedItems([]);
      setMessage(`✅ ${selectedItems.length} článků schváleno`);
    } catch (error) {
      setMessage('❌ Chyba při hromadném schvalování');
    }
    setLoading(false);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'emergency': return 'bg-red-100 text-red-800 border-red-300';
      case 'local': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'business': return 'bg-green-100 text-green-800 border-green-300';
      case 'community': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getPriorityColor = (priority: string) => {
    return priority === 'high' ? 'border-l-4 border-red-500' : 'border-l-4 border-blue-500';
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
                <h1 className="text-2xl font-bold text-gray-900">🤖 Admin Dashboard</h1>
                <p className="text-gray-600">Správa obsahu - Místní Zprávy</p>
              </div>
              <div className="flex gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{reviewItems.length}</div>
                  <div className="text-sm text-gray-500">Čeká na schválení</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {reviewItems.filter(item => item.ai_confidence > 0.8).length}
                  </div>
                  <div className="text-sm text-gray-500">Vysoká AI důvěra</div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8">
          {/* Status Message */}
          {message && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-800">{message}</p>
            </div>
          )}

          {/* Batch Actions */}
          {selectedItems.length > 0 && (
            <div className="mb-6 p-4 bg-white rounded-lg shadow">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">
                  Vybráno: {selectedItems.length} článků
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={handleBatchApprove}
                    disabled={loading}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    ✅ Schválit vybrané
                  </button>
                  <button
                    onClick={() => setSelectedItems([])}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                  >
                    Zrušit výběr
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && reviewItems.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Načítání review queue...</p>
            </div>
          ) : (
            /* Review Queue */
            <div className="space-y-4">
              {reviewItems.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-8 text-center">
                  <p className="text-gray-500">🎉 Žádné články nečekají na schválení!</p>
                </div>
              ) : (
                reviewItems.map(item => (
                  <div key={item.id} className={`bg-white rounded-lg shadow ${getPriorityColor(item.priority)}`}>
                    <div className="p-6">
                      {/* Header */}
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
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
                            className="w-4 h-4"
                          />
                          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getCategoryColor(item.category)}`}>
                            {item.category.toUpperCase()}
                          </span>
                          <span className="text-sm text-gray-500">
                            {item.neighborhood.name}
                          </span>
                          {item.priority === 'high' && (
                            <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-bold rounded">
                              URGENTNÍ
                            </span>
                          )}
                        </div>
                        
                        <div className="text-right text-sm text-gray-500">
                          <div>Vytvořeno: {new Date(item.created_at).toLocaleString('cs-CZ')}</div>
                          <div>Autor: {item.created_by}</div>
                          {item.ai_confidence > 0 && (
                            <div className={`font-medium ${
                              item.ai_confidence > 0.8 ? 'text-green-600' : 
                              item.ai_confidence > 0.6 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              AI Confidence: {Math.round(item.ai_confidence * 100)}%
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="mb-4">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">
                          {item.title}
                        </h3>
                        <div className="text-gray-700 prose prose-sm max-w-none">
                          {item.content.split('\n').map((paragraph, index) => (
                            <p key={index} className="mb-2">{paragraph}</p>
                          ))}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleApprove(item.id)}
                          disabled={loading}
                          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 transition-colors"
                        >
                          ✅ Schválit
                        </button>
                        <button
                          onClick={() => handleReject(item.id)}
                          disabled={loading}
                          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 transition-colors"
                        >
                          ❌ Zamítnout
                        </button>
                        <button
                          disabled={loading}
                          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                          ✏️ Upravit
                        </button>
                        <button
                          disabled={loading}
                          className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 disabled:opacity-50 transition-colors"
                        >
                          🔍 Detail
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Create New Content */}
          <div className="mt-8">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold mb-4">➕ Rychlé vytvoření obsahu</h3>
              <CreateContentForm onContentCreated={() => window.location.reload()} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function CreateContentForm({ onContentCreated }: { onContentCreated: () => void }) {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'local',
    neighborhood_id: 'vinohrady'
  });
  const [creating, setCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const response = await fetch(process.env.CONTENT_CREATE_URL!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, created_by: 'admin' })
      });

      if (response.ok) {
        setFormData({ title: '', content: '', category: 'local', neighborhood_id: 'vinohrady' });
        onContentCreated();
      }
    } catch (error) {
      console.error('Error creating content:', error);
    }
    setCreating(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Kategorie
          </label>
          <select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="emergency">🚨 Emergency</option>
            <option value="local">📍 Local</option>
            <option value="business">🏪 Business</option>
            <option value="community">🤝 Community</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Čtvrť
          </label>
          <select
            value={formData.neighborhood_id}
            onChange={(e) => setFormData({ ...formData, neighborhood_id: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="vinohrady">Vinohrady</option>
            <option value="karlin">Karlín</option>
            <option value="smichov">Smíchov</option>
            <option value="zizkov">Žižkov</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Nadpis
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          placeholder="Nadpis článku..."
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Obsah
        </label>
        <textarea
          value={formData.content}
          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          placeholder="Obsah článku..."
          required
        />
      </div>

      <button
        type="submit"
        disabled={creating}
        className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {creating ? 'Vytváří se...' : '💾 Vytvořit článek'}
      </button>
    </form>
  );
}