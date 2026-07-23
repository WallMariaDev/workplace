import React, { useState, useEffect } from 'react';
import {
  X,
  Keyboard,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Layers,
  Volume2,
  Copy,
  Repeat,
  Sliders,
  HelpCircle,
} from 'lucide-react';
import { HotkeyPreset, AIProvider, OverlayMode, OutputAction } from '../types';
import { AVAILABLE_MODELS, OS_RESERVED_KEYS } from '../data/defaults';
import { formatComboString } from '../services/storageService';

interface HotkeyRecorderModalProps {
  isOpen: boolean;
  editingPreset: HotkeyPreset | null;
  existingPresets: HotkeyPreset[];
  onSave: (preset: HotkeyPreset) => void;
  onClose: () => void;
}

const CATEGORIES: HotkeyPreset['category'][] = [
  'Editing',
  'Coding',
  'Summarization',
  'Translation',
  'Productivity',
  'Custom',
];

const PROMPT_TEMPLATES_PRESETS = [
  {
    name: 'Executive Summary',
    template: 'Provide a concise executive summary with bulleted key takeaways for the following text:\n\n"{text}"',
  },
  {
    name: 'Grammar & Polish',
    template: 'Proofread and rewrite the following text to improve grammar, conciseness, and clarity:\n\n"{text}"',
  },
  {
    name: 'Code Refactor',
    template: 'Analyze the following code snippet. Fix bugs, optimize efficiency, and provide clean refactored code:\n\n```\n{text}\n```',
  },
  {
    name: 'Translate to Spanish',
    template: 'Translate the following text into fluent, natural Spanish:\n\n"{text}"',
  },
  {
    name: 'Action Items Extractor',
    template: 'Extract all actionable tasks and deadlines from the following content as a clean check-list:\n\n"{text}"',
  },
  {
    name: 'Explain Like I\'m 5',
    template: 'Explain the core concept in the following text using simple everyday analogies:\n\n"{text}"',
  },
];

export const HotkeyRecorderModal: React.FC<HotkeyRecorderModalProps> = ({
  isOpen,
  editingPreset,
  existingPresets,
  onSave,
  onClose,
}) => {
  if (!isOpen) return null;

  const [title, setTitle] = useState(editingPreset?.title || 'New AI Hotkey Action');
  const [category, setCategory] = useState<HotkeyPreset['category']>(editingPreset?.category || 'Productivity');
  const [provider, setProvider] = useState<AIProvider>(editingPreset?.provider || 'gemini');
  const [model, setModel] = useState<string>(editingPreset?.model || 'gemini-3.6-flash');
  const [promptTemplate, setPromptTemplate] = useState<string>(
    editingPreset?.promptTemplate || 'Please analyze and assist with the following text:\n\n"{text}"'
  );
  const [systemPrompt, setSystemPrompt] = useState<string>(editingPreset?.systemPrompt || '');
  const [temperature, setTemperature] = useState<number>(editingPreset?.temperature ?? 0.7);
  const [autoCopy, setAutoCopy] = useState<boolean>(editingPreset?.autoCopy ?? false);
  const [autoReplace, setAutoReplace] = useState<boolean>(editingPreset?.autoReplace ?? false);
  const [enableTTS, setEnableTTS] = useState<boolean>(editingPreset?.enableTTS ?? false);
  const [overlayMode, setOverlayMode] = useState<OverlayMode>(editingPreset?.overlayMode || 'expanded');
  const [outputAction, setOutputAction] = useState<OutputAction>(editingPreset?.outputAction || 'show_overlay');

  // Hotkey Recording State
  const [isRecordingKeys, setIsRecordingKeys] = useState<boolean>(false);
  const [keys, setKeys] = useState<HotkeyPreset['keys']>(
    editingPreset?.keys || {
      ctrlKey: true,
      altKey: true,
      shiftKey: false,
      metaKey: false,
      key: 'p',
      code: 'KeyP',
    }
  );

  const comboString = formatComboString(keys);

  // Check conflicts
  const isReservedOSKey = OS_RESERVED_KEYS.some((rk) => rk.toLowerCase() === comboString.toLowerCase());
  const conflictPreset = existingPresets.find(
    (p) => p.id !== editingPreset?.id && p.comboString.toLowerCase() === comboString.toLowerCase()
  );

  // Handle key recording listener
  useEffect(() => {
    if (!isRecordingKeys) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Skip lone modifier presses
      if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
        return;
      }

      const keyName = e.key.length === 1 ? e.key.toLowerCase() : e.key.toLowerCase();

      setKeys({
        ctrlKey: e.ctrlKey,
        altKey: e.altKey,
        shiftKey: e.shiftKey,
        metaKey: e.metaKey,
        key: keyName,
        code: e.code,
      });

      setIsRecordingKeys(false);
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isRecordingKeys]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const savedPreset: HotkeyPreset = {
      id: editingPreset?.id || `preset-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: title.trim(),
      category,
      keys,
      comboString,
      provider,
      model,
      promptTemplate,
      systemPrompt: systemPrompt.trim(),
      temperature,
      isEnabled: editingPreset ? editingPreset.isEnabled : true,
      autoCopy,
      autoReplace,
      enableTTS,
      overlayMode,
      outputAction,
      updatedAt: Date.now(),
    };

    onSave(savedPreset);
  };

  const filteredModels = AVAILABLE_MODELS.filter((m) => m.provider === provider);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 sticky top-0 bg-slate-900/95 backdrop-blur z-10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {editingPreset ? 'Edit Hotkey Action' : 'Create New AI Hotkey Preset'}
              </h2>
              <p className="text-xs text-slate-400">
                Configure global hotkey trigger, AI provider, and prompt instructions
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSave} className="p-6 space-y-6 flex-1">
          {/* Title & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Action Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Summarize & Key Points"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as HotkeyPreset['category'])}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* HOTKEY RECORDING BOX */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                <Keyboard className="w-4 h-4 text-indigo-400" />
                <span>Hotkey Key Combination</span>
              </label>
              <span className="text-[11px] text-slate-400">Click box below and press keys</span>
            </div>

            <div
              onClick={() => setIsRecordingKeys(true)}
              className={`relative cursor-pointer flex items-center justify-between px-5 py-3.5 rounded-xl border transition-all ${
                isRecordingKeys
                  ? 'bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/30'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                {isRecordingKeys ? (
                  <span className="text-sm font-medium text-indigo-300 animate-pulse flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping" />
                    <span>Press key combination now (e.g. Ctrl + Alt + P)...</span>
                  </span>
                ) : (
                  <div className="flex items-center space-x-2">
                    {comboString.split(' + ').map((k, i) => (
                      <kbd
                        key={i}
                        className="px-3 py-1 bg-slate-800 border border-slate-700 text-xs font-bold text-indigo-300 rounded-lg shadow-sm"
                      >
                        {k}
                      </kbd>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition ${
                  isRecordingKeys
                    ? 'bg-indigo-600 text-white border-indigo-500'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                {isRecordingKeys ? 'Recording...' : 'Click to Re-record'}
              </button>
            </div>

            {/* Warnings / Conflicts */}
            {isReservedOSKey && (
              <div className="flex items-center space-x-2 p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-lg text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  Warning: <strong>{comboString}</strong> is a reserved system shortcut in Windows.
                </span>
              </div>
            )}

            {conflictPreset && (
              <div className="flex items-center space-x-2 p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-lg text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  Conflict: <strong>{comboString}</strong> is already assigned to "{conflictPreset.title}".
                </span>
              </div>
            )}
          </div>

          {/* AI Provider & Model selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                <Cpu className="w-3.5 h-3.5 text-purple-400" />
                <span>AI Provider</span>
              </label>
              <select
                value={provider}
                onChange={(e) => {
                  const newProv = e.target.value as AIProvider;
                  setProvider(newProv);
                  const defaultM = AVAILABLE_MODELS.find((m) => m.provider === newProv)?.id || '';
                  setModel(defaultM);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="gemini">Google Gemini (Recommended)</option>
                <option value="openai">OpenAI (GPT-4o)</option>
                <option value="anthropic">Anthropic (Claude 3.5)</option>
                <option value="ollama">Ollama (Local Offline LLM)</option>
                <option value="openrouter">OpenRouter / Groq</option>
                <option value="custom">Custom Endpoint</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Target AI Model</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                {filteredModels.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.maxTokens / 1000}k ctx)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Starter Templates Pill Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300">
                Prompt Template (Use <code className="text-indigo-400 bg-slate-950 px-1 py-0.5 rounded">&#123;text&#125;</code> for selected text)
              </label>
              <span className="text-[11px] text-slate-400">Quick Starters:</span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {PROMPT_TEMPLATES_PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => setPromptTemplate(p.template)}
                  className="px-2.5 py-1 text-[11px] font-medium bg-slate-950 hover:bg-indigo-950/60 border border-slate-800 hover:border-indigo-500/40 text-slate-300 hover:text-indigo-300 rounded-lg transition"
                >
                  + {p.name}
                </button>
              ))}
            </div>

            <textarea
              rows={4}
              value={promptTemplate}
              onChange={(e) => setPromptTemplate(e.target.value)}
              placeholder='e.g. Rewrite the following text to improve grammar and conciseness:\n\n"{text}"'
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* System Prompt & Temperature Slider */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">System Persona / Instructions (Optional)</label>
              <input
                type="text"
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="e.g. You are a senior code reviewer. Be concise and practical."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">Temperature</label>
                <span className="text-xs text-indigo-400 font-mono">{temperature}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full accent-indigo-500 bg-slate-950 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>Exact (0.0)</span>
                <span>Creative (1.0)</span>
              </div>
            </div>
          </div>

          {/* Overlay Display Mode & Post-Trigger Actions */}
          <div className="border-t border-slate-800 pt-5 space-y-4">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Overlay Window & Post-Trigger Options
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setOverlayMode('expanded')}
                className={`p-3 rounded-xl border text-left transition ${
                  overlayMode === 'expanded'
                    ? 'bg-indigo-950/40 border-indigo-500 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="text-xs font-bold">Expanded Window</div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Full panel with markdown, follow-up chat, & diff view.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setOverlayMode('compact')}
                className={`p-3 rounded-xl border text-left transition ${
                  overlayMode === 'compact'
                    ? 'bg-indigo-950/40 border-indigo-500 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="text-xs font-bold">Compact Floating Bar</div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Minimalist float popup for quick 1-2 sentence edits.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setOverlayMode('minimal')}
                className={`p-3 rounded-xl border text-left transition ${
                  overlayMode === 'minimal'
                    ? 'bg-indigo-950/40 border-indigo-500 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="text-xs font-bold">Minimal Pip</div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Floating mini pill at cursor with single click copy.
                </p>
              </button>
            </div>

            {/* Checkbox Toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <label className="flex items-center space-x-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoCopy}
                  onChange={(e) => setAutoCopy(e.target.checked)}
                  className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs text-slate-300 font-medium">Auto-Copy Output</span>
              </label>

              <label className="flex items-center space-x-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoReplace}
                  onChange={(e) => setAutoReplace(e.target.checked)}
                  className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs text-slate-300 font-medium">Auto-Replace Selection</span>
              </label>

              <label className="flex items-center space-x-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableTTS}
                  onChange={(e) => setEnableTTS(e.target.checked)}
                  className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs text-slate-300 font-medium">Audio TTS Read-Aloud</span>
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition flex items-center space-x-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{editingPreset ? 'Update Hotkey Action' : 'Save Hotkey Preset'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
