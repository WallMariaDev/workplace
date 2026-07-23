export type AIProvider = 'gemini' | 'openai' | 'anthropic' | 'ollama' | 'openrouter' | 'custom';
export type WebOverlayProviderType = 'chatgpt' | 'gemini' | 'claude' | 'perplexity' | 'grok' | 'deepseek' | 'custom';

export type OverlayMode = 'compact' | 'expanded' | 'minimal' | 'pip';

export interface WebOverlayProfile {
  id: string;
  name: string;
  providerType: WebOverlayProviderType;
  url: string;
  shortcut: string; // e.g. "Ctrl + Alt + W"
  isEnabled: boolean;
  width: number;
  height: number;
  position: 'near_cursor' | 'center' | 'top_right' | 'bottom_right';
  alwaysOnTop: boolean;
  description?: string;
}
export type OutputAction = 'show_overlay' | 'copy_direct' | 'replace_selection' | 'speak_audio';
export type AppContextType = 'word' | 'vscode' | 'browser' | 'scratchpad';

export interface ModelSpec {
  id: string;
  name: string;
  provider: AIProvider;
  description: string;
  maxTokens: number;
  isFreeOrLocal?: boolean;
}

export interface HotkeyKeys {
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  metaKey: boolean; // Windows key
  key: string;
  code?: string;
}

export interface HotkeyPreset {
  id: string;
  title: string;
  category: 'Editing' | 'Coding' | 'Summarization' | 'Translation' | 'Productivity' | 'Custom';
  keys: HotkeyKeys;
  comboString: string; // e.g. "Ctrl + Alt + P"
  provider: AIProvider;
  model: string;
  promptTemplate: string; // Supports {text} placeholder
  systemPrompt?: string;
  temperature: number;
  isEnabled: boolean;
  autoCopy: boolean;
  autoReplace: boolean;
  enableTTS: boolean;
  overlayMode: OverlayMode;
  outputAction: OutputAction;
  updatedAt: number;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  hotkeyTitle: string;
  hotkeyShortcut: string;
  provider: AIProvider;
  model: string;
  inputText: string;
  outputText: string;
  executionTimeMs: number;
  status: 'success' | 'error' | 'cancelled';
  errorMessage?: string;
  tokenCountEstimate?: number;
  appContext?: AppContextType;
}

export interface OverlaySettings {
  positionMode: 'near_cursor' | 'center' | 'top_right' | 'bottom_right';
  theme: 'glass_dark' | 'glass_light' | 'fluent_accent' | 'cyberpunk';
  autoCloseOnCopy: boolean;
  enableTTS: boolean;
  defaultVoice: string;
  fontSize: 'sm' | 'md' | 'lg';
  windowWidth: number;
  alwaysOnTop: boolean;
  opacity: number;
  showTokenCount: boolean;
  soundEffects: boolean;
}

export interface ProviderConfig {
  apiKey: string;
  baseUrl?: string;
  defaultModel?: string;
  isEnabled: boolean;
}

export interface QuickNote {
  id: string;
  title?: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  isPinned: boolean;
  color?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'sky' | 'slate';
}

export type ActionType =
  | 'click'
  | 'double_click'
  | 'right_click'
  | 'type_text'
  | 'shortcut'
  | 'scroll'
  | 'drag_drop'
  | 'wait'
  | 'window_change'
  | 'browser_navigate';

export interface AutomationLocator {
  // Browser DOM Locators
  domSelector?: string;
  xpath?: string;
  elementId?: string;
  cssSelector?: string;
  elementText?: string;
  ariaLabel?: string;
  placeholder?: string;
  dataAttributes?: Record<string, string>;
  parentChildPath?: string;

  // Windows UI Automation
  winControlName?: string;
  winAutomationId?: string;
  winControlType?: string;
  winWindowTitle?: string;
  winRelativePos?: { xPercent: number; yPercent: number };

  // Universal Fallbacks
  imageTemplate?: string; // base64 or SVG thumbnail
  pixelPatternHash?: string;
  relativeCoords?: { xPercent: number; yPercent: number };
  absoluteCoords?: { x: number; y: number };
}

export interface AutomationStep {
  id: string;
  stepNumber: number;
  actionType: ActionType;
  label: string;
  targetDescription: string;
  locators: AutomationLocator;
  inputValue?: string; // May contain variable placeholders like {{TaskTitle}}
  shortcutKeys?: string;
  scrollDelta?: { x: number; y: number };
  dragToCoords?: { xPercent: number; yPercent: number };
  waitMs?: number;
  windowTitleTarget?: string;
  urlTarget?: string;
  retryOnFailure?: boolean;
  timeoutMs?: number;
  isDisabled?: boolean;
  isOptional?: boolean;
  notes?: string;
  groupName?: string;
  healthStatus?: 'high' | 'medium' | 'warning';
}

export interface AutomationVariable {
  id: string;
  name: string; // e.g., "TaskTitle"
  label: string;
  type: 'text' | 'number' | 'date' | 'time' | 'clipboard' | 'selected_text' | 'custom_input';
  defaultValue?: string;
  description?: string;
}

export interface CloudBackupStatus {
  lastBackedUpAt?: string;
  driveFileId?: string;
  isSynced: boolean;
}

export interface AutomationWorkflow {
  id: string;
  name: string;
  description?: string;
  folder?: string;
  shortcut?: string;
  createdAt: string;
  updatedAt: string;
  variables: AutomationVariable[];
  steps: AutomationStep[];
  repeatCount?: number;
  playbackSpeed?: 0.5 | 1 | 2 | 5;
  cloudBackup?: CloudBackupStatus;
}

export interface UserProfile {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  isDefault?: boolean;
  providers: Record<AIProvider, ProviderConfig>;
  hotkeys: HotkeyPreset[];
  overlaySettings: OverlaySettings;
  history: HistoryItem[];
  notes: QuickNote[];
  quickNotesShortcut: string;
  aiAnywhereShortcut: string;
  webOverlayProfiles: WebOverlayProfile[];
  activeWebOverlayProfileId?: string;
  automations?: AutomationWorkflow[];
}

export interface AppConfig {
  version: string;
  activeProfileId?: string;
  profiles?: UserProfile[];
  providers: Record<AIProvider, ProviderConfig>;
  hotkeys: HotkeyPreset[];
  overlaySettings: OverlaySettings;
  history: HistoryItem[];
  notes?: QuickNote[];
  quickNotesShortcut?: string;
  aiAnywhereShortcut?: string;
  webOverlayProfiles?: WebOverlayProfile[];
  activeWebOverlayProfileId?: string;
  automations?: AutomationWorkflow[];
  activeTab: 'manager' | 'simulator' | 'installer' | 'providers' | 'history' | 'cloud_sync' | 'notes' | 'web_overlay' | 'profiles' | 'automations';
  autoCloudSync?: boolean;
}

export interface OverlayTriggerState {
  isOpen: boolean;
  preset: HotkeyPreset | null;
  selectedText: string;
  appContext: AppContextType;
  position: { x: number; y: number };
  isGenerating: boolean;
  outputText: string;
  error: string | null;
  executionTimeMs: number;
  followUpText: string;
  chatHistory: { role: 'user' | 'assistant'; text: string }[];
}
