import React, { useState } from 'react';
import {
  Download,
  Terminal,
  FileCode,
  Check,
  Copy,
  ExternalLink,
  ShieldAlert,
  Sparkles,
  Layers,
  FileArchive,
  Command,
} from 'lucide-react';
import { AppConfig } from '../types';
import {
  generateElectronMainCode,
  generateWindowsInstallerScript,
  generateDesktopReadme,
} from '../services/desktopPackageGenerator';

interface DesktopSetupGuideProps {
  config: AppConfig;
}

export const DesktopSetupGuide: React.FC<DesktopSetupGuideProps> = ({ config }) => {
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [activeCodeTab, setActiveCodeTab] = useState<'main' | 'installer' | 'readme'>('main');

  const electronMainCode = generateElectronMainCode(config);
  const installerScript = generateWindowsInstallerScript();
  const readmeMarkdown = generateDesktopReadme(config);

  const downloadFile = (filename: string, content: string, type = 'text/plain') => {
    const element = document.createElement('a');
    const file = new Blob([content], { type });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleCopyCommands = () => {
    const commands = `cd QuickKeysAI\nnpm install\nnpm run dev\nnpx electron-builder --win nsis`;
    navigator.clipboard.writeText(commands);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Download className="w-4 h-4" />
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Windows Executable Installer & Source Code
              </h2>
            </div>
            <p className="text-xs text-slate-400 max-w-xl">
              Export and install QuickKeys AI as a native Windows executable (\`.exe\`) with system tray and global hotkey hooks.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => downloadFile('install.ps1', installerScript, 'text/x-powershell')}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition flex items-center space-x-2"
            >
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              <span>Download install.ps1</span>
            </button>

            <button
              onClick={() => downloadFile('README.md', readmeMarkdown, 'text/markdown')}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition flex items-center space-x-2"
            >
              <FileCode className="w-3.5 h-3.5 text-amber-400" />
              <span>Download README.md</span>
            </button>

            <button
              onClick={() => downloadFile('main.js', electronMainCode, 'application/javascript')}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition flex items-center space-x-2"
            >
              <FileArchive className="w-4 h-4" />
              <span>Download Windows Code Package</span>
            </button>
          </div>
        </div>
      </div>

      {/* QUICK COMMAND LINE CARD */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Terminal className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-bold text-white">Local Build & Installation Commands</h3>
          </div>

          <button
            onClick={handleCopyCommands}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition flex items-center space-x-1.5"
          >
            {copiedCmd ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedCmd ? 'Commands Copied!' : 'Copy Commands'}</span>
          </button>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-indigo-300 space-y-2 select-all">
          <p className="text-slate-500"># 1. Extract source files to directory</p>
          <p className="text-slate-200">cd QuickKeysAI</p>
          <p className="text-slate-500"># 2. Install native Electron dependencies</p>
          <p className="text-slate-200">npm install</p>
          <p className="text-slate-500"># 3. Test in local Windows dev runner</p>
          <p className="text-slate-200">npm run dev</p>
          <p className="text-slate-500"># 4. Compile standalone Windows NSIS Setup Installer (.exe)</p>
          <p className="text-emerald-400">npx electron-builder --win nsis</p>
        </div>
      </div>

      {/* CODE VIEWERS / CODE BASE INSPECTOR */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl flex flex-col">
        {/* Tab Headers */}
        <div className="bg-slate-950 border-b border-slate-800 px-4 py-2.5 flex items-center space-x-2 select-none">
          <button
            onClick={() => setActiveCodeTab('main')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeCodeTab === 'main'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            main.js (Electron Native Process)
          </button>

          <button
            onClick={() => setActiveCodeTab('installer')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeCodeTab === 'installer'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            install.ps1 (Auto-Installer Script)
          </button>

          <button
            onClick={() => setActiveCodeTab('readme')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeCodeTab === 'readme'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            README.md (Windows Setup Guide)
          </button>
        </div>

        {/* Code Content Box */}
        <div className="p-4 bg-slate-950 max-h-[480px] overflow-y-auto">
          <pre className="font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed select-all">
            {activeCodeTab === 'main' && electronMainCode}
            {activeCodeTab === 'installer' && installerScript}
            {activeCodeTab === 'readme' && readmeMarkdown}
          </pre>
        </div>
      </div>
    </div>
  );
};
