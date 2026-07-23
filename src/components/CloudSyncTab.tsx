import React, { useState, useEffect } from 'react';
import {
  Cloud,
  HardDrive,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileJson,
  RotateCcw,
  Shield,
  Copy,
  Check,
  ExternalLink,
  LogOut,
  Sparkles,
  Lock
} from 'lucide-react';
import { User } from 'firebase/auth';
import { AppConfig } from '../types';
import { exportConfigJSON, parseAndValidateImportJSON, saveAppConfig } from '../services/storageService';
import {
  googleSignIn,
  googleSignOut,
  initDriveAuth,
  saveConfigToDrive,
  loadConfigFromDrive,
  findDriveConfigFile,
  DriveFileMetadata,
  DRIVE_CONFIG_FILE_NAME
} from '../services/googleDriveService';
import { INITIAL_APP_CONFIG } from '../data/defaults';

interface CloudSyncTabProps {
  config: AppConfig;
  onUpdateConfig: (newConfig: AppConfig) => void;
  onShowToast: (message: string) => void;
}

export const CloudSyncTab: React.FC<CloudSyncTabProps> = ({
  config,
  onUpdateConfig,
  onShowToast,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isDriveOperating, setIsDriveOperating] = useState(false);
  const [driveFile, setDriveFile] = useState<DriveFileMetadata | null>(null);
  const [driveError, setDriveError] = useState<string | null>(null);

  // Confirmation Modals State
  const [showSaveConfirmModal, setShowSaveConfirmModal] = useState(false);
  const [showRestoreConfirmModal, setShowRestoreConfirmModal] = useState(false);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);

  // JSON Inspection
  const [showJsonInspector, setShowJsonInspector] = useState(false);
  const [hasCopiedJson, setHasCopiedJson] = useState(false);

  // Check auth state on mount
  useEffect(() => {
    const unsubscribe = initDriveAuth(
      (currentUser, accessToken) => {
        setUser(currentUser);
        setToken(accessToken);
        setIsAuthLoading(false);
        checkDriveFileStatus(accessToken);
      },
      () => {
        setUser(null);
        setToken(null);
        setIsAuthLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const checkDriveFileStatus = async (accessToken: string) => {
    try {
      setDriveError(null);
      const metadata = await findDriveConfigFile(accessToken);
      setDriveFile(metadata);
    } catch (err: any) {
      console.error('Failed to query Drive file status:', err);
      setDriveError(err?.message || 'Failed to connect to Google Drive API');
    }
  };

  const handleGoogleSignIn = async () => {
    setIsAuthLoading(true);
    setDriveError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        onShowToast('Connected to Google Drive successfully!');
        await checkDriveFileStatus(result.accessToken);
      }
    } catch (err: any) {
      console.error('Sign-in error:', err);
      setDriveError(err?.message || 'Google Drive authentication failed');
      onShowToast('Google Drive authentication failed');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleGoogleSignOut = async () => {
    try {
      await googleSignOut();
      setUser(null);
      setToken(null);
      setDriveFile(null);
      onShowToast('Signed out from Google Drive');
    } catch (err: any) {
      console.error('Sign-out error:', err);
    }
  };

  // Perform Save to Google Drive
  const executeSaveToDrive = async () => {
    if (!token) return;
    setIsDriveOperating(true);
    setDriveError(null);
    setShowSaveConfirmModal(false);

    try {
      const updatedMeta = await saveConfigToDrive(token, config);
      setDriveFile(updatedMeta);
      onShowToast('Saved configuration to Google Drive!');
    } catch (err: any) {
      console.error('Drive save error:', err);
      setDriveError(err?.message || 'Failed to save configuration to Google Drive');
      onShowToast('Failed to save to Google Drive');
    } finally {
      setIsDriveOperating(false);
    }
  };

  // Perform Restore from Google Drive
  const executeRestoreFromDrive = async () => {
    if (!token) return;
    setIsDriveOperating(true);
    setDriveError(null);
    setShowRestoreConfirmModal(false);

    try {
      const { config: downloadedConfig, metadata } = await loadConfigFromDrive(token);
      setDriveFile(metadata);
      onUpdateConfig(downloadedConfig);
      saveAppConfig(downloadedConfig);
      onShowToast('Restored application configuration from Google Drive!');
    } catch (err: any) {
      console.error('Drive restore error:', err);
      setDriveError(err?.message || 'Failed to restore configuration from Google Drive');
      onShowToast('Failed to restore from Google Drive');
    } finally {
      setIsDriveOperating(false);
    }
  };

  // Import local JSON File
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const importedConfig = parseAndValidateImportJSON(text);
        onUpdateConfig(importedConfig);
        onShowToast(`Successfully imported ${importedConfig.hotkeys.length} hotkey workflows!`);
      } catch (err: any) {
        onShowToast(`Import failed: ${err.message || 'Invalid JSON file'}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Reset to default presets
  const handleResetDefaults = () => {
    onUpdateConfig(INITIAL_APP_CONFIG);
    saveAppConfig(INITIAL_APP_CONFIG);
    setShowResetConfirmModal(false);
    onShowToast('Reset application configuration to default presets');
  };

  const copyJsonToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(config, null, 2));
    setHasCopiedJson(true);
    setTimeout(() => setHasCopiedJson(false), 2000);
    onShowToast('JSON copied to clipboard!');
  };

  const jsonString = JSON.stringify(config, null, 2);
  const jsonSizeKB = (new Blob([jsonString]).size / 1024).toFixed(2);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-[#15181E] border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-sky-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-sky-600/20 border border-sky-500/30 flex items-center justify-center text-sky-400">
                <Cloud className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Configuration Sync & Cloud Backup
              </h2>
            </div>
            <p className="text-xs text-slate-400 max-w-2xl">
              All application workflows, prompt presets, and model settings are persistently saved in local storage. You can also sync and backup your setup seamlessly to your personal Google Drive.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => exportConfigJSON(config)}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition flex items-center space-x-2"
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" />
              <span>Export JSON</span>
            </button>

            <button
              onClick={() => setShowJsonInspector(!showJsonInspector)}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition flex items-center space-x-2"
            >
              <FileJson className="w-3.5 h-3.5 text-sky-400" />
              <span>{showJsonInspector ? 'Hide JSON' : 'Inspect JSON'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Google Drive Sync & Local Storage Management */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GOOGLE DRIVE CLOUD STORAGE CARD */}
        <div className="bg-[#15181E] border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                  <Cloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">Google Drive Cloud Sync</h3>
                  <p className="text-xs text-slate-400">Sync <code className="text-sky-400 font-mono">quickkeys_config.json</code> with your Drive</p>
                </div>
              </div>

              {user && (
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-medium flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Connected</span>
                </span>
              )}
            </div>

            {/* Auth status & controls */}
            {!user ? (
              <div className="bg-[#0F1115] border border-slate-800 rounded-xl p-5 space-y-4">
                <p className="text-xs text-slate-300">
                  Connect your Google account to enable 1-click cloud sync and backup across devices.
                </p>

                {/* Google Sign In Material Button */}
                <button
                  onClick={handleGoogleSignIn}
                  disabled={isAuthLoading}
                  className="w-full h-11 bg-white hover:bg-slate-100 text-slate-800 rounded-xl px-4 font-semibold text-xs transition flex items-center justify-center space-x-3 shadow-md disabled:opacity-50 cursor-pointer"
                >
                  <svg className="w-5 h-5" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                  </svg>
                  <span>{isAuthLoading ? 'Connecting...' : 'Sign in with Google'}</span>
                </button>

                <div className="flex items-center space-x-2 text-[11px] text-slate-500">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Uses <code className="text-slate-400 font-mono">drive.file</code> scope: only accesses files created by QuickKeys AI.</span>
                </div>
              </div>
            ) : (
              <div className="bg-[#0F1115] border border-slate-800 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt={user.displayName || 'User'} className="w-9 h-9 rounded-full border border-slate-700" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-sky-600 flex items-center justify-center text-white font-bold text-sm">
                        {user.displayName?.[0] || user.email?.[0] || 'G'}
                      </div>
                    )}
                    <div>
                      <div className="text-xs font-semibold text-white">{user.displayName || 'Google User'}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{user.email}</div>
                    </div>
                  </div>

                  <button
                    onClick={handleGoogleSignOut}
                    className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800/60 transition"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>

                {/* File Status Details */}
                <div className="border-t border-slate-800 pt-3 text-xs space-y-2">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Google Drive File:</span>
                    <span className="font-mono text-slate-200">{DRIVE_CONFIG_FILE_NAME}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Cloud Backup Status:</span>
                    {driveFile ? (
                      <span className="text-emerald-400 font-medium flex items-center space-x-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Backed Up ({new Date(driveFile.modifiedTime || '').toLocaleDateString()})</span>
                      </span>
                    ) : (
                      <span className="text-amber-400 font-medium">No cloud backup found yet</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Error Banner */}
            {driveError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{driveError}</span>
              </div>
            )}

            {/* Cloud Sync Actions */}
            {user && (
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setShowSaveConfirmModal(true)}
                    disabled={isDriveOperating}
                    className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs transition flex items-center justify-center space-x-2 shadow-lg shadow-sky-600/20 disabled:opacity-50 cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Save to Drive</span>
                  </button>

                  <button
                    onClick={() => setShowRestoreConfirmModal(true)}
                    disabled={isDriveOperating}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-xs transition flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw className={`w-4 h-4 ${isDriveOperating ? 'animate-spin' : ''}`} />
                    <span>Restore from Drive</span>
                  </button>
                </div>

                {driveFile?.webViewLink && (
                  <a
                    href={driveFile.webViewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-sky-400 hover:underline flex items-center justify-center space-x-1 pt-1"
                  >
                    <span>View quickkeys_config.json on Google Drive</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            )}
          </div>

          <div className="text-[11px] text-slate-500 border-t border-slate-800/60 pt-3 flex items-center justify-between">
            <span>Security: Official OAuth 2.0 Token Client</span>
            <span>Cloud Sync v1.2</span>
          </div>
        </div>

        {/* LOCAL STORAGE MANAGEMENT CARD */}
        <div className="bg-[#15181E] border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <HardDrive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">Local Browser Persistence</h3>
                  <p className="text-xs text-slate-400">Browser <code className="text-indigo-400 font-mono">localStorage</code> cache</p>
                </div>
              </div>

              <span className="px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-[11px] font-mono">
                {jsonSizeKB} KB
              </span>
            </div>

            {/* Local Stats Breakdown */}
            <div className="bg-[#0F1115] border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="text-[11px] text-slate-400 uppercase tracking-wider font-bold">Active Hotkey Workflows</div>
                  <div className="text-lg font-bold text-white font-mono">{config.hotkeys.length}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-[11px] text-slate-400 uppercase tracking-wider font-bold">Execution History Logs</div>
                  <div className="text-lg font-bold text-white font-mono">{config.history?.length || 0} items</div>
                </div>
              </div>

              <div className="border-t border-slate-800/80 pt-3 text-xs space-y-1.5">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Storage Key:</span>
                  <code className="text-slate-300 font-mono text-[11px]">quickkeys_ai_config_v1.2</code>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>App Version:</span>
                  <span className="text-indigo-400 font-semibold font-mono">v{config.version}</span>
                </div>
              </div>
            </div>

            {/* Local Actions */}
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => exportConfigJSON(config)}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/20"
                >
                  <Download className="w-4 h-4" />
                  <span>Export Backup</span>
                </button>

                <label className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-xs transition flex items-center justify-center space-x-2 cursor-pointer">
                  <Upload className="w-4 h-4 text-emerald-400" />
                  <span>Import JSON File</span>
                  <input
                    type="file"
                    accept=".json,application/json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <button
                onClick={() => setShowResetConfirmModal(true)}
                className="w-full px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-xs font-medium transition flex items-center justify-center space-x-2"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Default Presets</span>
              </button>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 border-t border-slate-800/60 pt-3 flex items-center justify-between">
            <span>Persistence: Instant Client LocalStorage</span>
            <span>UTF-8 JSON Format</span>
          </div>
        </div>
      </div>

      {/* JSON INSPECTOR PANEL */}
      {showJsonInspector && (
        <div className="bg-[#15181E] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileJson className="w-4 h-4 text-sky-400" />
              <h3 className="text-sm font-bold text-white">Live Application JSON State Payload</h3>
              <span className="text-xs text-slate-500 font-mono">({jsonSizeKB} KB)</span>
            </div>

            <button
              onClick={copyJsonToClipboard}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition flex items-center space-x-1.5"
            >
              {hasCopiedJson ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{hasCopiedJson ? 'Copied!' : 'Copy JSON'}</span>
            </button>
          </div>

          <pre className="bg-[#0F1115] border border-slate-800 rounded-xl p-4 text-xs font-mono text-sky-300/90 max-h-96 overflow-y-auto selection:bg-sky-600 selection:text-white">
            {jsonString}
          </pre>
        </div>
      )}

      {/* CONFIRMATION MODAL: SAVE TO GOOGLE DRIVE */}
      {showSaveConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#15181E] border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Confirm Google Drive Backup</h3>
                <p className="text-xs text-slate-400">Save configuration to Cloud</p>
              </div>
            </div>

            <div className="text-xs text-slate-300 space-y-2 bg-[#0F1115] p-4 rounded-xl border border-slate-800">
              <p>
                Are you sure you want to upload and overwrite <code className="text-sky-400 font-mono">{DRIVE_CONFIG_FILE_NAME}</code> in your Google Drive account?
              </p>
              <ul className="list-disc list-inside text-slate-400 space-y-1 pt-1">
                <li><strong className="text-slate-200">{config.hotkeys.length}</strong> hotkey workflows</li>
                <li>API Provider configuration settings</li>
                <li>Overlay window preferences & history log</li>
              </ul>
            </div>

            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => setShowSaveConfirmModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={executeSaveToDrive}
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-lg shadow-sky-600/30 transition flex items-center space-x-2"
              >
                <Upload className="w-4 h-4" />
                <span>Confirm Upload to Drive</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: RESTORE FROM GOOGLE DRIVE */}
      {showRestoreConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#15181E] border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Confirm Google Drive Restore</h3>
                <p className="text-xs text-slate-400">Restore configuration from Cloud</p>
              </div>
            </div>

            <div className="text-xs text-slate-300 space-y-2 bg-[#0F1115] p-4 rounded-xl border border-slate-800">
              <p>
                This action will download <code className="text-sky-400 font-mono">{DRIVE_CONFIG_FILE_NAME}</code> from your Google Drive and replace your current local browser workflows and settings.
              </p>
              <p className="text-amber-400 font-medium">
                Are you sure you want to proceed with restoring from cloud storage?
              </p>
            </div>

            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => setShowRestoreConfirmModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={executeRestoreFromDrive}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-lg shadow-amber-600/30 transition flex items-center space-x-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Confirm Restore</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: RESET DEFAULTS */}
      {showResetConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#15181E] border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Reset Configuration</h3>
                <p className="text-xs text-slate-400">Restore factory default workflows</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 bg-[#0F1115] p-4 rounded-xl border border-slate-800">
              Are you sure you want to reset all hotkey workflows and settings back to factory default presets? Custom workflows will be erased unless previously exported.
            </p>

            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => setShowResetConfirmModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={handleResetDefaults}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition"
              >
                Reset Configuration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
