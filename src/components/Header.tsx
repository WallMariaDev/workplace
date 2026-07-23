import React from 'react';
import {
  Keyboard,
  Monitor,
  Settings,
  Download,
  History,
  Sparkles,
  DownloadCloud,
  RotateCcw,
  FileJson,
  Check,
  ShieldCheck,
  Cloud,
  StickyNote,
  Globe,
  Bot,
  Zap,
  Layers,
  ChevronDown,
  UserCheck,
  Video,
} from 'lucide-react';
import { AppConfig } from '../types';

interface HeaderProps {
  config: AppConfig;
  onTabChange: (tab: AppConfig['activeTab']) => void;
  onExportConfig: () => void;
  onImportConfig: () => void;
  onResetConfig: () => void;
  onSwitchProfile?: (profileId: string) => void;
  onOpenQuickNotesPopup?: () => void;
  onOpenWebOverlay?: () => void;
  onOpenAiAnywhere?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  config,
  onTabChange,
  onExportConfig,
  onImportConfig,
  onResetConfig,
  onSwitchProfile,
  onOpenQuickNotesPopup,
  onOpenWebOverlay,
  onOpenAiAnywhere,
}) => {
  const activeHotkeysCount = config.hotkeys.filter((h) => h.isEnabled).length;
  const notesCount = (config.notes || []).length;
  const webProfilesCount = (config.webOverlayProfiles || []).length;
  const profiles = config.profiles || [];
  const activeProfile = profiles.find(p => p.id === config.activeProfileId) || profiles[0];

  return (
    <header className="bg-[#15181E] border-b border-slate-800 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand Title */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onTabChange('manager')}>
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-bold italic shadow-lg shadow-indigo-500/20 text-white text-sm">
              Q
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base font-semibold tracking-tight text-white">QuickKeys AI</h1>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-600/10 text-indigo-400 border border-indigo-600/20 rounded">
                  v{config.version} Windows
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                System-Wide Windows AI Hotkey & Web Overlay Studio
              </p>
            </div>
          </div>

          {/* Center Navigation Tabs */}
          <nav className="hidden lg:flex items-center space-x-1 bg-[#0F1115] p-1 rounded-xl border border-slate-800">
            <button
              id="tab-profiles-btn"
              onClick={() => onTabChange('profiles')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                config.activeTab === 'profiles'
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span>Profiles ({profiles.length})</span>
            </button>

            <button
              id="tab-manager-btn"
              onClick={() => onTabChange('manager')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                config.activeTab === 'manager'
                  ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-600/20 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Keyboard className="w-3.5 h-3.5" />
              <span>Hotkeys ({config.hotkeys.length})</span>
            </button>

            <button
              id="tab-automations-btn"
              onClick={() => onTabChange('automations')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                config.activeTab === 'automations'
                  ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Video className="w-3.5 h-3.5 text-emerald-400" />
              <span>Automations ({config.automations?.length || 0})</span>
            </button>

            <button
              id="tab-web-overlay-btn"
              onClick={() => onTabChange('web_overlay')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                config.activeTab === 'web_overlay'
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              <span>Web Overlay</span>
            </button>

            <button
              id="tab-notes-btn"
              onClick={() => onTabChange('notes')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                config.activeTab === 'notes'
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <StickyNote className="w-3.5 h-3.5 text-amber-400" />
              <span>Notes ({notesCount})</span>
            </button>

            <button
              id="tab-simulator-btn"
              onClick={() => onTabChange('simulator')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                config.activeTab === 'simulator'
                  ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-600/20 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Monitor className="w-3.5 h-3.5 text-cyan-400" />
              <span>Sandbox</span>
            </button>

            <button
              id="tab-providers-btn"
              onClick={() => onTabChange('providers')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                config.activeTab === 'providers'
                  ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-600/20 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Settings className="w-3.5 h-3.5 text-purple-400" />
              <span>Providers</span>
            </button>

            <button
              id="tab-installer-btn"
              onClick={() => onTabChange('installer')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                config.activeTab === 'installer'
                  ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-600/20 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Installer</span>
            </button>

            <button
              id="tab-history-btn"
              onClick={() => onTabChange('history')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                config.activeTab === 'history'
                  ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-600/20 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <History className="w-3.5 h-3.5 text-amber-400" />
              <span>History</span>
            </button>

            <button
              id="tab-cloud-sync-btn"
              onClick={() => onTabChange('cloud_sync')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                config.activeTab === 'cloud_sync'
                  ? 'bg-indigo-600/10 text-sky-400 border border-sky-600/30 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Cloud className="w-3.5 h-3.5 text-sky-400" />
              <span>Drive Sync</span>
            </button>
          </nav>

          {/* Right Status Badge & Quick Actions */}
          <div className="flex items-center space-x-2">
            {/* Active Profile Quick Selector Dropdown */}
            {profiles.length > 0 && onSwitchProfile && (
              <div className="relative group">
                <select
                  value={activeProfile?.id || ''}
                  onChange={(e) => onSwitchProfile(e.target.value)}
                  className="appearance-none bg-[#0F1115] hover:bg-slate-800 border border-indigo-500/30 text-indigo-200 text-xs font-medium rounded-xl px-3 py-1.5 pr-7 focus:outline-none focus:border-indigo-500 cursor-pointer transition shadow-sm"
                  title="Switch Active Profile Workspace"
                >
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id} className="bg-[#15181E] text-white">
                      Profile: {p.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-indigo-400 absolute right-2.5 top-2.5 pointer-events-none" />
              </div>
            )}

            {onOpenAiAnywhere && (
              <button
                onClick={onOpenAiAnywhere}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 text-xs font-semibold shadow-sm transition cursor-pointer"
                title="Launch AI Anywhere Universal Launcher (Alt+Space)"
              >
                <Zap className="w-3.5 h-3.5 text-indigo-400 fill-indigo-400 animate-pulse" />
                <span className="hidden sm:inline">AI Anywhere</span>
                <span className="text-[10px] bg-indigo-950 px-1 rounded text-indigo-300 font-mono">Alt+Space</span>
              </button>
            )}

            <div className="flex items-center space-x-1 bg-[#0F1115] p-1 rounded-lg border border-slate-800">
              <button
                id="export-config-btn"
                onClick={onExportConfig}
                title="Backup / Export Settings JSON"
                className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <DownloadCloud className="w-4 h-4" />
              </button>

              <button
                id="import-config-btn"
                onClick={onImportConfig}
                title="Import Settings JSON"
                className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <FileJson className="w-4 h-4" />
              </button>

              <button
                id="reset-config-btn"
                onClick={onResetConfig}
                title="Reset Settings to Defaults"
                className="p-1.5 rounded-md text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Strip */}
        <div className="flex lg:hidden overflow-x-auto space-x-2 py-2 border-t border-slate-800 no-scrollbar">
          <button
            onClick={() => onTabChange('profiles')}
            className={`px-3 py-1 rounded text-xs whitespace-nowrap ${
              config.activeTab === 'profiles' ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-600/30' : 'text-slate-400 bg-slate-800/50'
            }`}
          >
            Profiles ({profiles.length})
          </button>
          <button
            onClick={() => onTabChange('manager')}
            className={`px-3 py-1 rounded text-xs whitespace-nowrap ${
              config.activeTab === 'manager' ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-600/30' : 'text-slate-400 bg-slate-800/50'
            }`}
          >
            Hotkeys ({config.hotkeys.length})
          </button>
          <button
            onClick={() => onTabChange('automations')}
            className={`px-3 py-1 rounded text-xs whitespace-nowrap ${
              config.activeTab === 'automations' ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30' : 'text-slate-400 bg-slate-800/50'
            }`}
          >
            Automations ({config.automations?.length || 0})
          </button>
          <button
            onClick={() => onTabChange('notes')}
            className={`px-3 py-1 rounded text-xs whitespace-nowrap ${
              config.activeTab === 'notes' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'text-slate-400 bg-slate-800/50'
            }`}
          >
            Quick Notes ({notesCount})
          </button>
          <button
            onClick={() => onTabChange('simulator')}
            className={`px-3 py-1 rounded text-xs whitespace-nowrap ${
              config.activeTab === 'simulator' ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-600/30' : 'text-slate-400 bg-slate-800/50'
            }`}
          >
            Sandbox Simulator
          </button>
          <button
            onClick={() => onTabChange('providers')}
            className={`px-3 py-1 rounded text-xs whitespace-nowrap ${
              config.activeTab === 'providers' ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-600/30' : 'text-slate-400 bg-slate-800/50'
            }`}
          >
            Providers
          </button>
          <button
            onClick={() => onTabChange('installer')}
            className={`px-3 py-1 rounded text-xs whitespace-nowrap ${
              config.activeTab === 'installer' ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-600/30' : 'text-slate-400 bg-slate-800/50'
            }`}
          >
            Installer Setup
          </button>
          <button
            onClick={() => onTabChange('history')}
            className={`px-3 py-1 rounded text-xs whitespace-nowrap ${
              config.activeTab === 'history' ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-600/30' : 'text-slate-400 bg-slate-800/50'
            }`}
          >
            Usage History
          </button>
          <button
            onClick={() => onTabChange('cloud_sync')}
            className={`px-3 py-1 rounded text-xs whitespace-nowrap ${
              config.activeTab === 'cloud_sync' ? 'bg-sky-600/20 text-sky-400 border border-sky-600/30' : 'text-slate-400 bg-slate-800/50'
            }`}
          >
            Drive Sync
          </button>
        </div>
      </div>
    </header>
  );
};
