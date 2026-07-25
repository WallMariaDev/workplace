import React, { useState } from 'react';
import {
  History,
  Search,
  Trash2,
  Copy,
  RotateCcw,
  Check,
  Clock,
  Zap,
  Download,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { HistoryItem } from '../types';

interface HistoryLogProps {
  history: HistoryItem[];
  onClearHistory: () => void;
  onReRunItem: (item: HistoryItem) => void;
}

export const HistoryLog: React.FC<HistoryLogProps> = ({ history, onClearHistory, onReRunItem }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredHistory = history.filter(
    (item) =>
      item.hotkeyTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.inputText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.outputText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.model.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const exportHistoryCSV = () => {
    if (history.length === 0) return;
    const headers = ['Timestamp', 'Hotkey Title', 'Shortcut', 'Provider', 'Model', 'ExecutionTimeMs', 'InputText', 'OutputText'];
    const rows = history.map((item) => [
      new Date(item.timestamp).toISOString(),
      `"${item.hotkeyTitle.replace(/"/g, '""')}"`,
      `"${item.hotkeyShortcut.replace(/"/g, '""')}"`,
      item.provider,
      item.model,
      item.executionTimeMs,
      `"${item.inputText.replace(/"/g, '""')}"`,
      `"${item.outputText.replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `quickkeys-history-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-amber-600/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <History className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">AI Hotkey Execution History</h2>
          </div>
          <p className="text-xs text-slate-400">
            Log of all captured Windows hotkey triggers, AI response outputs, and execution latency metrics.
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={onClearHistory}
            disabled={history.length === 0}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-rose-900/40 text-slate-300 hover:text-rose-300 disabled:opacity-40 text-xs font-semibold border border-slate-700 transition flex items-center space-x-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search history by keyword, hotkey, or model..."
          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
        />
      </div>

      {/* History Items List */}
      {filteredHistory.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <History className="w-8 h-8 text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-white">No history records found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            When you trigger AI hotkeys in the Sandbox or Windows desktop, your past responses will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredHistory.map((item) => (
            <div
              key={item.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md hover:border-slate-700 transition space-y-3"
            >
              <div className="flex items-center justify-between text-xs border-b border-slate-800/80 pb-2.5">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-white">{item.hotkeyTitle}</span>
                  <kbd className="px-2 py-0.5 bg-slate-950 border border-slate-800 text-[10px] text-indigo-300 rounded font-mono">
                    {item.hotkeyShortcut}
                  </kbd>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {item.provider.toUpperCase()} • {item.model}
                  </span>
                </div>

                <div className="flex items-center space-x-3 text-[11px] text-slate-400 font-mono">
                  <span className="text-emerald-400">{item.executionTimeMs}ms</span>
                  <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>

              {/* Input vs Output Preview Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Input Selection:</span>
                  <p className="mt-1 font-mono text-[11px] text-slate-300 line-clamp-3 whitespace-pre-wrap">
                    {item.inputText}
                  </p>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase">AI Response Output:</span>
                  <p className="mt-1 font-mono text-[11px] text-slate-200 line-clamp-3 whitespace-pre-wrap">
                    {item.outputText}
                  </p>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="flex items-center justify-end space-x-2 pt-1">
                <button
                  onClick={() => onReRunItem(item)}
                  className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold transition flex items-center space-x-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Re-Run</span>
                </button>

                <button
                  onClick={() => handleCopyText(item.id, item.outputText)}
                  className="px-3 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-[11px] font-semibold transition flex items-center space-x-1"
                >
                  {copiedId === item.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedId === item.id ? 'Copied' : 'Copy Output'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
