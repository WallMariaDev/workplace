import React, { useState, useEffect } from 'react';
import {
  X,
  Copy,
  Check,
  RotateCcw,
  Volume2,
  VolumeX,
  Send,
  Sparkles,
  AlertCircle,
  Cpu,
  Minimize2,
  Pin,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileCode2,
  Layers,
  ArrowRightLeft,
  Wand2,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { HotkeyPreset, AIProvider, AppContextType } from '../types';

interface FloatingOverlayWindowProps {
  isOpen: boolean;
  preset: HotkeyPreset | null;
  inputText: string;
  outputText: string;
  isGenerating: boolean;
  error: string | null;
  executionTimeMs: number;
  appContext?: AppContextType;
  position?: { x: number; y: number };
  onClose: () => void;
  onCopy: (text: string) => void;
  onReplaceText?: (text: string) => void;
  onRegenerate: () => void;
  onFollowUp: (followUpQuery: string) => void;
  onSwitchProvider?: (provider: AIProvider, model: string) => void;
}

export const FloatingOverlayWindow: React.FC<FloatingOverlayWindowProps> = ({
  isOpen,
  preset,
  inputText,
  outputText,
  isGenerating,
  error,
  executionTimeMs,
  appContext = 'word',
  position = { x: 320, y: 120 },
  onClose,
  onCopy,
  onReplaceText,
  onRegenerate,
  onFollowUp,
  onSwitchProvider,
}) => {
  if (!isOpen || !preset) return null;

  const [copied, setCopied] = useState(false);
  const [replaced, setReplaced] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPinned, setIsPinned] = useState(true);
  const [showInputPreview, setShowInputPreview] = useState(false);
  const [showDiffView, setShowDiffView] = useState(false);
  const [followUpInput, setFollowUpInput] = useState('');

  // Handle ESC key close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isPinned) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPinned, onClose]);

  const handleCopyClick = () => {
    onCopy(outputText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReplaceClick = () => {
    if (onReplaceText) {
      onReplaceText(outputText);
      setReplaced(true);
      setTimeout(() => setReplaced(false), 2000);
    }
  };

  const toggleSpeech = () => {
    if (!('speechSynthesis' in window)) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      const utterance = new SpeechSynthesisUtterance(outputText);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };

  const handleFollowUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpInput.trim() || isGenerating) return;
    onFollowUp(followUpInput.trim());
    setFollowUpInput('');
  };

  const getAppContextLabel = (ctx: AppContextType) => {
    switch (ctx) {
      case 'word':
        return 'MS Word Document';
      case 'vscode':
        return 'VS Code Editor';
      case 'browser':
        return 'Web Browser';
      case 'scratchpad':
        return 'Notepad / Scratchpad';
      default:
        return 'Windows App';
    }
  };

  return (
    <div
      style={{
        top: `${position.y}px`,
        left: `${position.x}px`,
      }}
      className="fixed z-50 w-full max-w-xl bg-[#1A1D23] border border-slate-700 rounded-2xl shadow-2xl text-slate-100 overflow-hidden flex flex-col transition-all duration-200 animate-in fade-in zoom-in-95 ring-4 ring-black/30"
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#15181E] border-b border-slate-700 select-none">
        <div className="flex items-center space-x-2.5 overflow-hidden">
          <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center text-white text-xs font-bold italic shadow">
            Q
          </div>
          <div className="truncate">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-white truncate">{preset.title}</span>
              <span className="px-2 py-0.5 text-[10px] font-mono bg-[#0F1115] text-indigo-400 rounded border border-slate-800">
                {preset.comboString}
              </span>
            </div>
            <div className="flex items-center space-x-2 text-[10px] text-slate-400">
              <span className="capitalize">{preset.provider}</span>
              <span>•</span>
              <span className="truncate">{preset.model}</span>
              <span>•</span>
              <span className="text-slate-500">{getAppContextLabel(appContext)}</span>
            </div>
          </div>
        </div>

        {/* Window Controls */}
        <div className="flex items-center space-x-1 shrink-0">
          <button
            onClick={() => setIsPinned(!isPinned)}
            title={isPinned ? 'Window Pinned (Click to unpin)' : 'Pin Overlay'}
            className={`p-1.5 rounded-lg text-xs transition ${
              isPinned ? 'text-indigo-400 bg-indigo-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Pin className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            title="Close Overlay (Esc)"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-rose-500/20 hover:text-rose-400 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Input Preview Bar (Collapsible) */}
      <div className="bg-slate-950/40 border-b border-slate-800/60 px-4 py-2 text-xs">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowInputPreview(!showInputPreview)}
            className="flex items-center space-x-1.5 text-slate-400 hover:text-slate-200 transition text-[11px]"
          >
            {showInputPreview ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            <span>Captured Selected Text ({inputText.length} chars)</span>
          </button>

          {outputText && (
            <button
              onClick={() => setShowDiffView(!showDiffView)}
              className={`text-[10px] px-2 py-0.5 rounded border transition flex items-center space-x-1 ${
                showDiffView
                  ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              <ArrowRightLeft className="w-3 h-3" />
              <span>Diff View</span>
            </button>
          )}
        </div>

        {showInputPreview && (
          <div className="mt-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 font-mono text-[11px] text-slate-300 max-h-24 overflow-y-auto whitespace-pre-wrap">
            {inputText || '<No text selected>'}
          </div>
        )}
      </div>

      {/* Main Content Body */}
      <div className="p-4 max-h-[360px] overflow-y-auto space-y-3 font-sans">
        {/* Loading State */}
        {isGenerating && (
          <div className="flex flex-col items-center justify-center py-8 space-y-3">
            <div className="relative w-12 h-12 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
              <Wand2 className="w-5 h-5 text-indigo-400 animate-bounce" />
            </div>
            <div className="text-center">
              <p className="text-xs font-semibold text-slate-200">
                Generating response with {preset.provider.toUpperCase()}...
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Processing prompt instructions and text context</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {!isGenerating && error && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 text-xs space-y-3">
            <div className="flex items-start space-x-2.5 text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <div>
                <h4 className="font-bold text-rose-200">AI Execution Error</h4>
                <p className="mt-1 text-slate-300">{error}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-rose-500/20">
              <button
                onClick={onRegenerate}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-lg text-[11px] transition"
              >
                Retry Request
              </button>
              {onSwitchProvider && (
                <button
                  onClick={() => onSwitchProvider('gemini', 'gemini-3.6-flash')}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg text-[11px] border border-slate-700 transition"
                >
                  Switch to Free Gemini Proxy
                </button>
              )}
            </div>
          </div>
        )}

        {/* Output Render State */}
        {!isGenerating && !error && outputText && (
          <>
            {showDiffView ? (
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                  <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Original Text</div>
                  <p className="font-mono text-[11px] text-rose-300/90 whitespace-pre-wrap">{inputText}</p>
                </div>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                  <div className="text-[10px] font-bold text-emerald-400 uppercase mb-1">AI Transformed Output</div>
                  <p className="font-mono text-[11px] text-emerald-300 whitespace-pre-wrap">{outputText}</p>
                </div>
              </div>
            ) : (
              <div className="prose prose-invert prose-xs max-w-none text-slate-200 leading-relaxed">
                <ReactMarkdown>{outputText}</ReactMarkdown>
              </div>
            )}
          </>
        )}
      </div>

      {/* Follow-up Prompt Chat Input */}
      {!isGenerating && !error && outputText && (
        <form onSubmit={handleFollowUpSubmit} className="px-4 py-2 bg-slate-950/60 border-t border-slate-800/80">
          <div className="relative flex items-center">
            <input
              type="text"
              value={followUpInput}
              onChange={(e) => setFollowUpInput(e.target.value)}
              placeholder="Ask follow-up / Refine result (e.g. 'Make it shorter', 'Translate to French')..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-3 pr-10 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={!followUpInput.trim()}
              className="absolute right-1.5 p-1 rounded-lg text-indigo-400 hover:text-white hover:bg-indigo-600 disabled:opacity-40 transition"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      )}

      {/* Footer Actions */}
      <div className="px-4 py-2.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2 text-[10px] text-slate-400">
          {executionTimeMs > 0 && (
            <span className="font-mono text-emerald-400">{executionTimeMs}ms</span>
          )}
          <span>•</span>
          <span>Esc to Close</span>
        </div>

        <div className="flex items-center space-x-2">
          {/* TTS Audio Speech */}
          <button
            onClick={toggleSpeech}
            title="Read Aloud Output"
            className={`p-2 rounded-xl border text-xs font-medium transition flex items-center space-x-1 ${
              isSpeaking
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
          >
            {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          {/* Regenerate */}
          <button
            onClick={onRegenerate}
            disabled={isGenerating}
            title="Regenerate Output"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 text-xs transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Replace Selection in Windows App */}
          {onReplaceText && (
            <button
              onClick={handleReplaceClick}
              disabled={isGenerating || !outputText}
              className="px-3 py-1.5 rounded-xl bg-indigo-950/60 border border-indigo-500/40 text-indigo-300 hover:bg-indigo-900 text-xs font-semibold transition flex items-center space-x-1.5"
            >
              {replaced ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <ArrowRightLeft className="w-3.5 h-3.5" />}
              <span>{replaced ? 'Replaced!' : 'Replace Text'}</span>
            </button>
          )}

          {/* Copy Button */}
          <button
            onClick={handleCopyClick}
            disabled={isGenerating || !outputText}
            className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition flex items-center space-x-1.5"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy Result'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
