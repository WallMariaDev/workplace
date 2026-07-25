import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Search,
  Zap,
  Sparkles,
  Command,
  CornerDownLeft,
  Copy,
  Check,
  RotateCcw,
  Volume2,
  VolumeX,
  ArrowLeft,
  Pin,
  Bot,
  FileText,
  Sliders,
  Send,
  Loader2,
  Code2,
  Edit3,
  BookOpen,
  Languages,
  CheckCircle2,
} from 'lucide-react';
import { AppConfig, HotkeyPreset, AppContextType } from '../types';
import { processAIText } from '../services/aiService';
import { addHistoryItem } from '../services/storageService';

interface AiAnywhereModalPopupProps {
  config: AppConfig;
  isOpen: boolean;
  onClose: () => void;
  selectedText?: string;
  appContext?: AppContextType;
  onUpdateConfig: (newConfig: AppConfig) => void;
  onShowToast: (msg: string) => void;
  onReplaceTextInApp?: (text: string) => void;
}

export const AiAnywhereModalPopup: React.FC<AiAnywhereModalPopupProps> = ({
  config,
  isOpen,
  onClose,
  selectedText = '',
  appContext = 'word',
  onUpdateConfig,
  onShowToast,
  onReplaceTextInApp,
}) => {
  const [inputText, setInputText] = useState<string>(selectedText);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  // Execution state
  const [activePreset, setActivePreset] = useState<HotkeyPreset | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [outputText, setOutputText] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [executionTimeMs, setExecutionTimeMs] = useState<number>(0);
  const [followUpPrompt, setFollowUpPrompt] = useState<string>('');

  // UI Toggles
  const [copied, setCopied] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isPinned, setIsPinned] = useState<boolean>(true);

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const resultContainerRef = useRef<HTMLDivElement | null>(null);

  // Sync selectedText prop when opening or changing
  useEffect(() => {
    if (isOpen) {
      setInputText(selectedText || 'Selected text from active window will appear here...');
      setSearchQuery('');
      setSelectedIndex(0);
      setActivePreset(null);
      setOutputText('');
      setError(null);
      setFollowUpPrompt('');

      // Auto-focus search bar
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, selectedText]);

  // Filter hotkeys dynamically from config.hotkeys
  const enabledHotkeys = config.hotkeys.filter((hk) => hk.isEnabled);
  const filteredHotkeys = enabledHotkeys.filter((hk) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      hk.title.toLowerCase().includes(q) ||
      hk.category.toLowerCase().includes(q) ||
      hk.model.toLowerCase().includes(q) ||
      hk.comboString.toLowerCase().includes(q) ||
      hk.promptTemplate.toLowerCase().includes(q)
    );
  });

  // Clamp selection index when search query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  // Handle Keyboard Navigation (Up, Down, Enter, Esc)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      // If viewing result, allow Backspace to return to launcher list if not typing in follow-up box
      if (outputText && e.key === 'Escape') {
        setActivePreset(null);
        setOutputText('');
        return;
      }

      if (!outputText && !isGenerating) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex((prev) => (filteredHotkeys.length > 0 ? (prev + 1) % filteredHotkeys.length : 0));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex((prev) =>
            filteredHotkeys.length > 0 ? (prev - 1 + filteredHotkeys.length) % filteredHotkeys.length : 0
          );
        } else if (e.key === 'Enter') {
          // Trigger highlighted hotkey
          if (filteredHotkeys.length > 0 && filteredHotkeys[selectedIndex]) {
            e.preventDefault();
            handleExecuteHotkey(filteredHotkeys[selectedIndex]);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredHotkeys, selectedIndex, outputText, isGenerating]);

  if (!isOpen) return null;

  const handleExecuteHotkey = async (preset: HotkeyPreset) => {
    setActivePreset(preset);
    setIsGenerating(true);
    setError(null);
    setOutputText('');
    const startTime = Date.now();

    try {
      const result = await processAIText({
        provider: preset.provider,
        model: preset.model,
        promptTemplate: preset.promptTemplate,
        inputText,
        systemPrompt: preset.systemPrompt,
        temperature: preset.temperature,
        config,
      });

      setOutputText(result.output);
      setExecutionTimeMs(result.executionTimeMs);
      setIsGenerating(false);

      // Save to History Log
      onUpdateConfig(
        addHistoryItem(config, {
          hotkeyTitle: preset.title,
          hotkeyShortcut: preset.comboString,
          provider: preset.provider,
          model: preset.model,
          inputText: inputText || '<Empty Input>',
          outputText: result.output,
          executionTimeMs: result.executionTimeMs,
          status: 'success',
          appContext,
        })
      );

      // Auto-copy if enabled
      if (preset.autoCopy) {
        navigator.clipboard.writeText(result.output);
        onShowToast('Result auto-copied to clipboard!');
      }

      // Auto-replace if enabled
      if (preset.autoReplace && onReplaceTextInApp) {
        onReplaceTextInApp(result.output);
        onShowToast('Replaced text in application!');
      }
    } catch (err: any) {
      console.error('AI Anywhere Error:', err);
      setError(err.message || 'Failed to execute AI Hotkey.');
      setIsGenerating(false);
      setExecutionTimeMs(Date.now() - startTime);
    }
  };

  const handleFollowUpRefine = async () => {
    if (!followUpPrompt.trim() || !activePreset) return;
    const previousOutput = outputText;
    setIsGenerating(true);
    setError(null);

    try {
      const combinedPrompt = `${followUpPrompt.trim()}\n\nPrevious context:\n${previousOutput}`;
      const result = await processAIText({
        provider: activePreset.provider,
        model: activePreset.model,
        promptTemplate: '{text}',
        inputText: combinedPrompt,
        systemPrompt: 'You are an AI assistant refining previous text results based on user feedback.',
        temperature: 0.5,
        config,
      });

      setOutputText(result.output);
      setFollowUpPrompt('');
      setIsGenerating(false);
      onShowToast('Response refined!');
    } catch (err: any) {
      setError(err.message || 'Follow-up refinement failed.');
      setIsGenerating(false);
    }
  };

  const handleCopyResult = () => {
    if (!outputText) return;
    navigator.clipboard.writeText(outputText);
    setCopied(true);
    onShowToast('Copied AI response to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReplaceSelection = () => {
    if (!outputText) return;
    if (onReplaceTextInApp) {
      onReplaceTextInApp(outputText);
      onShowToast('Replaced selected text in application!');
    } else {
      navigator.clipboard.writeText(outputText);
      onShowToast('Copied to clipboard for application paste!');
    }
  };

  const handleToggleSpeak = () => {
    if (!outputText) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(outputText);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Editing':
        return <Edit3 className="w-3.5 h-3.5 text-emerald-400" />;
      case 'Coding':
        return <Code2 className="w-3.5 h-3.5 text-cyan-400" />;
      case 'Summarization':
        return <BookOpen className="w-3.5 h-3.5 text-amber-400" />;
      case 'Translation':
        return <Languages className="w-3.5 h-3.5 text-indigo-400" />;
      case 'Productivity':
        return <Zap className="w-3.5 h-3.5 text-purple-400" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-rose-400" />;
    }
  };

  const getCategoryBadgeStyle = (category: string) => {
    switch (category) {
      case 'Editing':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Coding':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      case 'Summarization':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'Translation':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'Productivity':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const isOverlayMode = window.location.search.includes('mode=overlay');

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all ${isOverlayMode ? 'bg-transparent' : 'bg-black/60 backdrop-blur-md'}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className={`bg-[#12151B] border border-slate-700/80 rounded-2xl max-w-xl w-full mx-4 shadow-2xl flex flex-col overflow-hidden text-slate-100 transition-all ${
          isPinned ? 'ring-2 ring-indigo-500/30' : ''
        }`}
        style={{ maxHeight: '85vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="bg-[#181C24] px-4 py-3 border-b border-slate-800 flex items-center justify-between select-none">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Zap className="w-4 h-4 fill-indigo-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-xs text-white tracking-wide">
                  AI Anywhere Launcher
                </span>
                <span className="px-1.5 py-0.2 text-[10px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded uppercase">
                  {config.aiAnywhereShortcut || 'Alt + Space'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                Execute configured AI Hotkeys directly on selected text
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => setIsPinned(!isPinned)}
              title={isPinned ? 'Pin Always on Top (Active)' : 'Pin Always on Top'}
              className={`p-1.5 rounded-lg text-xs transition ${
                isPinned
                  ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Pin className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClose}
              title="Close AI Anywhere (Esc)"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Selected Input Preview Bar */}
        <div className="bg-[#0C0E12] px-4 py-2.5 border-b border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
            <span className="flex items-center space-x-1">
              <FileText className="w-3 h-3 text-cyan-400" />
              <span>Input Selection Context ({appContext.toUpperCase()}):</span>
            </span>
            <span className="text-[10px] text-slate-500">
              {inputText.length} characters
            </span>
          </div>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            rows={2}
            placeholder="Type or paste selected text here..."
            className="w-full bg-[#151820] border border-slate-800 rounded-xl p-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none font-mono"
          />
        </div>

        {/* Main Content View: Hotkey Launcher list OR Execution Result */}
        {!activePreset && !outputText && !isGenerating ? (
          /* HOTKEY LIST LAUNCHER VIEW */
          <div className="p-3 flex flex-col flex-1 overflow-hidden space-y-3">
            {/* Search Input Box */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search AI Hotkeys by name, category, shortcut, or model..."
                className="w-full bg-[#151820] border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* List of Configured Hotkeys */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar max-h-[380px]">
              {filteredHotkeys.length === 0 ? (
                <div className="p-8 text-center space-y-2 text-slate-400">
                  <Bot className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-xs font-semibold">No matching AI Hotkeys found.</p>
                  <p className="text-[11px] text-slate-500">
                    Try another search term or configure new hotkeys in AI Hotkey Manager.
                  </p>
                </div>
              ) : (
                filteredHotkeys.map((preset, idx) => {
                  const isSelected = idx === selectedIndex;
                  return (
                    <div
                      key={preset.id}
                      onClick={() => handleExecuteHotkey(preset)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-indigo-600/20 border-indigo-500/60 shadow-lg text-white'
                          : 'bg-[#151820] border-slate-800/80 hover:bg-slate-800/60 text-slate-200'
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-0 pr-2">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${getCategoryBadgeStyle(
                            preset.category
                          )}`}
                        >
                          {getCategoryIcon(preset.category)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-xs truncate">
                              {preset.title}
                            </span>
                            <span
                              className={`px-1.5 py-0.2 text-[9px] font-bold border rounded uppercase ${getCategoryBadgeStyle(
                                preset.category
                              )}`}
                            >
                              {preset.category}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 truncate">
                            {preset.promptTemplate}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                          {preset.provider.toUpperCase()} / {preset.model}
                        </span>
                        <kbd
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${
                            isSelected
                              ? 'bg-indigo-600 text-white border-indigo-400'
                              : 'bg-slate-900 border-slate-700 text-slate-300'
                          }`}
                        >
                          {preset.comboString}
                        </kbd>
                        <CornerDownLeft
                          className={`w-3.5 h-3.5 transition ${
                            isSelected ? 'text-indigo-400 opacity-100' : 'opacity-0'
                          }`}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Keyboard Hint Footer */}
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
              <div className="flex items-center space-x-3">
                <span className="flex items-center space-x-1">
                  <kbd className="px-1 py-0.2 bg-slate-800 border border-slate-700 rounded text-slate-300">↑↓</kbd>
                  <span>Navigate</span>
                </span>
                <span className="flex items-center space-x-1">
                  <kbd className="px-1 py-0.2 bg-slate-800 border border-slate-700 rounded text-slate-300">↵</kbd>
                  <span>Execute</span>
                </span>
                <span className="flex items-center space-x-1">
                  <kbd className="px-1 py-0.2 bg-slate-800 border border-slate-700 rounded text-slate-300">Esc</kbd>
                  <span>Close</span>
                </span>
              </div>
              <span className="text-slate-500 font-mono">
                {filteredHotkeys.length} Hotkeys Ready
              </span>
            </div>
          </div>
        ) : (
          /* GENERATING / RESULT VIEW */
          <div className="p-4 flex flex-col flex-1 space-y-3 overflow-hidden">
            {/* Active Hotkey Banner */}
            <div className="bg-[#151820] border border-slate-800 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <button
                  onClick={() => {
                    setActivePreset(null);
                    setOutputText('');
                  }}
                  className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                  title="Back to Hotkeys List"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h4 className="font-bold text-xs text-white">
                    {activePreset?.title}
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    Model: {activePreset?.provider.toUpperCase()} ({activePreset?.model})
                  </p>
                </div>
              </div>

              {executionTimeMs > 0 && (
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  ⚡ {executionTimeMs}ms
                </span>
              )}
            </div>

            {/* Generated Output Box */}
            <div
              ref={resultContainerRef}
              className="flex-1 bg-[#090A0D] border border-slate-800 rounded-xl p-3.5 overflow-y-auto max-h-[320px] font-sans text-xs text-slate-200 leading-relaxed custom-scrollbar whitespace-pre-wrap"
            >
              {isGenerating ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-3 text-slate-400">
                  <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
                  <p className="text-xs font-semibold text-slate-300">
                    Running AI Hotkey on selection...
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Applying "{activePreset?.promptTemplate}"
                  </p>
                </div>
              ) : error ? (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 space-y-2">
                  <p className="font-bold text-xs">AI Hotkey Execution Error</p>
                  <p className="text-[11px]">{error}</p>
                </div>
              ) : (
                outputText
              )}
            </div>

            {/* Follow-up / Refine Bar */}
            {!isGenerating && outputText && (
              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="text"
                  value={followUpPrompt}
                  onChange={(e) => setFollowUpPrompt(e.target.value)}
                  placeholder="Ask follow-up or refine response (e.g., make it shorter)..."
                  className="flex-1 bg-[#0C0E12] border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleFollowUpRefine();
                  }}
                />
                <button
                  onClick={handleFollowUpRefine}
                  disabled={!followUpPrompt.trim()}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center space-x-1 transition cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Refine</span>
                </button>
              </div>
            )}

            {/* Action Bar */}
            {!isGenerating && outputText && (
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <button
                  onClick={() => {
                    setActivePreset(null);
                    setOutputText('');
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium flex items-center space-x-1.5 transition cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Other Hotkeys</span>
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleToggleSpeak}
                    className={`p-2 rounded-xl text-xs transition border cursor-pointer ${
                      isSpeaking
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                    title={isSpeaking ? 'Stop Speaking' : 'Read Aloud (TTS)'}
                  >
                    {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    onClick={handleCopyResult}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleReplaceSelection}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition shadow-sm cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Replace Selection</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
