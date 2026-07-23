import { AppConfig, HistoryItem, HotkeyPreset, QuickNote, UserProfile, WebOverlayProfile, AutomationWorkflow } from '../types';
import { INITIAL_APP_CONFIG, DEFAULT_HOTKEY_PRESETS, DEFAULT_QUICK_NOTES, DEFAULT_WEB_OVERLAY_PROFILES, DEFAULT_USER_PROFILES, DEFAULT_PROVIDERS, DEFAULT_AUTOMATIONS } from '../data/defaults';

const STORAGE_KEY = 'quickkeys_ai_config_v1.2';

/**
 * Ensures config has initialized profiles array and syncs current state to active profile.
 */
export function syncActiveProfileToProfiles(config: AppConfig): AppConfig {
  const profiles: UserProfile[] = Array.isArray(config.profiles) && config.profiles.length > 0
    ? [...config.profiles]
    : [...DEFAULT_USER_PROFILES];

  let activeId = config.activeProfileId || profiles[0].id;
  let activeIndex = profiles.findIndex(p => p.id === activeId);

  if (activeIndex === -1) {
    activeId = profiles[0].id;
    activeIndex = 0;
  }

  // Update current active profile snapshot
  profiles[activeIndex] = {
    ...profiles[activeIndex],
    updatedAt: new Date().toISOString(),
    providers: config.providers || DEFAULT_PROVIDERS,
    hotkeys: config.hotkeys || DEFAULT_HOTKEY_PRESETS,
    overlaySettings: config.overlaySettings || INITIAL_APP_CONFIG.overlaySettings,
    history: config.history || [],
    notes: config.notes || DEFAULT_QUICK_NOTES,
    quickNotesShortcut: config.quickNotesShortcut || 'Alt + N',
    aiAnywhereShortcut: config.aiAnywhereShortcut || 'Alt + Space',
    webOverlayProfiles: config.webOverlayProfiles || DEFAULT_WEB_OVERLAY_PROFILES,
    activeWebOverlayProfileId: config.activeWebOverlayProfileId,
    automations: config.automations || DEFAULT_AUTOMATIONS,
  };

  return {
    ...config,
    activeProfileId: activeId,
    profiles,
  };
}

export function loadAppConfig(): AppConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      saveAppConfig(INITIAL_APP_CONFIG);
      return INITIAL_APP_CONFIG;
    }
    const parsed = JSON.parse(raw);
    
    // Ensure all required fields exist
    const baseConfig: AppConfig = {
      ...INITIAL_APP_CONFIG,
      ...parsed,
      providers: {
        ...INITIAL_APP_CONFIG.providers,
        ...(parsed.providers || {}),
      },
      overlaySettings: {
        ...INITIAL_APP_CONFIG.overlaySettings,
        ...(parsed.overlaySettings || {}),
      },
      hotkeys: Array.isArray(parsed.hotkeys) && parsed.hotkeys.length > 0
        ? parsed.hotkeys
        : DEFAULT_HOTKEY_PRESETS,
      history: Array.isArray(parsed.history) ? parsed.history : [],
      notes: Array.isArray(parsed.notes) ? parsed.notes : DEFAULT_QUICK_NOTES,
      quickNotesShortcut: parsed.quickNotesShortcut || 'Alt + N',
      aiAnywhereShortcut: parsed.aiAnywhereShortcut || 'Alt + Space',
      webOverlayProfiles: Array.isArray(parsed.webOverlayProfiles) && parsed.webOverlayProfiles.length > 0
        ? parsed.webOverlayProfiles
        : DEFAULT_WEB_OVERLAY_PROFILES,
      activeWebOverlayProfileId: parsed.activeWebOverlayProfileId || DEFAULT_WEB_OVERLAY_PROFILES[0].id,
      automations: Array.isArray(parsed.automations) && parsed.automations.length > 0
        ? parsed.automations
        : DEFAULT_AUTOMATIONS,
      autoCloudSync: parsed.autoCloudSync !== undefined ? parsed.autoCloudSync : true,
    };

    return syncActiveProfileToProfiles(baseConfig);
  } catch (e) {
    console.error('Failed to load QuickKeys AI config from localStorage:', e);
    return INITIAL_APP_CONFIG;
  }
}

export function saveAppConfig(config: AppConfig): void {
  try {
    const synced = syncActiveProfileToProfiles(config);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(synced));
  } catch (e) {
    console.error('Failed to save QuickKeys AI config:', e);
  }
}

export function switchActiveProfile(config: AppConfig, targetProfileId: string): AppConfig {
  const syncedConfig = syncActiveProfileToProfiles(config);
  const profiles = syncedConfig.profiles || DEFAULT_USER_PROFILES;
  const targetProfile = profiles.find(p => p.id === targetProfileId);

  if (!targetProfile) {
    throw new Error(`Profile with ID '${targetProfileId}' not found`);
  }

  const updatedConfig: AppConfig = {
    ...syncedConfig,
    activeProfileId: targetProfile.id,
    providers: targetProfile.providers,
    hotkeys: targetProfile.hotkeys,
    overlaySettings: targetProfile.overlaySettings,
    history: targetProfile.history,
    notes: targetProfile.notes,
    quickNotesShortcut: targetProfile.quickNotesShortcut || 'Alt + N',
    aiAnywhereShortcut: targetProfile.aiAnywhereShortcut || 'Alt + Space',
    webOverlayProfiles: targetProfile.webOverlayProfiles || DEFAULT_WEB_OVERLAY_PROFILES,
    activeWebOverlayProfileId: targetProfile.activeWebOverlayProfileId || DEFAULT_WEB_OVERLAY_PROFILES[0].id,
    automations: targetProfile.automations || DEFAULT_AUTOMATIONS,
  };

  saveAppConfig(updatedConfig);
  return updatedConfig;
}

export function createProfile(
  config: AppConfig,
  name: string,
  description?: string,
  cloneFromProfileId?: string
): AppConfig {
  const syncedConfig = syncActiveProfileToProfiles(config);
  const profiles = [...(syncedConfig.profiles || DEFAULT_USER_PROFILES)];

  let baseProfile: Partial<UserProfile> = {};
  if (cloneFromProfileId) {
    const sourceProfile = profiles.find(p => p.id === cloneFromProfileId);
    if (sourceProfile) {
      baseProfile = {
        providers: JSON.parse(JSON.stringify(sourceProfile.providers)),
        hotkeys: JSON.parse(JSON.stringify(sourceProfile.hotkeys)),
        overlaySettings: JSON.parse(JSON.stringify(sourceProfile.overlaySettings)),
        history: [], // fresh history for cloned profile
        notes: JSON.parse(JSON.stringify(sourceProfile.notes)),
        quickNotesShortcut: sourceProfile.quickNotesShortcut,
        aiAnywhereShortcut: sourceProfile.aiAnywhereShortcut,
        webOverlayProfiles: JSON.parse(JSON.stringify(sourceProfile.webOverlayProfiles)),
        activeWebOverlayProfileId: sourceProfile.activeWebOverlayProfileId,
        automations: JSON.parse(JSON.stringify(sourceProfile.automations || DEFAULT_AUTOMATIONS)),
      };
    }
  }

  const newProfile: UserProfile = {
    id: `profile-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    name,
    description: description || (cloneFromProfileId ? 'Cloned profile workspace' : 'Custom user workspace profile'),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isDefault: false,
    providers: baseProfile.providers || DEFAULT_PROVIDERS,
    hotkeys: baseProfile.hotkeys || DEFAULT_HOTKEY_PRESETS,
    overlaySettings: baseProfile.overlaySettings || INITIAL_APP_CONFIG.overlaySettings,
    history: [],
    notes: baseProfile.notes || [],
    quickNotesShortcut: baseProfile.quickNotesShortcut || 'Alt + N',
    aiAnywhereShortcut: baseProfile.aiAnywhereShortcut || 'Alt + Space',
    webOverlayProfiles: baseProfile.webOverlayProfiles || DEFAULT_WEB_OVERLAY_PROFILES,
    activeWebOverlayProfileId: baseProfile.activeWebOverlayProfileId || DEFAULT_WEB_OVERLAY_PROFILES[0].id,
    automations: baseProfile.automations || DEFAULT_AUTOMATIONS,
  };

  profiles.push(newProfile);

  const updatedConfig: AppConfig = {
    ...syncedConfig,
    profiles,
  };

  // Automatically switch to newly created profile
  return switchActiveProfile(updatedConfig, newProfile.id);
}

export function renameProfile(
  config: AppConfig,
  profileId: string,
  newName: string,
  newDescription?: string
): AppConfig {
  const syncedConfig = syncActiveProfileToProfiles(config);
  const profiles = (syncedConfig.profiles || []).map(p => {
    if (p.id === profileId) {
      return {
        ...p,
        name: newName,
        description: newDescription !== undefined ? newDescription : p.description,
        updatedAt: new Date().toISOString(),
      };
    }
    return p;
  });

  const updatedConfig: AppConfig = {
    ...syncedConfig,
    profiles,
  };

  saveAppConfig(updatedConfig);
  return updatedConfig;
}

export function deleteProfile(config: AppConfig, profileId: string): AppConfig {
  const syncedConfig = syncActiveProfileToProfiles(config);
  const profiles = (syncedConfig.profiles || []).filter(p => p.id !== profileId);

  if (profiles.length === 0) {
    throw new Error('Cannot delete the last remaining profile');
  }

  let nextActiveId = syncedConfig.activeProfileId;
  if (syncedConfig.activeProfileId === profileId) {
    nextActiveId = profiles[0].id;
  }

  const updatedConfig: AppConfig = {
    ...syncedConfig,
    profiles,
  };

  if (nextActiveId && nextActiveId !== syncedConfig.activeProfileId) {
    return switchActiveProfile(updatedConfig, nextActiveId);
  } else {
    saveAppConfig(updatedConfig);
    return updatedConfig;
  }
}

export function exportSingleProfileJSON(profile: UserProfile): void {
  const cleanProfile = {
    ...profile,
    exportDate: new Date().toISOString(),
    exportType: 'quickkeys_profile_v1.2',
  };

  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(cleanProfile, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `quickkeys-profile-${profile.name.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

export function addQuickNote(
  config: AppConfig,
  noteData: { title?: string; content: string; isPinned?: boolean; color?: QuickNote['color'] }
): AppConfig {
  const newNote: QuickNote = {
    id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    title: noteData.title || '',
    content: noteData.content,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isPinned: noteData.isPinned || false,
    color: noteData.color || 'indigo',
  };

  const updatedNotes = [newNote, ...(config.notes || [])];
  const newConfig = { ...config, notes: updatedNotes };
  saveAppConfig(newConfig);
  return newConfig;
}

export function updateQuickNote(
  config: AppConfig,
  id: string,
  updates: Partial<Omit<QuickNote, 'id' | 'createdAt'>>
): AppConfig {
  const updatedNotes = (config.notes || []).map((note) =>
    note.id === id
      ? {
          ...note,
          ...updates,
          updatedAt: new Date().toISOString(),
        }
      : note
  );
  const newConfig = { ...config, notes: updatedNotes };
  saveAppConfig(newConfig);
  return newConfig;
}

export function deleteQuickNote(config: AppConfig, id: string): AppConfig {
  const updatedNotes = (config.notes || []).filter((note) => note.id !== id);
  const newConfig = { ...config, notes: updatedNotes };
  saveAppConfig(newConfig);
  return newConfig;
}

export function togglePinQuickNote(config: AppConfig, id: string): AppConfig {
  const updatedNotes = (config.notes || []).map((note) =>
    note.id === id ? { ...note, isPinned: !note.isPinned, updatedAt: new Date().toISOString() } : note
  );
  const newConfig = { ...config, notes: updatedNotes };
  saveAppConfig(newConfig);
  return newConfig;
}

// ================= AUTOMATION WORKFLOW HELPERS ================= //

export function saveAutomationWorkflow(config: AppConfig, workflow: AutomationWorkflow): AppConfig {
  const automations = [...(config.automations || DEFAULT_AUTOMATIONS)];
  const existingIdx = automations.findIndex(a => a.id === workflow.id);

  const updatedWorkflow: AutomationWorkflow = {
    ...workflow,
    updatedAt: new Date().toISOString(),
  };

  if (existingIdx >= 0) {
    automations[existingIdx] = updatedWorkflow;
  } else {
    automations.unshift(updatedWorkflow);
  }

  const updatedConfig: AppConfig = {
    ...config,
    automations,
  };

  saveAppConfig(updatedConfig);
  return updatedConfig;
}

export function deleteAutomationWorkflow(config: AppConfig, workflowId: string): AppConfig {
  const automations = (config.automations || []).filter(a => a.id !== workflowId);
  const updatedConfig: AppConfig = {
    ...config,
    automations,
  };

  saveAppConfig(updatedConfig);
  return updatedConfig;
}

export function duplicateAutomationWorkflow(config: AppConfig, workflowId: string): AppConfig {
  const automations = config.automations || [];
  const target = automations.find(a => a.id === workflowId);
  if (!target) return config;

  const cloned: AutomationWorkflow = {
    ...JSON.parse(JSON.stringify(target)),
    id: `auto-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    name: `${target.name} (Copy)`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    cloudBackup: {
      isSynced: false,
    },
  };

  return saveAutomationWorkflow(config, cloned);
}

export function exportAutomationWorkflowJSON(workflow: AutomationWorkflow): void {
  const cleanData = {
    ...workflow,
    exportDate: new Date().toISOString(),
    exportType: 'quickkeys_automation_v1.0',
  };

  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(cleanData, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `automation-${workflow.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${new Date().toISOString().split('T')[0]}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

export function updateAutomationCloudBackupStatus(
  config: AppConfig,
  workflowId: string,
  cloudStatus: { lastBackedUpAt?: string; driveFileId?: string; isSynced: boolean }
): AppConfig {
  const automations = (config.automations || []).map(a => {
    if (a.id === workflowId) {
      return {
        ...a,
        updatedAt: new Date().toISOString(),
        cloudBackup: cloudStatus,
      };
    }
    return a;
  });

  const updatedConfig = { ...config, automations };
  saveAppConfig(updatedConfig);
  return updatedConfig;
}

export function addHistoryItem(config: AppConfig, item: Omit<HistoryItem, 'id' | 'timestamp'>): AppConfig {
  const newItem: HistoryItem = {
    ...item,
    id: `hist-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: Date.now(),
  };

  // Limit history size to 100 entries to preserve storage
  const updatedHistory = [newItem, ...(config.history || [])].slice(0, 100);
  const newConfig: AppConfig = {
    ...config,
    history: updatedHistory,
  };

  saveAppConfig(newConfig);
  return newConfig;
}

export function exportConfigJSON(config: AppConfig): void {
  const cleanConfig = {
    ...config,
    // Clear API keys when exporting if user wants clean template, or include
    exportDate: new Date().toISOString(),
  };

  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(cleanConfig, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `quickkeys-ai-backup-${new Date().toISOString().split('T')[0]}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

export function parseAndValidateImportJSON(jsonText: string): AppConfig {
  const parsed = JSON.parse(jsonText);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid JSON format');
  }

  if (!Array.isArray(parsed.hotkeys)) {
    throw new Error('Import file missing hotkeys array structure');
  }

  const mergedConfig: AppConfig = {
    ...INITIAL_APP_CONFIG,
    ...parsed,
    providers: {
      ...INITIAL_APP_CONFIG.providers,
      ...(parsed.providers || {}),
    },
    overlaySettings: {
      ...INITIAL_APP_CONFIG.overlaySettings,
      ...(parsed.overlaySettings || {}),
    },
    hotkeys: parsed.hotkeys.map((hk: any) => ({
      ...hk,
      id: hk.id || `preset-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      comboString: hk.comboString || formatComboString(hk.keys),
    })),
  };

  saveAppConfig(mergedConfig);
  return mergedConfig;
}

export function formatComboString(keys: HotkeyPreset['keys']): string {
  if (!keys) return 'Unset';
  const parts: string[] = [];
  if (keys.ctrlKey) parts.push('Ctrl');
  if (keys.altKey) parts.push('Alt');
  if (keys.shiftKey) parts.push('Shift');
  if (keys.metaKey) parts.push('Win');

  let keyDisplay = keys.key.toUpperCase();
  if (keyDisplay === ' ') keyDisplay = 'Space';
  if (keys.code === 'Space') keyDisplay = 'Space';

  parts.push(keyDisplay);
  return parts.join(' + ');
}
