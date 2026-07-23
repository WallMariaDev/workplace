import React, { useState } from 'react';
import {
  Settings,
  Cpu,
  Key,
  Globe,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Sliders,
  Eye,
  EyeOff,
  RefreshCw,
  Layout,
  Volume2,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import { AppConfig, AIProvider, OverlaySettings } from '../types';

interface ProviderSettingsProps {
  config: AppConfig;
  onUpdateProvider: (provider: AIProvider, data: Partial<AppConfig['providers'][AIProvider]>) => void;
  onUpdateOverlaySettings: (settings: Partial<OverlaySettings>) => void;
}

export const ProviderSettings: React.FC<ProviderSettingsProps> = ({
  config,
  onUpdateProvider,
  onUpdateOverlaySettings,
}) => {
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [ollamaTesting, setOllamaTesting] = useState(false);
  const [ollamaStatus, setOllamaStatus] = useState<string | null>(null);

  const toggleShowKey = (providerKey: string) => {
    setShowKeys((prev) => ({ ...prev, [providerKey]: !prev[providerKey] }));
  };

  const testOllamaConnection = async () => {
    setOllamaTesting(true);
    setOllamaStatus(null);
    const url = config.providers.ollama?.baseUrl || 'http://localhost:11434/v1';

    try {
      const res = await fetch(`${url}/models`);
      if (res.ok) {
        setOllamaStatus('Connected successfully! Ollama local AI server is active on port 11434.');
      } else {
        setOllamaStatus(`Connection failed (HTTP ${res.status}). Ensure Ollama is running.`);
      }
    } catch (e: any) {
      setOllamaStatus(
        `Failed to reach Ollama at ${url}. Make sure Ollama is installed on Windows ('ollama run llama3.2').`
      );
    } finally {
      setOllamaTesting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Provider Header Banner */}
      <div className="bg-[#15181E] border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">AI Provider & API Key Manager</h2>
            <p className="text-xs text-slate-400">
              Configure credentials for Google Gemini, OpenAI, Anthropic, or local offline Ollama models.
            </p>
          </div>
        </div>
      </div>

      {/* PROVIDERS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* GOOGLE GEMINI */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              <h3 className="text-base font-bold text-white">Google Gemini API</h3>
            </div>
            <span className="px-2.5 py-0.5 text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
              Server Proxy Active
            </span>
          </div>

          <p className="text-xs text-slate-400">
            Gemini is ready out-of-the-box via server-side proxy! You can also provide a custom Gemini key below.
          </p>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">Custom Gemini API Key (Optional Override)</label>
            <div className="relative flex items-center">
              <Key className="w-4 h-4 absolute left-3 text-slate-500" />
              <input
                type={showKeys['gemini'] ? 'text' : 'password'}
                value={config.providers.gemini?.apiKey || ''}
                onChange={(e) => onUpdateProvider('gemini', { apiKey: e.target.value })}
                placeholder="Leave empty to use AI Studio default secret"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-10 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
              />
              <button
                type="button"
                onClick={() => toggleShowKey('gemini')}
                className="absolute right-3 text-slate-500 hover:text-white"
              >
                {showKeys['gemini'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* OPENAI */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Cpu className="w-5 h-5 text-emerald-400" />
              <h3 className="text-base font-bold text-white">OpenAI (GPT-4o)</h3>
            </div>
            <span className="text-[10px] font-semibold text-slate-400">api.openai.com</span>
          </div>

          <p className="text-xs text-slate-400">
            Direct client-side execution for GPT-4o, GPT-4o-mini, and o3-mini models.
          </p>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">OpenAI API Key</label>
            <div className="relative flex items-center">
              <Key className="w-4 h-4 absolute left-3 text-slate-500" />
              <input
                type={showKeys['openai'] ? 'text' : 'password'}
                value={config.providers.openai?.apiKey || ''}
                onChange={(e) => onUpdateProvider('openai', { apiKey: e.target.value })}
                placeholder="sk-..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-10 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
              />
              <button
                type="button"
                onClick={() => toggleShowKey('openai')}
                className="absolute right-3 text-slate-500 hover:text-white"
              >
                {showKeys['openai'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* ANTHROPIC */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Cpu className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-bold text-white">Anthropic (Claude)</h3>
            </div>
            <span className="text-[10px] font-semibold text-slate-400">api.anthropic.com</span>
          </div>

          <p className="text-xs text-slate-400">
            Direct execution for Claude 3.5 Sonnet and Claude 3.5 Haiku models.
          </p>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">Anthropic API Key</label>
            <div className="relative flex items-center">
              <Key className="w-4 h-4 absolute left-3 text-slate-500" />
              <input
                type={showKeys['anthropic'] ? 'text' : 'password'}
                value={config.providers.anthropic?.apiKey || ''}
                onChange={(e) => onUpdateProvider('anthropic', { apiKey: e.target.value })}
                placeholder="sk-ant-..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-10 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
              />
              <button
                type="button"
                onClick={() => toggleShowKey('anthropic')}
                className="absolute right-3 text-slate-500 hover:text-white"
              >
                {showKeys['anthropic'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* OLLAMA LOCAL LLM */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Cpu className="w-5 h-5 text-cyan-400" />
              <h3 className="text-base font-bold text-white">Ollama (Local Offline LLM)</h3>
            </div>
            <span className="px-2 py-0.5 text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-full">
              No API Key Required
            </span>
          </div>

          <p className="text-xs text-slate-400">
            Run open-source LLMs (Llama 3.2, Mistral, DeepSeek R1) 100% offline on your Windows GPU/CPU.
          </p>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Local Service Base URL</label>
              <input
                type="text"
                value={config.providers.ollama?.baseUrl || 'http://localhost:11434/v1'}
                onChange={(e) => onUpdateProvider('ollama', { baseUrl: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              type="button"
              onClick={testOllamaConnection}
              disabled={ollamaTesting}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition flex items-center space-x-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${ollamaTesting ? 'animate-spin text-cyan-400' : ''}`} />
              <span>{ollamaTesting ? 'Testing Ollama...' : 'Test Local Connection'}</span>
            </button>

            {ollamaStatus && (
              <p className="text-xs font-mono text-cyan-300 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                {ollamaStatus}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* OVERLAY APPEARANCE & BEHAVIOR SETTINGS */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
        <div className="flex items-center space-x-3 border-b border-slate-800 pb-4">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Layout className="w-4 h-4" />
          </div>
          <h3 className="text-base font-bold text-white">Overlay Window Behavior & Styling</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Position Mode */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">Default Overlay Position</label>
            <select
              value={config.overlaySettings.positionMode}
              onChange={(e) =>
                onUpdateOverlaySettings({ positionMode: e.target.value as OverlaySettings['positionMode'] })
              }
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="near_cursor">Near Mouse Cursor / Selection</option>
              <option value="center">Screen Center</option>
              <option value="top_right">Top Right Corner</option>
              <option value="bottom_right">Bottom Right Corner</option>
            </select>
          </div>

          {/* Theme */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">Visual Theme</label>
            <select
              value={config.overlaySettings.theme}
              onChange={(e) =>
                onUpdateOverlaySettings({ theme: e.target.value as OverlaySettings['theme'] })
              }
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="glass_dark">Glassmorphic Dark (Recommended)</option>
              <option value="glass_light">Glassmorphic Light</option>
              <option value="fluent_accent">Windows 11 Fluent</option>
              <option value="cyberpunk">Cyberpunk Neon</option>
            </select>
          </div>

          {/* Width Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold text-slate-300">Window Width</label>
              <span className="font-mono text-indigo-400">{config.overlaySettings.windowWidth}px</span>
            </div>
            <input
              type="range"
              min="420"
              max="720"
              step="20"
              value={config.overlaySettings.windowWidth}
              onChange={(e) => onUpdateOverlaySettings({ windowWidth: parseInt(e.target.value, 10) })}
              className="w-full accent-indigo-500 bg-slate-950 rounded-lg cursor-pointer"
            />
          </div>
        </div>

        {/* Behavior Toggles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2">
          <label className="flex items-center space-x-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
            <input
              type="checkbox"
              checked={config.overlaySettings.autoCloseOnCopy}
              onChange={(e) => onUpdateOverlaySettings({ autoCloseOnCopy: e.target.checked })}
              className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-xs text-slate-300 font-medium">Auto-Close on Copy</span>
          </label>

          <label className="flex items-center space-x-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
            <input
              type="checkbox"
              checked={config.overlaySettings.enableTTS}
              onChange={(e) => onUpdateOverlaySettings({ enableTTS: e.target.checked })}
              className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-xs text-slate-300 font-medium">Audio Read-Aloud (TTS)</span>
          </label>

          <label className="flex items-center space-x-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
            <input
              type="checkbox"
              checked={config.overlaySettings.showTokenCount}
              onChange={(e) => onUpdateOverlaySettings({ showTokenCount: e.target.checked })}
              className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-xs text-slate-300 font-medium">Show Token Estimates</span>
          </label>

          <label className="flex items-center space-x-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
            <input
              type="checkbox"
              checked={config.overlaySettings.alwaysOnTop}
              onChange={(e) => onUpdateOverlaySettings({ alwaysOnTop: e.target.checked })}
              className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-xs text-slate-300 font-medium">Always-On-Top Window</span>
          </label>
        </div>
      </div>
    </div>
  );
};
