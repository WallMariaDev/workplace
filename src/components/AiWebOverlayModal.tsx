import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Pin,
  ExternalLink,
  RotateCcw,
  Sparkles,
  Search,
  Copy,
  Check,
  Globe,
  Settings,
  Minimize2,
  Bot,
  Zap,
  ArrowLeft,
  ArrowRight,
  Maximize2,
  Plus,
  Send,
  Layers,
} from 'lucide-react';
import { AppConfig, WebOverlayProfile } from '../types';
import { DEFAULT_WEB_OVERLAY_PROFILES } from '../data/defaults';

interface AiWebOverlayModalProps {
  config: AppConfig;
  isOpen: boolean;
  onClose: () => void;
  activeProfileId?: string | null;
  onSelectProfile?: (profileId: string) => void;
  onShowToast: (msg: string) => void;
  onOpenSettings?: () => void;
}

export const AiWebOverlayModal: React.FC<AiWebOverlayModalProps> = ({
  config,
  isOpen,
  onClose,
  activeProfileId,
  onSelectProfile,
  onShowToast,
  onOpenSettings, }) => {
  const profiles = config.webOverlayProfiles && config.webOverlayProfiles.length > 0
    ? config.webOverlayProfiles
    : DEFAULT_WEB_OVERLAY_PROFILES;

  const [selectedId, setSelectedId] = useState<string>(
    activeProfileId || config.activeWebOverlayProfileId || profiles[0]?.id || 'profile-chatgpt'
  );

  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);
  const [quickPrompt, setQuickPrompt] = useState<string>('');
  const [isPinned, setIsPinned] = useState<boolean>(true);
  const [iframeKey, setIframeKey] = useState<number>(Date.now());
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);

  // Position & Drag state
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const activeProfile = profiles.find((p) => p.id === selectedId) || profiles[0];

  useEffect(() => {
    if (activeProfileId) {
      setSelectedId(activeProfileId);
    }
  }, [activeProfileId]);

  // Handle ESC key to hide overlay
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !activeProfile) return null;

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only drag when clicking on header background, not interactive buttons
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleCopyPrompt = () => {
    if (!quickPrompt.trim()) return;
    navigator.clipboard.writeText(quickPrompt);
    setCopiedPrompt(true);
    onShowToast('Prompt copied to clipboard! Paste directly in AI chat window.');
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(activeProfile.url);
    setCopiedUrl(true);
    onShowToast(`Copied ${activeProfile.name} URL to clipboard`);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const getProviderBadgeColor = (type: string) => {
    switch (type) {
      case 'chatgpt':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'gemini':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'claude':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'perplexity':
        return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
      case 'deepseek':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'grok':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
      default:
        return 'bg-slate-700/40 text-slate-300 border-slate-600/30';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-all"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <div
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`,
          width: `${Math.min(activeProfile.width || 600, window.innerWidth - 32)}px`,
          height: `${Math.min(activeProfile.height || 780, window.innerHeight - 32)}px`,
        }}
        className={`bg-[#12151B] border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100 transition-shadow ${
          isPinned ? 'ring-2 ring-indigo-500/30' : ''
        }`}
      >
        {/* Top Draggable Header Bar */}
        <div
          onMouseDown={handleMouseDown}
          className="bg-[#181C24] px-3.5 py-2.5 border-b border-slate-800 flex items-center justify-between select-none cursor-move"
        >
          {/* Left Title & Status */}
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-xs text-white tracking-wide">
                  {activeProfile.name}
                </span>
                <span
                  className={`px-1.5 py-0.5 text-[10px] font-bold border rounded uppercase ${getProviderBadgeColor(
                    activeProfile.providerType
                  )}`}
                >
                  {activeProfile.providerType}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono truncate max-w-[220px]">
                {activeProfile.url}
              </p>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setIsPinned(!isPinned)}
              title={isPinned ? 'Always on Top (Active)' : 'Pin Always on Top'}
              className={`p-1.5 rounded-lg text-xs transition ${
                isPinned
                  ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Pin className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setIframeKey(Date.now())}
              title="Reload Frame"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleCopyUrl}
              title="Copy Service URL"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>

            <a
              href={activeProfile.url}
              target="_blank"
              rel="noopener noreferrer"
              title="Open in New Desktop Window"
              className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            {onOpenSettings && (
              <button
                onClick={() => {
                  onClose();
                  onOpenSettings();
                }}
                title="Configure Profiles & Shortcuts"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={onClose}
              title="Close Overlay (Esc)"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Provider Switcher Bar */}
        <div className="bg-[#0F1116] px-3 py-1.5 border-b border-slate-800/80 flex items-center space-x-1.5 overflow-x-auto no-scrollbar">
          <span className="text-[10px] text-slate-500 font-medium tracking-wider uppercase px-1">
            Profiles:
          </span>
          {profiles.map((prof) => {
            const isSelected = prof.id === selectedId;
            return (
              <button
                key={prof.id}
                onClick={() => {
                  setSelectedId(prof.id);
                  if (onSelectProfile) onSelectProfile(prof.id);
                }}
                className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <span>{prof.name}</span>
                {prof.shortcut && (
                  <span className="px-1 py-0.2 text-[9px] bg-slate-900 text-slate-400 rounded font-mono">
                    {prof.shortcut}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Main Content Webview / Fallback Simulator Frame */}
        <div className="flex-1 relative bg-[#090A0D] overflow-hidden flex flex-col">
          <iframe
            key={iframeKey}
            src={activeProfile.url}
            title={activeProfile.name}
            className="w-full h-full border-none"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
            allow="clipboard-read; clipboard-write; microphone; camera"
          />

          {/* Iframe Frame Header Warning Overlay Banner */}
          <div className="absolute top-2 right-2 z-10 bg-slate-900/90 border border-slate-700/80 backdrop-blur px-2.5 py-1 rounded-lg text-[10px] text-slate-300 flex items-center space-x-2 shadow-lg">
            <Globe className="w-3 h-3 text-cyan-400 animate-pulse" />
            <span>Web Overlay Live Session</span>
            <a
              href={activeProfile.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 underline hover:text-cyan-300"
            >
              Pop-out Tab ↗
            </a>
          </div>
        </div>

        {/* Bottom Quick Prompt & Command Bar */}
        <div className="bg-[#151820] border-t border-slate-800 p-2.5 space-y-2">
          {/* Quick Preset Chips */}
          <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar pb-0.5 text-[11px]">
            <span className="text-slate-500 font-medium text-[10px] uppercase">Quick Inject:</span>
            <button
              onClick={() => setQuickPrompt('Summarize key points from this discussion clearly with bullet points.')}
              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700/60 whitespace-nowrap cursor-pointer"
            >
              ⚡ Summarize
            </button>
            <button
              onClick={() => setQuickPrompt('Rewrite and polish this text for professional tone and grammar accuracy.')}
              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700/60 whitespace-nowrap cursor-pointer"
            >
              ✍️ Polish Text
            </button>
            <button
              onClick={() => setQuickPrompt('Review this code for edge cases, performance bugs, and cleaner implementation.')}
              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700/60 whitespace-nowrap cursor-pointer"
            >
              💻 Review Code
            </button>
            <button
              onClick={() => setQuickPrompt('Translate this into clear, natural Spanish with accurate terminology.')}
              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700/60 whitespace-nowrap cursor-pointer"
            >
              🌐 Translate
            </button>
          </div>

          {/* Input Box & Copy Trigger */}
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={quickPrompt}
                onChange={(e) => setQuickPrompt(e.target.value)}
                placeholder={`Type or paste prompt for ${activeProfile.name}...`}
                className="w-full bg-[#0C0E12] border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/80"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCopyPrompt();
                  }
                }}
              />
              {quickPrompt && (
                <button
                  onClick={() => setQuickPrompt('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <button
              onClick={handleCopyPrompt}
              disabled={!quickPrompt.trim()}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition shadow-sm cursor-pointer whitespace-nowrap"
            >
              {copiedPrompt ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Prompt</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
