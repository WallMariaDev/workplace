import React, { useState, useEffect, useRef } from 'react';
import { AppConfig, HotkeyPreset, OverlayTriggerState, AIProvider, AppContextType, HistoryItem } from './types';
import { loadAppConfig, saveAppConfig, addHistoryItem, exportConfigJSON, parseAndValidateImportJSON, switchActiveProfile } from './services/storageService';
import { processAIText } from './services/aiService';
import { Header } from './components/Header';
import { HotkeyManager } from './components/HotkeyManager';
import { HotkeyRecorderModal } from './components/HotkeyRecorderModal';
import { FloatingOverlayWindow } from './components/FloatingOverlayWindow';
import { WindowsSimulator } from './components/WindowsSimulator';
import { ProviderSettings } from './components/ProviderSettings';
import { DesktopSetupGuide } from './components/DesktopSetupGuide';
import { HistoryLog } from './components/HistoryLog';
import { CloudSyncTab } from './components/CloudSyncTab';
import { QuickNotesMainView } from './components/QuickNotesMainView';
import { QuickNotesModalPopup } from './components/QuickNotesModalPopup';
import { WebOverlayManager } from './components/WebOverlayManager';
import { AiWebOverlayModal } from './components/AiWebOverlayModal';
import { AiAnywhereModalPopup } from './components/AiAnywhereModalPopup';
import { ProfileManager } from './components/ProfileManager';
import { AutomationRecorder } from './components/AutomationRecorder';

export default function App() {
  const [config, setConfig] = useState<AppConfig>(() => loadAppConfig());
  const [isRecorderOpen, setIsRecorderOpen] = useState<boolean>(false);
  const [editingPreset, setEditingPreset] = useState<HotkeyPreset | null>(null);

  // Quick Notes Popup Overlay state
  const [isQuickNotesOpen, setIsQuickNotesOpen] = useState<boolean>(false);

  // Web AI Overlay state
  const [isWebOverlayOpen, setIsWebOverlayOpen] = useState<boolean>(false);
  const [activeWebProfileId, setActiveWebProfileId] = useState<string | null>(null);

  // AI Anywhere Universal Popup state
  const [isAiAnywhereOpen, setIsAiAnywhereOpen] = useState<boolean>(false);
  const [aiAnywhereSelectedText, setAiAnywhereSelectedText] = useState<string>('');

  // Toast Notification State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Floating AI Overlay State
  const [overlayState, setOverlayState] = useState<OverlayTriggerState>({
    isOpen: false,
    preset: null,
    selectedText: '',
    appContext: 'word',
    position: { x: window.innerWidth / 2 - 270, y: 140 },
    isGenerating: false,
    outputText: '',
    error: null,
    executionTimeMs: 0,
    followUpText: '',
    chatHistory: [],
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Persist config changes automatically
  useEffect(() => {
    saveAppConfig(config);
  }, [config]);

  // Global keyboard shortcut listener for Quick Notes (Alt + N), AI Anywhere (Alt + Space) & Web Overlays
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Alt + Space (AI Anywhere)
      if (e.altKey && !e.ctrlKey && !e.metaKey && (e.code === 'Space' || e.key === ' ')) {
        e.preventDefault();
        // Capture active selected text on window if any
        const sel = window.getSelection()?.toString() || '';
        setAiAnywhereSelectedText(sel);
        setIsAiAnywhereOpen((prev) => !prev);
        return;
      }

      // Check for Alt + N (Quick Notes)
      if (e.altKey && !e.ctrlKey && !e.metaKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setIsQuickNotesOpen((prev) => !prev);
        return;
      }

      // Check for Web Overlay Profiles shortcuts
      if (config.webOverlayProfiles && config.webOverlayProfiles.length > 0) {
        for (const prof of config.webOverlayProfiles) {
          if (!prof.isEnabled || !prof.shortcut) continue;
          const combo = prof.shortcut.toLowerCase();
          const hasCtrl = combo.includes('ctrl');
          const hasAlt = combo.includes('alt');
          const hasShift = combo.includes('shift');
          const keyPart = combo.split('+').pop()?.trim().toLowerCase();

          if (
            e.ctrlKey === hasCtrl &&
            e.altKey === hasAlt &&
            e.shiftKey === hasShift &&
            keyPart &&
            e.key.toLowerCase() === keyPart
          ) {
            e.preventDefault();
            setActiveWebProfileId(prof.id);
            setIsWebOverlayOpen(true);
            return;
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [config.webOverlayProfiles]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleTabChange = (tab: AppConfig['activeTab']) => {
    setConfig((prev) => ({ ...prev, activeTab: tab }));
  };

  // Hotkey Preset Handlers
  const handleAddPreset = () => {
    setEditingPreset(null);
    setIsRecorderOpen(true);
  };

  const handleEditPreset = (preset: HotkeyPreset) => {
    setEditingPreset(preset);
    setIsRecorderOpen(true);
  };

  const handleSavePreset = (savedPreset: HotkeyPreset) => {
    setConfig((prev) => {
      const exists = prev.hotkeys.some((h) => h.id === savedPreset.id);
      const updatedHotkeys = exists
        ? prev.hotkeys.map((h) => (h.id === savedPreset.id ? savedPreset : h))
        : [savedPreset, ...prev.hotkeys];

      return { ...prev, hotkeys: updatedHotkeys };
    });

    setIsRecorderOpen(false);
    showToast(`Saved hotkey action: "${savedPreset.title}" (${savedPreset.comboString})`);
  };

  const handleTogglePreset = (id: string, isEnabled: boolean) => {
    setConfig((prev) => ({
      ...prev,
      hotkeys: prev.hotkeys.map((h) => (h.id === id ? { ...h, isEnabled } : h)),
    }));
  };

  const handleClonePreset = (preset: HotkeyPreset) => {
    const cloned: HotkeyPreset = {
      ...preset,
      id: `preset-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: `${preset.title} (Copy)`,
      comboString: `${preset.comboString} (Copy)`,
      updatedAt: Date.now(),
    };

    setConfig((prev) => ({
      ...prev,
      hotkeys: [cloned, ...prev.hotkeys],
    }));

    showToast(`Cloned preset: "${cloned.title}"`);
  };

  const handleDeletePreset = (id: string) => {
    const preset = config.hotkeys.find((h) => h.id === id);
    if (!preset) return;

    if (window.confirm(`Are you sure you want to delete "${preset.title}"?`)) {
      setConfig((prev) => ({
        ...prev,
        hotkeys: prev.hotkeys.filter((h) => h.id !== id),
      }));
      showToast(`Deleted preset: "${preset.title}"`);
    }
  };

  // CORE AI EXECUTION & OVERLAY TRIGGER
  const triggerAIHotkeyExecution = async (
    preset: HotkeyPreset,
    inputText: string,
    appContext: AppContextType = 'word'
  ) => {
    // Determine screen overlay positioning
    const posX = Math.max(20, Math.min(window.innerWidth - 580, window.innerWidth / 2 - 270));
    const posY = 120;

    setOverlayState({
      isOpen: true,
      preset,
      selectedText: inputText || 'Sample input text captured from active Windows application',
      appContext,
      position: { x: posX, y: posY },
      isGenerating: true,
      outputText: '',
      error: null,
      executionTimeMs: 0,
      followUpText: '',
      chatHistory: [],
    });

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

      setOverlayState((prev) => ({
        ...prev,
        isGenerating: false,
        outputText: result.output,
        executionTimeMs: result.executionTimeMs,
      }));

      // Add to History Log
      setConfig((prev) =>
        addHistoryItem(prev, {
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

      // Auto-copy if configured
      if (preset.autoCopy) {
        navigator.clipboard.writeText(result.output);
        showToast('Result auto-copied to clipboard!');
      }
    } catch (err: any) {
      console.error('AI Execution Error:', err);
      const errMsg = err.message || 'Failed to generate AI response.';

      setOverlayState((prev) => ({
        ...prev,
        isGenerating: false,
        error: errMsg,
        executionTimeMs: Date.now() - startTime,
      }));

      // Log failure in history
      setConfig((prev) =>
        addHistoryItem(prev, {
          hotkeyTitle: preset.title,
          hotkeyShortcut: preset.comboString,
          provider: preset.provider,
          model: preset.model,
          inputText: inputText || '<Empty Input>',
          outputText: '',
          executionTimeMs: Date.now() - startTime,
          status: 'error',
          errorMessage: errMsg,
          appContext,
        })
      );
    }
  };

  // Follow-up Prompt Execution in Overlay
  const handleFollowUpExecution = async (followUpQuery: string) => {
    if (!overlayState.preset || !overlayState.outputText) return;

    setOverlayState((prev) => ({
      ...prev,
      isGenerating: true,
      error: null,
    }));

    const combinedPrompt = `Previous AI Output:\n${overlayState.outputText}\n\nFollow-up Request: ${followUpQuery}`;

    try {
      const result = await processAIText({
        provider: overlayState.preset.provider,
        model: overlayState.preset.model,
        promptTemplate: combinedPrompt,
        inputText: overlayState.selectedText,
        systemPrompt: overlayState.preset.systemPrompt,
        temperature: overlayState.preset.temperature,
        config,
      });

      setOverlayState((prev) => ({
        ...prev,
        isGenerating: false,
        outputText: result.output,
        executionTimeMs: result.executionTimeMs,
      }));
    } catch (err: any) {
      setOverlayState((prev) => ({
        ...prev,
        isGenerating: false,
        error: err.message || 'Follow-up request failed.',
      }));
    }
  };

  // Import / Export JSON
  const handleExportConfig = () => {
    exportConfigJSON(config);
    showToast('Exported QuickKeys AI config JSON file.');
  };

  const handleImportFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const newConfig = parseAndValidateImportJSON(text);
        setConfig(newConfig);
        showToast('Successfully imported QuickKeys AI configuration!');
      } catch (err: any) {
        alert(`Import Error: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const handleResetConfig = () => {
    if (window.confirm('Reset all hotkey presets, provider keys, and overlay settings to factory defaults?')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-[#0F1115] text-slate-200 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      {/* Toast Notification Popup */}
      {toastMessage && (
        <div className="fixed bottom-14 right-6 z-50 bg-indigo-600 text-white px-4 py-2.5 rounded-xl shadow-2xl text-xs font-semibold flex items-center space-x-2 animate-in fade-in slide-in-from-bottom-5 border border-indigo-500/30">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Hidden File Input for Config Import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportFileSelected}
        accept=".json"
        className="hidden"
      />

      {/* Main App Header */}
      <Header
        config={config}
        onTabChange={handleTabChange}
        onExportConfig={handleExportConfig}
        onImportConfig={() => fileInputRef.current?.click()}
        onResetConfig={handleResetConfig}
        onSwitchProfile={(profileId) => {
          try {
            const updated = switchActiveProfile(config, profileId);
            setConfig(updated);
            showToast('Switched active profile workspace');
          } catch (err: any) {
            showToast(`Failed to switch profile: ${err.message}`);
          }
        }}
        onOpenQuickNotesPopup={() => setIsQuickNotesOpen(true)}
        onOpenWebOverlay={() => setIsWebOverlayOpen(true)}
        onOpenAiAnywhere={() => setIsAiAnywhereOpen(true)}
      />

      {/* Page Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-12">
        {config.activeTab === 'profiles' && (
          <ProfileManager
            config={config}
            onUpdateConfig={(newConfig) => setConfig(newConfig)}
            onShowToast={showToast}
            user={null}
            googleToken={null}
            onOpenCloudSyncTab={() => handleTabChange('cloud_sync')}
          />
        )}

        {config.activeTab === 'automations' && (
          <AutomationRecorder
            config={config}
            onUpdateConfig={(newConfig) => setConfig(newConfig)}
            onShowToast={showToast}
            user={null}
            googleToken={null}
            onOpenCloudSyncTab={() => handleTabChange('cloud_sync')}
          />
        )}

        {config.activeTab === 'manager' && (
          <HotkeyManager
            hotkeys={config.hotkeys}
            onAddPreset={handleAddPreset}
            onEditPreset={handleEditPreset}
            onTogglePreset={handleTogglePreset}
            onClonePreset={handleClonePreset}
            onDeletePreset={handleDeletePreset}
            onTestPreset={(preset) =>
              triggerAIHotkeyExecution(
                preset,
                'Selected sample text captured from Windows active window to test prompt output.'
              )
            }
          />
        )}

        {config.activeTab === 'web_overlay' && (
          <WebOverlayManager
            config={config}
            onUpdateConfig={(newConfig) => setConfig(newConfig)}
            onShowToast={showToast}
            onLaunchOverlay={(profileId) => {
              setActiveWebProfileId(profileId);
              setIsWebOverlayOpen(true);
            }}
          />
        )}

        {config.activeTab === 'notes' && (
          <QuickNotesMainView
            config={config}
            onUpdateConfig={(newConfig) => setConfig(newConfig)}
            onShowToast={showToast}
            onOpenQuickNotesPopup={() => setIsQuickNotesOpen(true)}
          />
        )}

        {config.activeTab === 'simulator' && (
          <WindowsSimulator
            hotkeys={config.hotkeys}
            onTriggerHotkey={(preset, text, ctx) => triggerAIHotkeyExecution(preset, text, ctx)}
            onOpenQuickNotesPopup={() => setIsQuickNotesOpen(true)}
            onOpenWebOverlay={() => setIsWebOverlayOpen(true)}
            onOpenAiAnywhere={(txt) => {
              if (txt) setAiAnywhereSelectedText(txt);
              setIsAiAnywhereOpen(true);
            }}
            onOpenAutomationsTab={() => handleTabChange('automations')}
          />
        )}

        {config.activeTab === 'providers' && (
          <ProviderSettings
            config={config}
            onUpdateProvider={(prov, data) =>
              setConfig((prev) => ({
                ...prev,
                providers: {
                  ...prev.providers,
                  [prov]: { ...(prev.providers[prov] || {}), ...data },
                },
              }))
            }
            onUpdateOverlaySettings={(stg) =>
              setConfig((prev) => ({
                ...prev,
                overlaySettings: { ...prev.overlaySettings, ...stg },
              }))
            }
          />
        )}

        {config.activeTab === 'installer' && <DesktopSetupGuide config={config} />}

        {config.activeTab === 'history' && (
          <HistoryLog
            history={config.history}
            onClearHistory={() => setConfig((prev) => ({ ...prev, history: [] }))}
            onReRunItem={(item) => {
              const preset = config.hotkeys.find((h) => h.title === item.hotkeyTitle) || config.hotkeys[0];
              if (preset) triggerAIHotkeyExecution(preset, item.inputText, item.appContext);
            }}
          />
        )}

        {config.activeTab === 'cloud_sync' && (
          <CloudSyncTab
            config={config}
            onUpdateConfig={(newConfig) => setConfig(newConfig)}
            onShowToast={showToast}
          />
        )}
      </main>

      {/* Bottom Status Bar */}
      <footer className="mt-auto h-12 bg-[#15181E] border-t border-slate-800 px-6 sm:px-8 flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Gemini API Connected</span>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Windows User32.dll Keyhooks Active</span>
          </div>
        </div>
        <div className="flex items-center gap-4 font-mono text-slate-500">
          <span>Latency: 142ms</span>
          <span className="text-slate-700">|</span>
          <span>v2.0.4-stable</span>
        </div>
      </footer>

      {/* Hotkey Recorder / Editor Modal */}
      <HotkeyRecorderModal
        isOpen={isRecorderOpen}
        editingPreset={editingPreset}
        existingPresets={config.hotkeys}
        onSave={handleSavePreset}
        onClose={() => setIsRecorderOpen(false)}
      />

      {/* Interactive Floating Overlay Window */}
      <FloatingOverlayWindow
        isOpen={overlayState.isOpen}
        preset={overlayState.preset}
        inputText={overlayState.selectedText}
        outputText={overlayState.outputText}
        isGenerating={overlayState.isGenerating}
        error={overlayState.error}
        executionTimeMs={overlayState.executionTimeMs}
        appContext={overlayState.appContext}
        position={overlayState.position}
        onClose={() => setOverlayState((prev) => ({ ...prev, isOpen: false }))}
        onCopy={(text) => {
          navigator.clipboard.writeText(text);
          showToast('Copied AI response to clipboard!');
        }}
        onReplaceText={(text) => {
          showToast(`Replaced text in active ${overlayState.appContext.toUpperCase()} window!`);
        }}
        onRegenerate={() => {
          if (overlayState.preset) {
            triggerAIHotkeyExecution(
              overlayState.preset,
              overlayState.selectedText,
              overlayState.appContext
            );
          }
        }}
        onFollowUp={handleFollowUpExecution}
        onSwitchProvider={(prov, model) => {
          if (overlayState.preset) {
            const updated = { ...overlayState.preset, provider: prov, model };
            triggerAIHotkeyExecution(updated, overlayState.selectedText, overlayState.appContext);
          }
        }}
      />

      {/* Global Quick Notes Popup Overlay (Alt + N) */}
      <QuickNotesModalPopup
        config={config}
        isOpen={isQuickNotesOpen}
        onClose={() => setIsQuickNotesOpen(false)}
        onUpdateConfig={(newConfig) => setConfig(newConfig)}
        onShowToast={showToast}
        onOpenMainNotesTab={() => handleTabChange('notes')}
      />

      {/* Global AI Web Overlay Modal */}
      <AiWebOverlayModal
        config={config}
        isOpen={isWebOverlayOpen}
        onClose={() => setIsWebOverlayOpen(false)}
        activeProfileId={activeWebProfileId}
        onSelectProfile={(id) => setActiveWebProfileId(id)}
        onShowToast={showToast}
        onOpenSettings={() => handleTabChange('web_overlay')}
      />

      {/* Global AI Anywhere Launcher Popup (Alt + Space) */}
      <AiAnywhereModalPopup
        config={config}
        isOpen={isAiAnywhereOpen}
        onClose={() => setIsAiAnywhereOpen(false)}
        selectedText={aiAnywhereSelectedText}
        appContext="word"
        onUpdateConfig={(newConfig) => setConfig(newConfig)}
        onShowToast={showToast}
      />
    </div>
  );
}
