import React, { useState, useEffect } from 'react';
import {
  Monitor,
  FileText,
  Code2,
  Globe,
  Edit,
  Zap,
  Sparkles,
  Info,
  Keyboard,
  Maximize2,
  Check,
  RotateCcw,
  StickyNote,
  Video,
} from 'lucide-react';
import { HotkeyPreset, AppContextType } from '../types';

interface WindowsSimulatorProps {
  hotkeys: HotkeyPreset[];
  onTriggerHotkey: (preset: HotkeyPreset, selectedText: string, appContext: AppContextType) => void;
  onOpenQuickNotesPopup?: () => void;
  onOpenWebOverlay?: () => void;
  onOpenAiAnywhere?: (selectedText?: string) => void;
  onOpenAutomationsTab?: () => void;
}

const SAMPLE_WORD_DOC = `Subject: Q3 Product Roadmap & AI Integration Proposal

Dear Team,

As we prepare for the upcoming quarter, we are planning to overhaul our core desktop productivity suite by integrating system-wide AI hotkeys. The goal is to allow engineers, designers, and managers to select any text in Word, VS Code, or Slack and execute custom AI transformations with single hotkey triggers like Ctrl + Alt + P.

Key Objectives for Q3:
1. Implement zero-latency global hotkeys in Windows using Electron & native hooks.
2. Provide multi-provider support including Google Gemini, OpenAI GPT-4o, and local offline Ollama models.
3. Ensure high accessibility, WCAG compliance, and 100% local client privacy for secret keys.

Please review the attached technical brief and let me know if you have feedback before our alignment call tomorrow.

Best regards,
Alex Mercer
Principal Product Architect`;

const SAMPLE_VSCODE_CODE = `/**
 * Calculate exponential backoff retry interval for AI API requests
 */
export async function fetchWithRetry<T>(
  requestFn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelayMs: number = 500
): Promise<T> {
  let attempt = 0;
  
  while (attempt < maxRetries) {
    try {
      return await requestFn();
    } catch (error) {
      attempt++;
      if (attempt >= maxRetries) {
        throw new Error(\`Request failed after \${maxRetries} attempts: \${error}\`);
      }
      const delay = initialDelayMs * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  
  throw new Error("Unexpected loop exit");
}`;

const SAMPLE_BROWSER_ARTICLE = `Quantum Computing breakthrough promises 100x speedup for optimization models. Researchers at MIT have demonstrated a fault-tolerant topological qubit arrangement operating at room temperature. This approach significantly reduces decoherence errors, enabling practical quantum algorithms for logistics, battery chemistry simulation, and advanced neural network inference.`;

export const WindowsSimulator: React.FC<WindowsSimulatorProps> = ({
  hotkeys,
  onTriggerHotkey,
  onOpenQuickNotesPopup,
  onOpenWebOverlay,
  onOpenAiAnywhere,
  onOpenAutomationsTab,
}) => {
  const [activeApp, setActiveApp] = useState<AppContextType>('word');
  const [wordText, setWordText] = useState(SAMPLE_WORD_DOC);
  const [codeText, setCodeText] = useState(SAMPLE_VSCODE_CODE);
  const [browserText, setBrowserText] = useState(SAMPLE_BROWSER_ARTICLE);
  const [scratchpadText, setScratchpadText] = useState(
    'Type or paste any custom text here to test your global Windows AI hotkeys...'
  );

  const [selectedText, setSelectedText] = useState('');
  const enabledHotkeys = hotkeys.filter((h) => h.isEnabled);

  // Capture user selection in active window
  const handleTextSelection = (e: React.SyntheticEvent<HTMLElement>) => {
    const selection = window.getSelection()?.toString().trim() || '';
    if (selection) {
      setSelectedText(selection);
    }
  };

  // Keyboard shortcut listener inside simulator
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if pressed combo matches any enabled hotkey
      const keyName = e.key.toLowerCase();
      
      const matchedPreset = enabledHotkeys.find((preset) => {
        const k = preset.keys;
        const matchesCtrl = k.ctrlKey === e.ctrlKey;
        const matchesAlt = k.altKey === e.altKey;
        const matchesShift = k.shiftKey === e.shiftKey;
        const matchesMeta = k.metaKey === e.metaKey;
        const matchesKey = k.key.toLowerCase() === keyName || k.code?.toLowerCase() === e.code.toLowerCase();

        return matchesCtrl && matchesAlt && matchesShift && matchesMeta && matchesKey;
      });

      if (matchedPreset) {
        e.preventDefault();
        e.stopPropagation();

        // Get text to process
        let textToUse = selectedText;
        if (!textToUse) {
          if (activeApp === 'word') textToUse = wordText;
          if (activeApp === 'vscode') textToUse = codeText;
          if (activeApp === 'browser') textToUse = browserText;
          if (activeApp === 'scratchpad') textToUse = scratchpadText;
        }

        onTriggerHotkey(matchedPreset, textToUse, activeApp);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabledHotkeys, selectedText, activeApp, wordText, codeText, browserText, scratchpadText, onTriggerHotkey]);

  const getCurrentAppText = () => {
    if (activeApp === 'word') return wordText;
    if (activeApp === 'vscode') return codeText;
    if (activeApp === 'browser') return browserText;
    return scratchpadText;
  };

  const handleTriggerClick = (preset: HotkeyPreset) => {
    let textToUse = selectedText || getCurrentAppText();
    onTriggerHotkey(preset, textToUse, activeApp);
  };

  return (
    <div className="space-y-6">
      {/* Top Simulator Info Banner */}
      <div className="bg-[#15181E] border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Monitor className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">Interactive Windows Sandbox</h2>
          </div>
          <p className="text-xs text-slate-400 max-w-xl">
            Highlight text in any simulated Windows application below, then press physical keys on your keyboard (e.g. <kbd className="px-1.5 py-0.5 bg-[#0F1115] text-indigo-400 rounded border border-slate-700">Ctrl + Alt + P</kbd>) or click a trigger chip!
          </p>
        </div>

        {/* Selected Text Badge */}
        <div className="bg-[#0F1115] border border-slate-800 rounded-xl p-3 shrink-0 text-xs space-y-1 max-w-xs">
          <div className="flex items-center justify-between text-slate-400 text-[10px] font-bold uppercase">
            <span>Captured Text Selection</span>
            <span className="text-indigo-400">{selectedText.length} chars</span>
          </div>
          <p className="text-slate-200 truncate font-mono text-[11px]">
            {selectedText || '<No text highlighted yet - select text below>'}
          </p>
        </div>
      </div>

      {/* QUICK HOTKEY TRIGGER CHIPS BAR */}
      <div className="bg-[#15181E] border border-slate-800 rounded-2xl p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300 flex items-center space-x-2">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
            <span>Active Hotkey Trigger Chips (Click to test on active window text):</span>
          </span>
          <span className="text-[11px] text-slate-400">{enabledHotkeys.length} hotkeys ready</span>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {onOpenAiAnywhere && (
            <button
              onClick={() => onOpenAiAnywhere(selectedText || getCurrentAppText())}
              className="group px-3 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/50 rounded-xl text-xs transition flex items-center space-x-2 shadow-sm text-indigo-200 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 text-indigo-400 fill-indigo-400 group-hover:scale-110 transition animate-pulse" />
              <span className="font-bold text-white">AI Anywhere Launcher</span>
              <kbd className="px-1.5 py-0.5 bg-indigo-950 border border-indigo-500/40 text-[10px] text-indigo-300 rounded font-mono uppercase">
                Alt + Space
              </kbd>
            </button>
          )}

          {onOpenWebOverlay && (
            <button
              onClick={onOpenWebOverlay}
              className="group px-3 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/40 rounded-xl text-xs transition flex items-center space-x-2 shadow-sm text-cyan-300 cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition animate-pulse" />
              <span className="font-bold text-cyan-200">AI Web Overlay</span>
              <kbd className="px-1.5 py-0.5 bg-slate-900 border border-cyan-500/30 text-[10px] text-cyan-400 rounded font-mono uppercase">
                Ctrl+Alt+W
              </kbd>
            </button>
          )}

          {onOpenQuickNotesPopup && (
            <button
              onClick={onOpenQuickNotesPopup}
              className="group px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 rounded-xl text-xs transition flex items-center space-x-2 shadow-sm text-amber-300 cursor-pointer"
            >
              <StickyNote className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition" />
              <span className="font-bold text-amber-200">Quick Notes Overlay</span>
              <kbd className="px-1.5 py-0.5 bg-slate-900 border border-amber-500/30 text-[10px] text-amber-400 rounded font-mono uppercase">
                Alt + N
              </kbd>
            </button>
          )}

          {onOpenAutomationsTab && (
            <button
              onClick={onOpenAutomationsTab}
              className="group px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-xs transition flex items-center space-x-2 shadow-sm text-emerald-300 cursor-pointer"
            >
              <Video className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition" />
              <span className="font-bold text-emerald-200">Automation Recorder</span>
              <kbd className="px-1.5 py-0.5 bg-slate-900 border border-emerald-500/30 text-[10px] text-emerald-400 rounded font-mono uppercase">
                Alt + J / Alt + R
              </kbd>
            </button>
          )}

          {enabledHotkeys.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handleTriggerClick(preset)}
              className="group px-3 py-2 bg-[#0F1115] hover:bg-indigo-950/80 border border-slate-800 hover:border-indigo-500/50 rounded-xl text-xs transition flex items-center space-x-2 shadow-sm"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition" />
              <span className="font-semibold text-slate-200 group-hover:text-white">{preset.title}</span>
              <kbd className="px-1.5 py-0.5 bg-[#1A1D23] border border-slate-700 text-[10px] text-indigo-400 rounded font-mono uppercase">
                {preset.comboString}
              </kbd>
            </button>
          ))}
        </div>
      </div>

      {/* SIMULATED WINDOWS DESKTOP SHELL */}
      <div className="bg-[#0F1115] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col min-h-[520px]">
        {/* Desktop Taskbar Header */}
        <div className="bg-[#15181E] border-b border-slate-800 px-4 py-3 flex items-center justify-between select-none">
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-rose-500/80" />
            <span className="w-3 h-3 rounded-full bg-amber-500/80" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
            <span className="ml-2 text-xs font-semibold text-slate-300">Windows 11 Desktop Workspace</span>
          </div>

          {/* Active App Window Tabs */}
          <div className="flex items-center space-x-1 bg-[#0F1115] p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveApp('word')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeApp === 'word'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>MS Word Document</span>
            </button>

            <button
              onClick={() => setActiveApp('vscode')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeApp === 'vscode'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>VS Code Editor</span>
            </button>

            <button
              onClick={() => setActiveApp('browser')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeApp === 'browser'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Web Browser</span>
            </button>

            <button
              onClick={() => setActiveApp('scratchpad')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeApp === 'scratchpad'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Edit className="w-3.5 h-3.5" />
              <span>Scratchpad</span>
            </button>
          </div>
        </div>

        {/* SIMULATED APPLICATION VIEWPORT */}
        <div className="flex-1 p-6 bg-slate-900/60 relative">
          {/* MS WORD WINDOW */}
          {activeApp === 'word' && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-inner space-y-4 max-w-3xl mx-auto">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 text-xs text-slate-400">
                <span className="font-bold text-slate-200">Microsoft Word - Q3_Roadmap_Brief.docx</span>
                <span>Highlight any sentence or paragraph below</span>
              </div>

              <div
                onMouseUp={handleTextSelection}
                className="prose prose-invert max-w-none text-xs text-slate-200 font-sans leading-relaxed whitespace-pre-wrap select-text cursor-text"
              >
                {wordText}
              </div>
            </div>
          )}

          {/* VS CODE WINDOW */}
          {activeApp === 'vscode' && (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 shadow-inner space-y-3 max-w-3xl mx-auto font-mono text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-[11px] text-slate-400">
                <span className="text-cyan-400 font-bold">src/utils/retryHandler.ts</span>
                <span>TypeScript • UTF-8</span>
              </div>

              <textarea
                rows={12}
                value={codeText}
                onChange={(e) => setCodeText(e.target.value)}
                onMouseUp={handleTextSelection}
                onSelect={handleTextSelection}
                className="w-full bg-slate-950 border-0 text-slate-200 font-mono text-xs leading-relaxed focus:outline-none focus:ring-0 select-text resize-none"
              />
            </div>
          )}

          {/* WEB BROWSER WINDOW */}
          {activeApp === 'browser' && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-inner space-y-4 max-w-3xl mx-auto">
              <div className="flex items-center space-x-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-400">
                <Globe className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-slate-200 font-mono text-[11px]">https://tech-news.example.com/quantum-breakthrough</span>
              </div>

              <div
                onMouseUp={handleTextSelection}
                className="text-xs text-slate-200 leading-relaxed font-sans select-text cursor-text p-2"
              >
                <h3 className="text-sm font-bold text-white mb-2">Quantum Computing Breakthrough</h3>
                <p>{browserText}</p>
              </div>
            </div>
          )}

          {/* SCRATCHPAD NOTEPAD WINDOW */}
          {activeApp === 'scratchpad' && (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 shadow-inner space-y-3 max-w-3xl mx-auto">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-xs text-slate-400">
                <span className="font-bold text-slate-200">Custom Scratchpad / Notepad</span>
                <span>Type or paste anything to test</span>
              </div>

              <textarea
                rows={10}
                value={scratchpadText}
                onChange={(e) => setScratchpadText(e.target.value)}
                onMouseUp={handleTextSelection}
                onSelect={handleTextSelection}
                placeholder="Type or paste any text here..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-sans text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
