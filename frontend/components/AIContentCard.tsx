// components/AIContentCard.tsx - Simplified version for deployment
import { useState } from 'react';

interface AIContentCardProps {
  id: string;
  title: string;
  content: string;
  category: string;
  neighborhood: string;
  ai_confidence?: number;
  created_by?: string;
  created_at: number;
  published_at?: number;
  status: string;
  showAIBadge?: boolean;
  showActions?: boolean;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
}

export default function AIContentCard({
  id, title, content, category, neighborhood,
  ai_confidence = 0, created_by = '', created_at, published_at,
  status, showAIBadge = true, showActions = false,
  onApprove, onReject
}: AIContentCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isAIGenerated = created_by?.includes('ai') || ai_confidence > 0;
  const shouldTruncate = content.length > 300;
  const displayContent = isExpanded || !shouldTruncate ? content : content.substring(0, 300) + '...';

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-50';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <article className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{title}</h2>
          
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded border">
              {category}
            </span>
            <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded border">
              📍 {neighborhood}
            </span>
            
            {isAIGenerated && showAIBadge && (
              <>
                <span className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded border font-medium">
                  🤖 AI
                </span>
                {ai_confidence > 0 && (
                  <span className={`px-2 py-1 text-xs rounded border ${getConfidenceColor(ai_confidence)}`}>
                    {(ai_confidence * 100).toFixed(0)}% důvěra
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        {showActions && (onApprove || onReject) && (
          <div className="flex gap-2 ml-4">
            {onApprove && (
              <button onClick={() => onApprove(id)} className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700">
                ✅
              </button>
            )}
            {onReject && (
              <button onClick={() => onReject(id)} className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700">
                ❌
              </button>
            )}
          </div>
        )}
      </div>

      <div className="text-gray-600 mb-4">
        <p>{displayContent}</p>
        {shouldTruncate && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            {isExpanded ? 'Zobrazit méně ↑' : 'Zobrazit více ↓'}
          </button>
        )}
      </div>

      <div className="flex items-center justify-between text-sm text-gray-500 border-t border-gray-100 pt-3">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            {isAIGenerated ? '🤖' : '✍️'}
            {isAIGenerated ? 'AI' : 'Manuální'}
          </span>
          <span>
            🕒 {new Date(published_at || created_at).toLocaleDateString('cs-CZ')}
          </span>
        </div>
      </div>
    </article>
  );
}
