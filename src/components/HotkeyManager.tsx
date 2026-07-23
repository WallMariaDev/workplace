import React, { useState } from 'react';
import {
  Keyboard,
  Plus,
  Search,
  Zap,
  Edit3,
  Copy,
  Trash2,
  Sparkles,
  Cpu,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Volume2,
  ArrowRightLeft,
  Filter,
} from 'lucide-react';
import { HotkeyPreset, AIProvider } from '../types';

interface HotkeyManagerProps {
  hotkeys: HotkeyPreset[];
  onAddPreset: () => void;
  onEditPreset: (preset: HotkeyPreset) => void;
  onTogglePreset: (id: string, isEnabled: boolean) => void;
  onClonePreset: (preset: HotkeyPreset) => void;
  onDeletePreset: (id: string) => void;
  onTestPreset: (preset: HotkeyPreset) => void;
}

export const HotkeyManager: React.FC<HotkeyManagerProps> = ({
  hotkeys,
  onAddPreset,
  onEditPreset,
  onTogglePreset,
  onClonePreset,
  onDeletePreset,
  onTestPreset,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [expandedPresetId, setExpandedPresetId] = useState<string | null>(null);

  const categories = ['All', 'Editing', 'Coding', 'Summarization', 'Translation', 'Productivity', 'Custom'];

  const filteredHotkeys = hotkeys.filter((preset) => {
    const matchesCategory = selectedCategory === 'All' || preset.category === selectedCategory;
    const matchesSearch =
      preset.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      preset.comboString.toLowerCase().includes(searchQuery.toLowerCase()) ||
      preset.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
      preset.model.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Controls */}
      <div className="bg-[#15181E] border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Keyboard className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-white tracking-tight">Windows AI Hotkey Workflows</h2>
            </div>
            <p className="text-xs text-slate-400 max-w-2xl">
              Configure system-wide hotkeys (<code className="text-indigo-400 font-mono">Ctrl + Alt + P</code>, <code className="text-indigo-400 font-mono">Alt + Space</code>, etc.) to trigger AI prompts on selected text anywhere in Windows.
            </p>
          </div>

          <button
            id="add-preset-btn"
            onClick={onAddPreset}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-lg shadow-indigo-600/20 transition flex items-center justify-center space-x-2 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Hotkey Action</span>
          </button>
        </div>

        {/* Search & Category Filter */}
        <div className="mt-6 pt-5 border-t border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by action name, hotkey (e.g. 'Ctrl + Alt + P'), or model..."
              className="w-full bg-[#0F1115] border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-1">
            <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0 mr-1" />
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                  selectedCategory === cat
                    ? 'bg-indigo-600/20 border border-indigo-500/40 text-indigo-300'
                    : 'bg-[#0F1115] border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Hotkeys Grid */}
      {filteredHotkeys.length === 0 ? (
        <div className="bg-[#15181E] border border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-800/80 mx-auto flex items-center justify-center text-slate-500">
            <Keyboard className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-white">No hotkeys match your criteria</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Try adjusting your search query or filter category, or create a brand new hotkey action preset.
          </p>
          <button
            onClick={onAddPreset}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-500 transition"
          >
            Add New Hotkey Preset
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredHotkeys.map((preset) => {
            const isExpanded = expandedPresetId === preset.id;

            return (
              <div
                key={preset.id}
                className={`border rounded-xl p-5 transition-all shadow-md relative group ${
                  preset.isEnabled
                    ? 'bg-[#15181E] border-slate-800 hover:border-indigo-600/40'
                    : 'bg-[#15181E]/40 border-slate-800/50 opacity-60'
                }`}
              >
                {/* Top Row: Title, Category Badge, Enable Toggle */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 rounded border border-slate-700">
                        {preset.category}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {preset.provider.toUpperCase()} • {preset.model}
                      </span>
                    </div>
                    <h3 className="text-base font-semibold text-white tracking-tight">{preset.title}</h3>
                  </div>

                  {/* Enable Switch */}
                  <button
                    onClick={() => onTogglePreset(preset.id, !preset.isEnabled)}
                    title={preset.isEnabled ? 'Active (Click to Disable)' : 'Disabled (Click to Enable)'}
                    className={`w-11 h-6 rounded-full p-1 transition-colors relative shrink-0 ${
                      preset.isEnabled ? 'bg-indigo-600' : 'bg-slate-800'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform ${
                        preset.isEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Hotkey Combination Chip Bar */}
                <div className="mt-4 flex items-center justify-between bg-[#0F1115] border border-slate-800 rounded-xl p-3">
                  <div className="flex items-center space-x-1.5">
                    {preset.comboString.split(' + ').map((k, i) => (
                      <kbd
                        key={i}
                        className="px-2.5 py-1 bg-[#1A1D23] border border-slate-700 text-xs font-bold text-indigo-400 rounded-md shadow-sm font-mono tracking-wider uppercase"
                      >
                        {k}
                      </kbd>
                    ))}
                  </div>

                  {/* Test Button */}
                  <button
                    onClick={() => onTestPreset(preset)}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-medium transition flex items-center space-x-1.5"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    <span>Test Overlay</span>
                  </button>
                </div>

                {/* Prompt Template Snippet */}
                <div className="mt-3 text-xs text-slate-400 font-mono line-clamp-2 bg-[#0F1115]/60 p-2.5 rounded-lg border border-slate-800/80">
                  {preset.promptTemplate}
                </div>

                {/* Collapsible Details */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-slate-800 space-y-2 text-xs text-slate-300 animate-fadeIn">
                    {preset.systemPrompt && (
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500">System Persona:</span>
                        <p className="text-slate-400 text-[11px] font-mono mt-0.5">{preset.systemPrompt}</p>
                      </div>
                    )}
                    <div className="flex items-center space-x-4 text-[11px] text-slate-400 pt-1">
                      <span>Temp: {preset.temperature}</span>
                      <span>Mode: {preset.overlayMode}</span>
                      {preset.autoCopy && <span className="text-emerald-400">Auto-Copy ON</span>}
                      {preset.autoReplace && <span className="text-indigo-400">Auto-Replace ON</span>}
                      {preset.enableTTS && <span className="text-amber-400">TTS Audio ON</span>}
                    </div>
                  </div>
                )}

                {/* Card Action Bar */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <button
                    onClick={() => setExpandedPresetId(isExpanded ? null : preset.id)}
                    className="text-[11px] font-semibold text-slate-400 hover:text-white flex items-center space-x-1 transition"
                  >
                    <span>{isExpanded ? 'Hide Config' : 'View Full Config'}</span>
                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => onEditPreset(preset)}
                      title="Edit Preset"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onClonePreset(preset)}
                      title="Duplicate Preset"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeletePreset(preset.id)}
                      title="Delete Preset"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
