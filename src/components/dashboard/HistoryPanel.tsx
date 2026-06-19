import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';

interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

type FilterType = 'all' | 'subscription' | 'project' | 'payment';

interface HistoryItem {
  _id: string;
  type: string;
  title: string;
  description: string;
  amount?: number;
  status?: string;
  date: number;
  metadata?: any;
}

export function HistoryPanel({ isOpen, onClose }: HistoryPanelProps) {
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');
  
  const history = useQuery(api.client_history.getFullHistory) ?? [];

  if (!isOpen) return null;

  const filteredHistory = history.filter((item: HistoryItem) => {
    const matchesFilter = filter === 'all' || item.type === filter;
    const query = search.toLowerCase();
    const matchesSearch = !search || 
      item.title.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query);
    return matchesFilter && matchesSearch;
  });

  const getTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      subscription: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      project: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      payment: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    };
    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${styles[type] || styles.subscription}`}>
        {type}
      </span>
    );
  };

  const formatAmount = (amount?: number) => {
    if (amount === undefined) return null;
    return <span className="text-emerald-400 font-bold">₦{amount.toLocaleString()}</span>;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-2xl w-full max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-300">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-black text-white">📜 Full History</h2>
            <p className="text-slate-400 text-sm mt-1">View your complete activity history</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-all border border-slate-700"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as FilterType)}
            className="px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500 transition-colors"
          >
            <option value="all">All Types</option>
            <option value="subscription">Subscriptions</option>
            <option value="project">Projects</option>
            <option value="payment">Payments</option>
          </select>
          
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search by title or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
          {filteredHistory.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">📭</div>
              <p className="text-slate-500 text-lg font-bold">No history found</p>
              <p className="text-slate-600 text-sm mt-1">
                {history.length === 0 
                  ? "Start using agents to see your activity here."
                  : "Try adjusting your filters or search query."}
              </p>
            </div>
          ) : (
            filteredHistory.map((item: HistoryItem) => (
              <div
                key={item._id}
                className="p-4 bg-slate-800 rounded-2xl border border-slate-700 hover:border-indigo-500 transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-white truncate">{item.title}</h3>
                      {getTypeBadge(item.type)}
                    </div>
                    <p className="text-sm text-slate-400 line-clamp-2">{item.description}</p>
                  </div>
                  {item.amount !== undefined && (
                    <div className="text-right shrink-0">
                      {formatAmount(item.amount)}
                    </div>
                  )}
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                    {formatDate(item.date)}
                  </span>
                  {item.status && (
                    <span className="text-[10px] text-slate-500 capitalize">
                      Status: {item.status}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-slate-800 text-center">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-800 rounded-xl text-slate-400 text-sm font-bold hover:bg-slate-700 hover:text-white transition-all border border-slate-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
