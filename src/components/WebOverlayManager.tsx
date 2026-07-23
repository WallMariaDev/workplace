import React, { useState } from 'react';
import {
  Globe,
  Plus,
  Trash2,
  Edit3,
  ExternalLink,
  Check,
  X,
  Keyboard,
  Maximize2,
  Settings,
  Sparkles,
  Bot,
  Play,
  RotateCcw,
  Copy,
  Layers,
  Search,
  Sliders,
  Shield,
  HelpCircle,
} from 'lucide-react';
import { AppConfig, WebOverlayProfile, WebOverlayProviderType } from '../types';
import { DEFAULT_WEB_OVERLAY_PROFILES } from '../data/defaults';

interface WebOverlayManagerProps {
  config: AppConfig;
  onUpdateConfig: (newConfig: AppConfig) => void;
  onShowToast: (msg: string) => void;
  onLaunchOverlay: (profileId: string) => void;
}

export const WebOverlayManager: React.FC<WebOverlayManagerProps> = ({
  config,
  onUpdateConfig,
  onShowToast,
  onLaunchOverlay,
}) => {
  const profiles = config.webOverlayProfiles && config.webOverlayProfiles.length > 0
    ? config.webOverlayProfiles
    : DEFAULT_WEB_OVERLAY_PROFILES;

  const [editingProfile, setEditingProfile] = useState<WebOverlayProfile | null>(null);
  const [isCreating, setIsCreating] = useState<boolean>(false);

  // Form fields
  const [formName, setFormName] = useState<string>('');
  const [formProviderType, setFormProviderType] = useState<WebOverlayProviderType>('chatgpt');
  const [formUrl, setFormUrl] = useState<string>('https://chatgpt.com');
  const [formShortcut, setFormShortcut] = useState<string>('Ctrl + Alt + W');
  const [formWidth, setFormWidth] = useState<number>(580);
  const [formHeight, setFormHeight] = useState<number>(760);
  const [formPosition, setFormPosition] = useState<'near_cursor' | 'center' | 'top_right' | 'bottom_right'>('near_cursor');
  const [formAlwaysOnTop, setFormAlwaysOnTop] = useState<boolean>(true);
  const [formDescription, setFormDescription] = useState<string>('');

  const openNewForm = () => {
    setEditingProfile(null);
    setFormName('New AI Web Assistant');
    setFormProviderType('custom');
    setFormUrl('https://chatgpt.com');
    setFormShortcut('Ctrl + Alt + Shift + A');
    setFormWidth(600);
    setFormHeight(780);
    setFormPosition('near_cursor');
    setFormAlwaysOnTop(true);
    setFormDescription('Custom AI assistant web overlay launcher');
    setIsCreating(true);
  };

  const openEditForm = (prof: WebOverlayProfile) => {
    setEditingProfile(prof);
    setFormName(prof.name);
    setFormProviderType(prof.providerType);
    setFormUrl(prof.url);
    setFormShortcut(prof.shortcut);
    setFormWidth(prof.width || 580);
    setFormHeight(prof.height || 760);
    setFormPosition(prof.position || 'near_cursor');
    setFormAlwaysOnTop(prof.alwaysOnTop ?? true);
    setFormDescription(prof.description || '');
    setIsCreating(true);
  };

  const handleSaveProfile = () => {
    if (!formName.trim() || !formUrl.trim()) {
      onShowToast('Please provide a profile name and valid URL');
      return;
    }

    const updatedProfiles = [...profiles];

    if (editingProfile) {
      // Update existing
      const index = updatedProfiles.findIndex((p) => p.id === editingProfile.id);
      if (index !== -1) {
        updatedProfiles[index] = {
          ...editingProfile,
          name: formName.trim(),
          providerType: formProviderType,
          url: formUrl.trim(),
          shortcut: formShortcut.trim(),
          width: Number(formWidth) || 580,
          height: Number(formHeight) || 760,
          position: formPosition,
          alwaysOnTop: formAlwaysOnTop,
          description: formDescription.trim(),
        };
      }
      onShowToast(`Updated profile "${formName}"`);
    } else {
      // Create new
      const newProf: WebOverlayProfile = {
        id: `web-profile-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: formName.trim(),
        providerType: formProviderType,
        url: formUrl.trim(),
        shortcut: formShortcut.trim(),
        isEnabled: true,
        width: Number(formWidth) || 580,
        height: Number(formHeight) || 760,
        position: formPosition,
        alwaysOnTop: formAlwaysOnTop,
        description: formDescription.trim(),
      };
      updatedProfiles.push(newProf);
      onShowToast(`Created web overlay profile "${formName}"`);
    }

    onUpdateConfig({
      ...config,
      webOverlayProfiles: updatedProfiles,
    });

    setIsCreating(false);
    setEditingProfile(null);
  };

  const handleToggleEnabled = (id: string) => {
    const updated = profiles.map((p) => (p.id === id ? { ...p, isEnabled: !p.isEnabled } : p));
    onUpdateConfig({ ...config, webOverlayProfiles: updated });
    onShowToast('Updated web overlay profile status');
  };

  const handleDeleteProfile = (id: string, name: string) => {
    if (profiles.length <= 1) {
      onShowToast('Cannot delete the last web overlay profile.');
      return;
    }
    const updated = profiles.filter((p) => p.id !== id);
    onUpdateConfig({ ...config, webOverlayProfiles: updated });
    onShowToast(`Deleted profile "${name}"`);
  };

  const handlePresetAdd = (
    name: string,
    providerType: WebOverlayProviderType,
    url: string,
    shortcut: string
  ) => {
    const newProf: WebOverlayProfile = {
      id: `profile-${providerType}-${Date.now()}`,
      name,
      providerType,
      url,
      shortcut,
      isEnabled: true,
      width: 580,
      height: 760,
      position: 'near_cursor',
      alwaysOnTop: true,
      description: `Instant ${name} web overlay profile`,
    };

    onUpdateConfig({
      ...config,
      webOverlayProfiles: [...profiles, newProf],
    });
    onShowToast(`Added preset profile for ${name}!`);
  };

  const getBadgeStyle = (type: WebOverlayProviderType) => {
    switch (type) {
      case 'chatgpt':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'gemini':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'claude':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'perplexity':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      case 'deepseek':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'grok':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Banner & Action */}
      <div className="bg-[#151820] border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Configurable AI Web Overlays
              </h2>
              <p className="text-xs text-slate-400">
                Launch any web-based AI assistant (ChatGPT, Gemini, Claude, Perplexity, DeepSeek, Grok) anywhere in Windows with dedicated global shortcuts.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={openNewForm}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-2 transition shadow-lg shadow-indigo-600/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Custom Web Overlay Profile</span>
          </button>
        </div>
      </div>

      {/* Quick Preset Launcher Bar */}
      <div className="bg-[#111319] border border-slate-800/80 rounded-2xl p-4">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>Quick Add Popular Web AI Services</span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          <button
            onClick={() => handlePresetAdd('ChatGPT', 'chatgpt', 'https://chatgpt.com', 'Ctrl + Alt + W')}
            className="p-3 bg-[#171B24] hover:bg-[#1E2330] border border-slate-800 hover:border-emerald-500/40 rounded-xl text-left transition group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-xs text-emerald-400">ChatGPT</span>
              <Plus className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 transition" />
            </div>
            <p className="text-[10px] text-slate-400">OpenAI Web Chat</p>
          </button>

          <button
            onClick={() => handlePresetAdd('Gemini', 'gemini', 'https://gemini.google.com', 'Ctrl + Alt + G')}
            className="p-3 bg-[#171B24] hover:bg-[#1E2330] border border-slate-800 hover:border-blue-500/40 rounded-xl text-left transition group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-xs text-blue-400">Gemini</span>
              <Plus className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-400 transition" />
            </div>
            <p className="text-[10px] text-slate-400">Google AI Search</p>
          </button>

          <button
            onClick={() => handlePresetAdd('Perplexity', 'perplexity', 'https://www.perplexity.ai', 'Ctrl + Alt + X')}
            className="p-3 bg-[#171B24] hover:bg-[#1E2330] border border-slate-800 hover:border-cyan-500/40 rounded-xl text-left transition group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-xs text-cyan-400">Perplexity</span>
              <Plus className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 transition" />
            </div>
            <p className="text-[10px] text-slate-400">Realtime Research</p>
          </button>

          <button
            onClick={() => handlePresetAdd('Claude', 'claude', 'https://claude.ai', 'Ctrl + Alt + K')}
            className="p-3 bg-[#171B24] hover:bg-[#1E2330] border border-slate-800 hover:border-amber-500/40 rounded-xl text-left transition group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-xs text-amber-400">Claude</span>
              <Plus className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 transition" />
            </div>
            <p className="text-[10px] text-slate-400">Anthropic Writing</p>
          </button>

          <button
            onClick={() => handlePresetAdd('DeepSeek', 'deepseek', 'https://chat.deepseek.com', 'Ctrl + Alt + D')}
            className="p-3 bg-[#171B24] hover:bg-[#1E2330] border border-slate-800 hover:border-purple-500/40 rounded-xl text-left transition group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-xs text-purple-400">DeepSeek</span>
              <Plus className="w-3.5 h-3.5 text-slate-500 group-hover:text-purple-400 transition" />
            </div>
            <p className="text-[10px] text-slate-400">Reasoning & Code</p>
          </button>

          <button
            onClick={() => handlePresetAdd('Grok', 'grok', 'https://x.com/i/grok', 'Ctrl + Alt + Q')}
            className="p-3 bg-[#171B24] hover:bg-[#1E2330] border border-slate-800 hover:border-rose-500/40 rounded-xl text-left transition group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-xs text-rose-400">Grok</span>
              <Plus className="w-3.5 h-3.5 text-slate-500 group-hover:text-rose-400 transition" />
            </div>
            <p className="text-[10px] text-slate-400">xAI Realtime Intelligence</p>
          </button>
        </div>
      </div>

      {/* Profile List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {profiles.map((prof) => (
          <div
            key={prof.id}
            className={`bg-[#151820] border rounded-2xl p-5 flex flex-col justify-between transition ${
              prof.isEnabled
                ? 'border-slate-800 hover:border-slate-700 shadow-md'
                : 'border-slate-900/60 opacity-60'
            }`}
          >
            <div>
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-white tracking-wide">{prof.name}</h4>
                    <span
                      className={`inline-block px-1.5 py-0.2 text-[9px] font-bold border rounded uppercase mt-0.5 ${getBadgeStyle(
                        prof.providerType
                      )}`}
                    >
                      {prof.providerType}
                    </span>
                  </div>
                </div>

                {/* Toggle switch */}
                <button
                  onClick={() => handleToggleEnabled(prof.id)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition cursor-pointer ${
                    prof.isEnabled
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-800 text-slate-500 border border-slate-700'
                  }`}
                >
                  {prof.isEnabled ? 'ACTIVE' : 'OFF'}
                </button>
              </div>

              {/* Description & Target URL */}
              <p className="text-xs text-slate-400 mb-3 line-clamp-2">
                {prof.description || 'Custom web overlay assistant launcher.'}
              </p>

              <div className="bg-[#0C0E12] border border-slate-800 rounded-xl p-2.5 space-y-2 mb-4">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span className="text-slate-500 text-[11px]">URL:</span>
                  <a
                    href={prof.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-cyan-400 text-[11px] truncate max-w-[200px] hover:underline"
                  >
                    {prof.url}
                  </a>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span className="text-slate-500 text-[11px]">Shortcut:</span>
                  <kbd className="px-2 py-0.5 bg-slate-900 border border-slate-700 text-indigo-300 rounded font-mono text-[11px] uppercase">
                    {prof.shortcut || 'None'}
                  </kbd>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span className="text-slate-500 text-[11px]">Window Size:</span>
                  <span className="font-mono text-[11px] text-slate-400">
                    {prof.width || 580} × {prof.height || 760}px
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
              <button
                onClick={() => onLaunchOverlay(prof.id)}
                className="px-3 py-1.5 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 text-cyan-300 rounded-xl text-xs font-medium flex items-center space-x-1.5 transition cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-cyan-400" />
                <span>Test Overlay</span>
              </button>

              <div className="flex items-center space-x-1">
                <button
                  onClick={() => openEditForm(prof)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                  title="Edit Profile"
                >
                  <Edit3 className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleDeleteProfile(prof.id, prof.name)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                  title="Delete Profile"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Form for Create / Edit */}
      {isCreating && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#151820] border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white flex items-center space-x-2">
                <Globe className="w-4 h-4 text-cyan-400" />
                <span>{editingProfile ? 'Edit Web Overlay Profile' : 'New Web Overlay Profile'}</span>
              </h3>
              <button
                onClick={() => setIsCreating(false)}
                className="text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Profile Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. ChatGPT Assistant, Perplexity Search, Custom AI"
                  className="w-full bg-[#0C0E12] border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Provider Type</label>
                  <select
                    value={formProviderType}
                    onChange={(e) => {
                      const type = e.target.value as WebOverlayProviderType;
                      setFormProviderType(type);
                      if (type === 'chatgpt') setFormUrl('https://chatgpt.com');
                      if (type === 'gemini') setFormUrl('https://gemini.google.com');
                      if (type === 'claude') setFormUrl('https://claude.ai');
                      if (type === 'perplexity') setFormUrl('https://www.perplexity.ai');
                      if (type === 'deepseek') setFormUrl('https://chat.deepseek.com');
                      if (type === 'grok') setFormUrl('https://x.com/i/grok');
                    }}
                    className="w-full bg-[#0C0E12] border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="chatgpt">ChatGPT (OpenAI)</option>
                    <option value="gemini">Gemini (Google)</option>
                    <option value="claude">Claude (Anthropic)</option>
                    <option value="perplexity">Perplexity AI</option>
                    <option value="deepseek">DeepSeek AI</option>
                    <option value="grok">Grok (xAI)</option>
                    <option value="custom">Custom Web Application</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Global Keyboard Shortcut</label>
                  <input
                    type="text"
                    value={formShortcut}
                    onChange={(e) => setFormShortcut(e.target.value)}
                    placeholder="e.g. Ctrl + Alt + W"
                    className="w-full bg-[#0C0E12] border border-slate-700 rounded-xl px-3 py-2 text-indigo-300 font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Target Web Application URL</label>
                <input
                  type="text"
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  placeholder="https://chatgpt.com or internal URL"
                  className="w-full bg-[#0C0E12] border border-slate-700 rounded-xl px-3 py-2 font-mono text-cyan-300 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Window Width (px)</label>
                  <input
                    type="number"
                    value={formWidth}
                    onChange={(e) => setFormWidth(Number(e.target.value))}
                    className="w-full bg-[#0C0E12] border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Window Height (px)</label>
                  <input
                    type="number"
                    value={formHeight}
                    onChange={(e) => setFormHeight(Number(e.target.value))}
                    className="w-full bg-[#0C0E12] border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Description</label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Purpose of this overlay profile..."
                  className="w-full bg-[#0C0E12] border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="alwaysOnTopCheck"
                  checked={formAlwaysOnTop}
                  onChange={(e) => setFormAlwaysOnTop(e.target.checked)}
                  className="rounded border-slate-700 bg-[#0C0E12] text-indigo-600 focus:ring-0"
                />
                <label htmlFor="alwaysOnTopCheck" className="text-slate-300">
                  Keep window Always On Top when triggered
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProfile}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition shadow-md shadow-indigo-600/30"
              >
                Save Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
