import React, { useState } from 'react';
import {
  UserCheck,
  Plus,
  Copy,
  Edit3,
  Trash2,
  Download,
  Upload,
  CheckCircle2,
  Sparkles,
  Layers,
  ArrowRight,
  Shield,
  Cloud,
  FileJson,
  Zap,
  Globe,
  StickyNote,
  Sliders,
  RefreshCw,
  Clock,
  Check
} from 'lucide-react';
import { User } from 'firebase/auth';
import { AppConfig, UserProfile } from '../types';
import {
  createProfile,
  switchActiveProfile,
  renameProfile,
  deleteProfile,
  exportSingleProfileJSON,
  parseAndValidateImportJSON,
  saveAppConfig
} from '../services/storageService';
import { saveConfigToDrive, loadConfigFromDrive } from '../services/googleDriveService';

interface ProfileManagerProps {
  config: AppConfig;
  onUpdateConfig: (newConfig: AppConfig) => void;
  onShowToast: (message: string) => void;
  user: User | null;
  googleToken: string | null;
  onOpenCloudSyncTab: () => void;
}

export const ProfileManager: React.FC<ProfileManagerProps> = ({
  config,
  onUpdateConfig,
  onShowToast,
  user,
  googleToken,
  onOpenCloudSyncTab,
}) => {
  const profiles = config.profiles && config.profiles.length > 0 ? config.profiles : [];
  const activeProfileId = config.activeProfileId || profiles[0]?.id;
  const activeProfile = profiles.find((p) => p.id === activeProfileId) || profiles[0];

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileDesc, setNewProfileDesc] = useState('');
  const [cloneSourceId, setCloneSourceId] = useState<string>('none');

  const [editingProfile, setEditingProfile] = useState<UserProfile | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const [deletingProfileId, setDeletingProfileId] = useState<string | null>(null);

  const [isSyncingDrive, setIsSyncingDrive] = useState(false);

  // Switch Active Profile
  const handleSwitchProfile = (profileId: string) => {
    try {
      const updated = switchActiveProfile(config, profileId);
      onUpdateConfig(updated);
      const switched = profiles.find((p) => p.id === profileId);
      onShowToast(`Switched to active profile: "${switched?.name || 'Profile'}"`);
    } catch (err: any) {
      onShowToast(`Failed to switch profile: ${err.message}`);
    }
  };

  // Create or Clone Profile
  const handleCreateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileName.trim()) {
      onShowToast('Please provide a profile name');
      return;
    }

    try {
      const sourceId = cloneSourceId !== 'none' ? cloneSourceId : undefined;
      const updated = createProfile(config, newProfileName.trim(), newProfileDesc.trim(), sourceId);
      onUpdateConfig(updated);
      setIsCreateModalOpen(false);
      setNewProfileName('');
      setNewProfileDesc('');
      setCloneSourceId('none');
      onShowToast(`Created and activated new profile: "${newProfileName.trim()}"`);
    } catch (err: any) {
      onShowToast(`Error creating profile: ${err.message}`);
    }
  };

  // Save Renamed Profile
  const handleSaveRename = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfile || !editName.trim()) return;

    try {
      const updated = renameProfile(config, editingProfile.id, editName.trim(), editDesc.trim());
      onUpdateConfig(updated);
      setEditingProfile(null);
      onShowToast('Updated profile metadata successfully');
    } catch (err: any) {
      onShowToast(`Error updating profile: ${err.message}`);
    }
  };

  // Confirm Delete Profile
  const handleConfirmDelete = () => {
    if (!deletingProfileId) return;

    try {
      const targetName = profiles.find((p) => p.id === deletingProfileId)?.name;
      const updated = deleteProfile(config, deletingProfileId);
      onUpdateConfig(updated);
      setDeletingProfileId(null);
      onShowToast(`Deleted profile "${targetName || 'Profile'}"`);
    } catch (err: any) {
      onShowToast(`Failed to delete profile: ${err.message}`);
    }
  };

  // Import Single Profile or Full Backup JSON
  const handleImportProfileFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        if (parsed.exportType === 'quickkeys_profile_v1.2' || parsed.id && parsed.hotkeys) {
          // Import single profile
          const importedProfile: UserProfile = {
            id: `profile-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            name: parsed.name ? `${parsed.name} (Imported)` : 'Imported Profile',
            description: parsed.description || 'Imported user workspace profile',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isDefault: false,
            providers: parsed.providers || config.providers,
            hotkeys: parsed.hotkeys || [],
            overlaySettings: parsed.overlaySettings || config.overlaySettings,
            history: [],
            notes: parsed.notes || [],
            quickNotesShortcut: parsed.quickNotesShortcut || 'Alt + N',
            aiAnywhereShortcut: parsed.aiAnywhereShortcut || 'Alt + Space',
            webOverlayProfiles: parsed.webOverlayProfiles || [],
            activeWebOverlayProfileId: parsed.activeWebOverlayProfileId,
          };

          const newProfiles = [...profiles, importedProfile];
          const updated = { ...config, profiles: newProfiles };
          const finalConfig = switchActiveProfile(updated, importedProfile.id);
          onUpdateConfig(finalConfig);
          onShowToast(`Successfully imported profile "${importedProfile.name}"!`);
        } else {
          // Full config import
          const fullConfig = parseAndValidateImportJSON(text);
          onUpdateConfig(fullConfig);
          onShowToast('Imported complete multi-profile backup!');
        }
      } catch (err: any) {
        onShowToast(`Import failed: ${err.message || 'Invalid profile JSON'}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Sync to Google Drive
  const handleDriveSyncNow = async () => {
    if (!googleToken) {
      onOpenCloudSyncTab();
      return;
    }

    setIsSyncingDrive(true);
    try {
      await saveConfigToDrive(googleToken, config);
      onShowToast('All profiles synchronized to Google Drive!');
    } catch (err: any) {
      onShowToast(`Drive sync failed: ${err.message}`);
    } finally {
      setIsSyncingDrive(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-[#15181E] border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Layers className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-white tracking-tight">Profile Management & Workspaces</h2>
            </div>
            <p className="text-xs text-slate-400 max-w-2xl">
              Create independent profiles with distinct AI hotkey workflows, quick notes, custom prompts, and web overlay tools. Switch workspaces instantly across work, personal, and coding environments.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <label className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition flex items-center space-x-2 cursor-pointer shadow-sm">
              <Upload className="w-3.5 h-3.5 text-emerald-400" />
              <span>Import Profile</span>
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleImportProfileFile}
                className="hidden"
              />
            </label>

            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition flex items-center space-x-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Profile</span>
            </button>
          </div>
        </div>

        {/* Cloud Sync Status Bar */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2 text-slate-300">
            <Cloud className="w-4 h-4 text-sky-400" />
            <span>Google Drive Synchronization:</span>
            {user ? (
              <span className="text-emerald-400 font-medium flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Connected ({user.email})</span>
              </span>
            ) : (
              <span className="text-amber-400 font-medium">Not Connected</span>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleDriveSyncNow}
              disabled={isSyncingDrive}
              className="px-3 py-1.5 rounded-lg bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 text-[11px] font-medium transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingDrive ? 'animate-spin' : ''}`} />
              <span>{user ? 'Sync Profiles to Drive' : 'Connect Google Drive'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Profiles Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {profiles.map((profile) => {
          const isActive = profile.id === activeProfileId;
          const hotkeysCount = profile.hotkeys?.length || 0;
          const notesCount = profile.notes?.length || 0;
          const webProfilesCount = profile.webOverlayProfiles?.length || 0;

          return (
            <div
              key={profile.id}
              className={`bg-[#15181E] border rounded-2xl p-5 shadow-xl transition-all duration-200 flex flex-col justify-between space-y-4 relative overflow-hidden ${
                isActive
                  ? 'border-indigo-500/80 ring-2 ring-indigo-500/20 shadow-indigo-500/10'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              {isActive && (
                <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[10px] uppercase font-bold tracking-wider px-3 py-1 rounded-bl-xl shadow-md flex items-center space-x-1">
                  <Check className="w-3 h-3" />
                  <span>Active Profile</span>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-start justify-between pr-20">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-base font-bold text-white tracking-tight">{profile.name}</h3>
                      {profile.isDefault && (
                        <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 text-[10px] font-medium">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-2">
                      {profile.description || 'No description provided.'}
                    </p>
                  </div>
                </div>

                {/* Profile Stats Breakdown */}
                <div className="bg-[#0F1115] border border-slate-800/80 rounded-xl p-3 grid grid-cols-3 gap-2 text-center">
                  <div className="space-y-0.5">
                    <div className="text-[10px] text-slate-500 uppercase font-semibold flex items-center justify-center space-x-1">
                      <Zap className="w-3 h-3 text-indigo-400" />
                      <span>Hotkeys</span>
                    </div>
                    <div className="text-sm font-bold text-white font-mono">{hotkeysCount}</div>
                  </div>

                  <div className="space-y-0.5">
                    <div className="text-[10px] text-slate-500 uppercase font-semibold flex items-center justify-center space-x-1">
                      <StickyNote className="w-3 h-3 text-emerald-400" />
                      <span>Notes</span>
                    </div>
                    <div className="text-sm font-bold text-white font-mono">{notesCount}</div>
                  </div>

                  <div className="space-y-0.5">
                    <div className="text-[10px] text-slate-500 uppercase font-semibold flex items-center justify-center space-x-1">
                      <Globe className="w-3 h-3 text-sky-400" />
                      <span>Web Tools</span>
                    </div>
                    <div className="text-sm font-bold text-white font-mono">{webProfilesCount}</div>
                  </div>
                </div>

                {/* Metadata */}
                <div className="text-[11px] text-slate-500 flex items-center space-x-1 font-mono pt-1">
                  <Clock className="w-3 h-3" />
                  <span>Updated {new Date(profile.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between gap-2">
                {!isActive ? (
                  <button
                    onClick={() => handleSwitchProfile(profile.id)}
                    className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition flex items-center justify-center space-x-1.5 shadow-md shadow-indigo-600/20 cursor-pointer"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Switch Profile</span>
                  </button>
                ) : (
                  <span className="flex-1 py-2 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold text-xs flex items-center justify-center space-x-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Active Now</span>
                  </span>
                )}

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => {
                      setCloneSourceId(profile.id);
                      setNewProfileName(`${profile.name} (Copy)`);
                      setIsCreateModalOpen(true);
                    }}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                    title="Clone Profile"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => {
                      setEditingProfile(profile);
                      setEditName(profile.name);
                      setEditDesc(profile.description || '');
                    }}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                    title="Rename / Edit Metadata"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => exportSingleProfileJSON(profile)}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                    title="Export Profile JSON"
                  >
                    <Download className="w-3.5 h-3.5 text-indigo-400" />
                  </button>

                  {profiles.length > 1 && (
                    <button
                      onClick={() => setDeletingProfileId(profile.id)}
                      className="p-2 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition"
                      title="Delete Profile"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* CREATE / CLONE PROFILE MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#15181E] border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {cloneSourceId !== 'none' ? 'Clone Existing Profile' : 'Create New Profile'}
                  </h3>
                  <p className="text-xs text-slate-400">Add an independent workspace configuration</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProfile} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Profile Name</label>
                <input
                  type="text"
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  placeholder="e.g. Research & Writing, Code Review Workspace"
                  className="w-full bg-[#0F1115] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Description (Optional)</label>
                <input
                  type="text"
                  value={newProfileDesc}
                  onChange={(e) => setNewProfileDesc(e.target.value)}
                  placeholder="e.g. Optimized for Spanish translations and Claude 3.5 Sonnet"
                  className="w-full bg-[#0F1115] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Configuration Source</label>
                <select
                  value={cloneSourceId}
                  onChange={(e) => setCloneSourceId(e.target.value)}
                  className="w-full bg-[#0F1115] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="none">Empty Profile (Factory Defaults)</option>
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      Clone from: {p.name} ({p.hotkeys?.length || 0} hotkeys)
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-[#0F1115] border border-slate-800 rounded-xl text-xs text-slate-400 space-y-1">
                <span className="font-semibold text-slate-200">What gets saved in this profile:</span>
                <ul className="list-disc list-inside text-[11px] space-y-0.5 text-slate-400">
                  <li>Custom AI Hotkeys & System Prompts</li>
                  <li>Quick Notes Library</li>
                  <li>AI API Providers & Keys</li>
                  <li>Floating Overlay Settings</li>
                  <li>Web Overlay Browsing Profiles</li>
                </ul>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition flex items-center space-x-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create & Activate Profile</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RENAME / EDIT PROFILE MODAL */}
      {editingProfile && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#15181E] border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-sky-600/20 border border-sky-500/30 flex items-center justify-center text-sky-400">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Rename Profile</h3>
                  <p className="text-xs text-slate-400">Update profile label and details</p>
                </div>
              </div>
              <button
                onClick={() => setEditingProfile(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRename} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Profile Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-[#0F1115] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-sky-500 font-medium"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Description</label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  rows={3}
                  className="w-full bg-[#0F1115] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingProfile(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-lg shadow-sky-600/30 transition"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingProfileId && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#15181E] border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Profile</h3>
                <p className="text-xs text-slate-400">Permanently remove workspace</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 bg-[#0F1115] p-4 rounded-xl border border-slate-800">
              Are you sure you want to delete profile <strong className="text-white">"{profiles.find((p) => p.id === deletingProfileId)?.name}"</strong>? All associated hotkeys, notes, and local configurations will be removed.
            </p>

            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => setDeletingProfileId(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-600/30 transition"
              >
                Delete Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
