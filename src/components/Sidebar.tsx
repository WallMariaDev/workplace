import React, { useState } from 'react';
import {
  Keyboard,
  Monitor,
  Settings,
  Download,
  History,
  Cloud,
  StickyNote,
  Globe,
  Zap,
  Layers,
  ChevronDown,
  Video,
  DownloadCloud,
  FileJson,
  RotateCcw,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  X,
  Sparkles,
  Bot
} from 'lucide-react';
import { AppConfig } from '../types';

interface SidebarProps {
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

export const Sidebar: React.FC<SidebarProps> = ({
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
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const notesCount = (config.notes || []).length;
  const profiles = config.profiles || [];
  const activeProfile = profiles.find((p) => p.id === config.activeProfileId) || profiles[0];

  const menuGroups = [
    {
      title: 'CORE WORKSPACE',
      items: [
        {
          id: 'profiles' as const,
          label: 'Profiles',
          icon: Layers,
          badge: profiles.length,
          color: 'text-indigo-400',
          activeBg: 'bg-indigo-600/20 text-indigo-300 border-indigo-500/30',
        },
        {
          id: 'manager' as const,
          label: 'Hotkeys Studio',
          icon: Keyboard,
          badge: config.hotkeys.length,
          color: 'text-indigo-400',
          activeBg: 'bg-indigo-600/20 text-indigo-300 border-indigo-500/30',
        },
        {
          id: 'automations' as const,
          label: 'Automations',
          icon: Video,
          badge: config.automations?.length || 0,
          color: 'text-emerald-400',
          activeBg: 'bg-emerald-600/20 text-emerald-300 border-emerald-500/30',
        },
        {
          id: 'web_overlay' as const,
          label: 'Web AI Overlay',
          icon: Globe,
          color: 'text-cyan-400',
          activeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
        },
        {
          id: 'notes' as const,
          label: 'Quick Notes',
          icon: StickyNote,
          badge: notesCount,
          color: 'text-amber-400',
          activeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        },
      ],
    },
    {
      title: 'TESTING & CONFIG',
      items: [
        {
          id: 'simulator' as const,
          label: 'Sandbox Simulator',
          icon: Monitor,
          color: 'text-cyan-400',
          activeBg: 'bg-indigo-600/20 text-indigo-300 border-indigo-500/30',
        },
        {
          id: 'providers' as const,
          label: 'AI Providers',
          icon: Settings,
          color: 'text-purple-400',
          activeBg: 'bg-purple-600/20 text-purple-300 border-purple-500/30',
        },
        {
          id: 'installer' as const,
          label: 'Installer Setup',
          icon: Download,
          color: 'text-emerald-400',
          activeBg: 'bg-emerald-600/20 text-emerald-300 border-emerald-500/30',
        },
        {
          id: 'history' as const,
          label: 'Usage History',
          icon: History,
          color: 'text-amber-400',
          activeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        },
        {
          id: 'cloud_sync' as const,
          label: 'Drive Cloud Sync',
          icon: Cloud,
          color: 'text-sky-400',
          activeBg: 'bg-sky-600/20 text-sky-300 border-sky-500/30',
        },
      ],
    },
  ];

  const handleNavClick = (tab: AppConfig['activeTab']) => {
    onTabChange(tab);
    setIsMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Top Navigation Bar */}
      <div className="md:hidden bg-[#15181E] border-b border-slate-800 p-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-bold italic shadow-lg shadow-indigo-500/20 text-white text-sm">
            Q
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight">QuickKeys AI</h1>
            <p className="text-[10px] text-slate-400">Windows AI Studio</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {onOpenAiAnywhere && (
            <button
              onClick={onOpenAiAnywhere}
              className="p-2 rounded-lg bg-indigo-600/20 text-indigo-300 border border-indigo-500/30"
              title="Launch AI Anywhere"
            >
              <Zap className="w-4 h-4 text-indigo-400 fill-indigo-400 animate-pulse" />
            </button>
          )}

          <button
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
            aria-label="Toggle Navigation Menu"
          >
            {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/75 backdrop-blur-sm z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Desktop & Mobile Sidebar Container */}
      <aside
        className={`fixed md:sticky top-0 z-50 h-screen bg-[#15181E] border-r border-slate-800/80 flex flex-col justify-between transition-all duration-300 shadow-2xl ${
          isMobileOpen
            ? 'translate-x-0 w-72 inset-y-0 left-0'
            : '-translate-x-full md:translate-x-0'
        } ${isCollapsed ? 'md:w-20' : 'md:w-64'}`}
      >
        {/* Sidebar Header / Brand */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
          <div
            className="flex items-center space-x-3 cursor-pointer overflow-hidden"
            onClick={() => handleNavClick('manager')}
          >
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center font-bold italic shadow-lg shadow-indigo-500/30 text-white text-base shrink-0">
              Q
            </div>
            {(!isCollapsed || isMobileOpen) && (
              <div className="space-y-0.5 truncate">
                <div className="flex items-center space-x-1.5">
                  <h1 className="text-sm font-bold text-white tracking-tight truncate">QuickKeys AI</h1>
                  <span className="px-1.5 py-0.2 text-[9px] font-mono bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded">
                    v{config.version}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 truncate">System Hotkeys & Automation</p>
              </div>
            )}
          </div>

          {/* Desktop Collapse / Expand Button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition shrink-0"
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>

        {/* Scrollable Navigation Body */}
        <div className="flex-1 overflow-y-auto p-3 space-y-5 no-scrollbar">
          {/* Active Profile Switcher */}
          {profiles.length > 0 && onSwitchProfile && (!isCollapsed || isMobileOpen) && (
            <div className="bg-[#0F1115] border border-slate-800/80 rounded-xl p-2.5 space-y-1">
              <label className="text-[10px] uppercase font-mono font-bold text-slate-500 block">
                Active Workspace
              </label>
              <div className="relative">
                <select
                  value={activeProfile?.id || ''}
                  onChange={(e) => onSwitchProfile(e.target.value)}
                  className="w-full appearance-none bg-[#15181E] border border-indigo-500/30 text-indigo-200 text-xs font-semibold rounded-lg px-2.5 py-1.5 pr-6 focus:outline-none focus:border-indigo-500 cursor-pointer transition truncate"
                >
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id} className="bg-[#15181E] text-white">
                      Profile: {p.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-indigo-400 absolute right-2 top-2 pointer-events-none" />
              </div>
            </div>
          )}

          {/* AI Anywhere Launch Button */}
          {onOpenAiAnywhere && (
            <button
              onClick={onOpenAiAnywhere}
              className={`w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-indigo-600/30 to-purple-600/30 hover:from-indigo-600/40 hover:to-purple-600/40 border border-indigo-500/40 text-indigo-200 text-xs font-bold transition flex items-center shadow-lg shadow-indigo-600/10 cursor-pointer ${
                isCollapsed && !isMobileOpen ? 'justify-center' : 'justify-between'
              }`}
              title="Launch AI Anywhere Universal Launcher (Alt+Space)"
            >
              <div className="flex items-center space-x-2 truncate">
                <Zap className="w-4 h-4 text-indigo-400 fill-indigo-400 animate-pulse shrink-0" />
                {(!isCollapsed || isMobileOpen) && <span className="truncate">AI Anywhere</span>}
              </div>
              {(!isCollapsed || isMobileOpen) && (
                <kbd className="px-1.5 py-0.5 bg-indigo-950 border border-indigo-500/40 rounded text-[10px] text-indigo-300 font-mono">
                  Alt+Space
                </kbd>
              )}
            </button>
          )}

          {/* Navigation Menu Groups */}
          {menuGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-1.5">
              {(!isCollapsed || isMobileOpen) && (
                <div className="px-2 text-[10px] font-mono uppercase font-bold text-slate-500 tracking-wider">
                  {group.title}
                </div>
              )}

              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = config.activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition cursor-pointer border ${
                        isActive
                          ? item.activeBg
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/60 border-transparent'
                      } ${isCollapsed && !isMobileOpen ? 'justify-center px-0' : ''}`}
                      title={item.label}
                    >
                      <div className="flex items-center space-x-2.5 truncate">
                        <Icon className={`w-4 h-4 shrink-0 ${item.color}`} />
                        {(!isCollapsed || isMobileOpen) && <span className="truncate">{item.label}</span>}
                      </div>

                      {(!isCollapsed || isMobileOpen) && item.badge !== undefined && (
                        <span
                          className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                            isActive ? 'bg-white/10 text-white' : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar Footer / Quick Tools */}
        <div className="p-3 border-t border-slate-800/80 space-y-2 bg-[#0F1115]/50">
          {(!isCollapsed || isMobileOpen) && (
            <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
              <span>Settings Backup</span>
              <span className="text-[10px] text-slate-500 font-mono">JSON</span>
            </div>
          )}

          <div className="grid grid-cols-3 gap-1 bg-[#15181E] p-1 rounded-xl border border-slate-800">
            <button
              onClick={onExportConfig}
              title="Backup / Export Settings JSON"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition flex items-center justify-center"
            >
              <DownloadCloud className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onImportConfig}
              title="Import Settings JSON"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition flex items-center justify-center"
            >
              <FileJson className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onResetConfig}
              title="Reset Settings to Defaults"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition flex items-center justify-center"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
