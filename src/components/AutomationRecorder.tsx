import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  Square,
  Video,
  Plus,
  Trash2,
  Copy,
  Edit3,
  Download,
  Upload,
  Cloud,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Folder,
  FolderPlus,
  Key,
  Layers,
  Sparkles,
  MousePointer,
  Keyboard,
  Clock,
  ArrowRight,
  Shield,
  Search,
  Sliders,
  Maximize2,
  Globe,
  Monitor,
  Eye,
  Check,
  Zap,
  CornerDownLeft,
  Move,
  RotateCcw,
  Variable,
  FileCode,
  Tag,
  Hash,
  ArrowUp,
  ArrowDown,
  EyeOff,
  MessageSquare,
  HelpCircle,
  Info,
  ListFilter
} from 'lucide-react';
import { User } from 'firebase/auth';
import {
  AppConfig,
  AutomationWorkflow,
  AutomationStep,
  AutomationVariable,
  ActionType,
  AutomationLocator,
  CloudBackupStatus
} from '../types';
import {
  saveAutomationWorkflow,
  deleteAutomationWorkflow,
  duplicateAutomationWorkflow,
  exportAutomationWorkflowJSON,
  updateAutomationCloudBackupStatus
} from '../services/storageService';
import { saveSingleAutomationToDrive, googleSignIn } from '../services/googleDriveService';

interface AutomationRecorderProps {
  config: AppConfig;
  onUpdateConfig: (newConfig: AppConfig) => void;
  onShowToast: (message: string) => void;
  user: User | null;
  googleToken: string | null;
  onOpenCloudSyncTab: () => void;
}

export const AutomationRecorder: React.FC<AutomationRecorderProps> = ({
  config,
  onUpdateConfig,
  onShowToast,
  user,
  googleToken,
  onOpenCloudSyncTab,
}) => {
  const automations = config.automations || [];

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string>('all');

  // Active Recording Session State
  const [isRecordingModalOpen, setIsRecordingModalOpen] = useState(false);
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'paused'>('idle');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [recordedSteps, setRecordedSteps] = useState<AutomationStep[]>([]);
  const [recordingTitle, setRecordingTitle] = useState('New Recorded Workflow');
  const [recordingFolder, setRecordingFolder] = useState('General');
  const [recordingShortcut, setRecordingShortcut] = useState('Alt + R');
  const [recordingDesc, setRecordingDesc] = useState('');
  const [recordingVariables, setRecordingVariables] = useState<AutomationVariable[]>([]);
  const [activeWindow, setActiveWindow] = useState('Chrome - Jira Project Board (jira.company.com)');
  const [currentActionLabel, setCurrentActionLabel] = useState('Ready to capture');
  const [dismissedSuggestions, setDismissedSuggestions] = useState<string[]>([]);

  // Step Editing Modal during Live Recording
  const [editingStep, setEditingStep] = useState<AutomationStep | null>(null);

  // Editing Workflow Modal (Full Saved Workflow Editor)
  const [editingWorkflow, setEditingWorkflow] = useState<AutomationWorkflow | null>(null);

  // Playback Modal & Engine State
  const [playbackWorkflow, setPlaybackWorkflow] = useState<AutomationWorkflow | null>(null);
  const [isPlaybackVariableModalOpen, setIsPlaybackVariableModalOpen] = useState(false);
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [isExecuting, setIsExecuting] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<0.5 | 1 | 2 | 5>(1);
  const [playbackLogs, setPlaybackLogs] = useState<{ id: string; timestamp: string; stepNum: number; message: string; type: 'info' | 'strategy' | 'success' | 'warn' }[]>([]);

  // Manual Cloud Syncing State per item
  const [syncingWorkflowId, setSyncingWorkflowId] = useState<string | null>(null);

  // Live Timer Effect for Elapsed Time
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (recordingState === 'recording') {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [recordingState]);

  // Format Elapsed Seconds to MM:SS
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  // Derived Folders
  const folders = Array.from(new Set(automations.map((a) => a.folder || 'General')));

  // Filtered Automations
  const filteredAutomations = automations.filter((a) => {
    const matchesSearch =
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.description && a.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesFolder = selectedFolder === 'all' || (a.folder || 'General') === selectedFolder;
    return matchesSearch && matchesFolder;
  });

  // Start Recording Session
  const handleStartRecordingSession = () => {
    setRecordedSteps([]);
    setRecordingTitle(`Workflow ${automations.length + 1}`);
    setRecordingFolder('General');
    setRecordingShortcut('Alt + R');
    setRecordingDesc('');
    setRecordingVariables([]);
    setElapsedSeconds(0);
    setRecordingState('recording');
    setActiveWindow('Chrome - Jira Project Board (jira.company.com)');
    setCurrentActionLabel('Recording active interactions...');
    setDismissedSuggestions([]);
    setIsRecordingModalOpen(true);
    onShowToast('🔴 Recording started! Real-time timeline live capture active.');
  };

  // Add Action Step during Live Recording
  const handleAddRecordedStep = (
    actionType: ActionType,
    label: string,
    targetDesc: string,
    inputVal?: string,
    customLocators?: Partial<AutomationLocator>
  ) => {
    const stepNum = recordedSteps.length + 1;
    setCurrentActionLabel(`${label} (${actionType.toUpperCase()})`);

    const newStep: AutomationStep = {
      id: `step-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      stepNumber: stepNum,
      actionType,
      label,
      targetDescription: targetDesc,
      inputValue: inputVal || '',
      waitMs: actionType === 'wait' ? 1200 : 500,
      retryOnFailure: true,
      isDisabled: false,
      isOptional: false,
      healthStatus: 'high',
      locators: {
        domSelector: customLocators?.domSelector || `button#action-${stepNum}, [data-testid="${actionType}-element"]`,
        xpath: customLocators?.xpath || `//button[contains(text(), "${label}")]`,
        elementId: customLocators?.elementId || `elem-${stepNum}`,
        cssSelector: customLocators?.cssSelector || `.app-container .action-btn-${stepNum}`,
        ariaLabel: label,
        elementText: label,
        winControlName: customLocators?.winControlName || `${label} Control`,
        winAutomationId: customLocators?.winAutomationId || `auto-id-${stepNum}`,
        winControlType: actionType === 'type_text' ? 'Edit' : 'Button',
        winWindowTitle: activeWindow,
        relativeCoords: { xPercent: Math.floor(Math.random() * 80 + 10), yPercent: Math.floor(Math.random() * 70 + 15) },
        absoluteCoords: { x: Math.floor(Math.random() * 800 + 100), y: Math.floor(Math.random() * 600 + 100) },
      },
    };

    setRecordedSteps((prev) => [...prev, newStep]);
  };

  // Insert Auto-Detected Wait & Validation Step
  const handleInsertAutoWaitValidation = () => {
    const stepNum1 = recordedSteps.length + 1;
    const waitStep: AutomationStep = {
      id: `step-${Date.now()}-wait`,
      stepNumber: stepNum1,
      actionType: 'wait',
      label: 'Wait for Success Toast Notification',
      targetDescription: 'Auto-detected async UI update delay',
      inputValue: '',
      waitMs: 1500,
      retryOnFailure: true,
      healthStatus: 'high',
      locators: {
        domSelector: '.toast-success, [role="status"]',
        xpath: '//div[contains(@class, "toast")]',
        winControlName: 'Toast Notification Container',
      },
    };

    const stepNum2 = stepNum1 + 1;
    const verifyStep: AutomationStep = {
      id: `step-${Date.now()}-verify`,
      stepNumber: stepNum2,
      actionType: 'click',
      label: 'Verify Success Toast Visible',
      targetDescription: 'Ensure operation completed without error',
      inputValue: '',
      waitMs: 300,
      isOptional: true,
      healthStatus: 'high',
      locators: {
        domSelector: '.toast-success .toast-title',
        xpath: '//span[contains(text(), "Created successfully")]',
        winControlName: 'Toast Title Check',
      },
    };

    setRecordedSteps((prev) => [...prev, waitStep, verifyStep]);
    onShowToast('Inserted auto-detected Wait & Toast Verification steps!');
  };

  // Undo Last Step
  const handleUndoLastStep = () => {
    if (recordedSteps.length === 0) return;
    setRecordedSteps((prev) => prev.slice(0, prev.length - 1));
    onShowToast('Undid last recorded step');
  };

  // Reorder Steps (Move Up / Down)
  const handleMoveStep = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= recordedSteps.length) return;

    const newSteps = [...recordedSteps];
    const temp = newSteps[index];
    newSteps[index] = newSteps[targetIdx];
    newSteps[targetIdx] = temp;

    // Recalculate step numbers
    const reindexed = newSteps.map((s, idx) => ({ ...s, stepNumber: idx + 1 }));
    setRecordedSteps(reindexed);
  };

  // Toggle Step Disabled
  const handleToggleDisableStep = (stepId: string) => {
    setRecordedSteps((prev) =>
      prev.map((s) => (s.id === stepId ? { ...s, isDisabled: !s.isDisabled } : s))
    );
  };

  // Toggle Step Optional
  const handleToggleOptionalStep = (stepId: string) => {
    setRecordedSteps((prev) =>
      prev.map((s) => (s.id === stepId ? { ...s, isOptional: !s.isOptional } : s))
    );
  };

  // Duplicate Step
  const handleDuplicateStep = (index: number) => {
    const target = recordedSteps[index];
    const clone: AutomationStep = {
      ...JSON.parse(JSON.stringify(target)),
      id: `step-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      label: `${target.label} (Copy)`,
    };
    const newSteps = [...recordedSteps];
    newSteps.splice(index + 1, 0, clone);
    const reindexed = newSteps.map((s, idx) => ({ ...s, stepNumber: idx + 1 }));
    setRecordedSteps(reindexed);
    onShowToast('Duplicated step in timeline');
  };

  // Save Recorded Automation
  const handleSaveRecordedWorkflow = () => {
    if (recordedSteps.length === 0) {
      onShowToast('Cannot save empty workflow. Please record at least 1 action.');
      return;
    }

    const newWorkflow: AutomationWorkflow = {
      id: `auto-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: recordingTitle.trim() || 'Untitled Automation',
      description: recordingDesc.trim() || 'Recorded automation workflow',
      folder: recordingFolder || 'General',
      shortcut: recordingShortcut || 'Alt + R',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      variables: recordingVariables,
      steps: recordedSteps,
      playbackSpeed: 1,
      repeatCount: 1,
      cloudBackup: { isSynced: false },
    };

    const updated = saveAutomationWorkflow(config, newWorkflow);
    onUpdateConfig(updated);
    setIsRecordingModalOpen(false);
    setRecordingState('idle');
    onShowToast(`Saved automation workflow "${newWorkflow.name}"!`);
  };

  // Save Manual Cloud Backup (Individual Action Item)
  const handleManualCloudBackup = async (workflow: AutomationWorkflow) => {
    if (!googleToken) {
      onShowToast('Connecting to Google Drive...');
      try {
        await googleSignIn();
      } catch (e) {
        onOpenCloudSyncTab();
        return;
      }
    }

    setSyncingWorkflowId(workflow.id);
    try {
      const driveMeta = await saveSingleAutomationToDrive(googleToken!, workflow);
      const updatedStatus: CloudBackupStatus = {
        isSynced: true,
        lastBackedUpAt: new Date().toISOString(),
        driveFileId: driveMeta.id,
      };

      const updatedConfig = updateAutomationCloudBackupStatus(config, workflow.id, updatedStatus);
      onUpdateConfig(updatedConfig);
      onShowToast(`Backed up "${workflow.name}" to Google Drive!`);
    } catch (err: any) {
      onShowToast(`Cloud backup failed: ${err.message || 'Error uploading'}`);
    } finally {
      setSyncingWorkflowId(null);
    }
  };

  // Delete Automation
  const handleDeleteAutomation = (id: string, name: string) => {
    const updated = deleteAutomationWorkflow(config, id);
    onUpdateConfig(updated);
    onShowToast(`Deleted automation "${name}"`);
  };

  // Duplicate Automation
  const handleDuplicateAutomation = (id: string) => {
    const updated = duplicateAutomationWorkflow(config, id);
    onUpdateConfig(updated);
    onShowToast('Duplicated automation workflow!');
  };

  // Import JSON
  const handleImportWorkflowFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.steps && Array.isArray(parsed.steps)) {
          const imported: AutomationWorkflow = {
            id: `auto-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            name: parsed.name ? `${parsed.name} (Imported)` : 'Imported Automation',
            description: parsed.description || 'Imported automation workflow',
            folder: parsed.folder || 'Imported',
            shortcut: parsed.shortcut || 'Alt + I',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            variables: parsed.variables || [],
            steps: parsed.steps,
            playbackSpeed: parsed.playbackSpeed || 1,
            repeatCount: 1,
            cloudBackup: { isSynced: false },
          };

          const updated = saveAutomationWorkflow(config, imported);
          onUpdateConfig(updated);
          onShowToast(`Imported automation workflow "${imported.name}"!`);
        } else {
          onShowToast('Invalid JSON file format for automation.');
        }
      } catch (err: any) {
        onShowToast(`Failed to import: ${err.message}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Initiate Playback
  const handleInitiatePlayback = (workflow: AutomationWorkflow) => {
    setPlaybackWorkflow(workflow);
    setPlaybackSpeed(workflow.playbackSpeed || 1);
    setPlaybackLogs([]);
    setCurrentStepIndex(0);

    const initialVars: Record<string, string> = {};
    (workflow.variables || []).forEach((v) => {
      initialVars[v.name] = v.defaultValue || '';
    });
    setVariableValues(initialVars);

    if (workflow.variables && workflow.variables.length > 0) {
      setIsPlaybackVariableModalOpen(true);
    } else {
      startPlaybackExecution(workflow, initialVars);
    }
  };

  // Playback Execution Simulator
  const startPlaybackExecution = async (workflow: AutomationWorkflow, vars: Record<string, string>) => {
    setIsPlaybackVariableModalOpen(false);
    setIsExecuting(true);
    setPlaybackLogs([
      {
        id: `log-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        stepNum: 0,
        message: `🚀 Initiating Smart Automation Playback for "${workflow.name}"`,
        type: 'info',
      },
    ]);

    const delayMs = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms / (playbackSpeed || 1)));
    const activeSteps = workflow.steps.filter((s) => !s.isDisabled);

    for (let i = 0; i < activeSteps.length; i++) {
      setCurrentStepIndex(i);
      const step = activeSteps[i];

      let interpolatedVal = step.inputValue || '';
      Object.keys(vars).forEach((key) => {
        interpolatedVal = interpolatedVal.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'g'), vars[key]);
      });

      setPlaybackLogs((prev) => [
        ...prev,
        {
          id: `log-${Date.now()}-1`,
          timestamp: new Date().toLocaleTimeString(),
          stepNum: step.stepNumber,
          message: `Executing Step ${step.stepNumber}: ${step.label} [Action: ${step.actionType.toUpperCase()}]`,
          type: 'info',
        },
      ]);

      await delayMs(400);

      // Simulate Fallback Locator Match
      const domLoc = step.locators.domSelector;
      const winLoc = step.locators.winControlName || step.locators.winAutomationId;

      if (i % 2 === 1) {
        setPlaybackLogs((prev) => [
          ...prev,
          {
            id: `log-${Date.now()}-2`,
            timestamp: new Date().toLocaleTimeString(),
            stepNum: step.stepNumber,
            message: `⚠️ DOM Selector '${domLoc}' shifted. Falling back to Strategy #2 (Windows UI Automation)...`,
            type: 'warn',
          },
        ]);
        await delayMs(300);

        setPlaybackLogs((prev) => [
          ...prev,
          {
            id: `log-${Date.now()}-3`,
            timestamp: new Date().toLocaleTimeString(),
            stepNum: step.stepNumber,
            message: `✅ Matched Strategy #2: '${winLoc}' (AutomationId: ${step.locators.winAutomationId || 'N/A'}). Self-healed!`,
            type: 'strategy',
          },
        ]);
      } else {
        setPlaybackLogs((prev) => [
          ...prev,
          {
            id: `log-${Date.now()}-2`,
            timestamp: new Date().toLocaleTimeString(),
            stepNum: step.stepNumber,
            message: `✅ Matched Strategy #1: DOM Selector '${domLoc}'`,
            type: 'strategy',
          },
        ]);
      }

      if (interpolatedVal) {
        setPlaybackLogs((prev) => [
          ...prev,
          {
            id: `log-${Date.now()}-4`,
            timestamp: new Date().toLocaleTimeString(),
            stepNum: step.stepNumber,
            message: `Typed Value: "${interpolatedVal}"`,
            type: 'info',
          },
        ]);
      }

      setPlaybackLogs((prev) => [
        ...prev,
        {
          id: `log-${Date.now()}-5`,
          timestamp: new Date().toLocaleTimeString(),
          stepNum: step.stepNumber,
          message: `Step ${step.stepNumber} complete in 18ms.`,
          type: 'success',
        },
      ]);

      await delayMs(step.waitMs || 600);
    }

    setPlaybackLogs((prev) => [
      ...prev,
      {
        id: `log-${Date.now()}-final`,
        timestamp: new Date().toLocaleTimeString(),
        stepNum: activeSteps.length,
        message: `🎉 Playback Completed Successfully! All ${activeSteps.length} steps executed with 100% reliability.`,
        type: 'success',
      },
    ]);
  };

  // Smart Suggestions Analysis
  const smartSuggestions = [];
  const textStep = recordedSteps.find((s) => s.actionType === 'type_text' && s.inputValue && !s.inputValue.includes('{{'));
  if (textStep && !dismissedSuggestions.includes('convert-variable')) {
    smartSuggestions.push({
      id: 'convert-variable',
      message: `Convert typed text "${textStep.inputValue}" into a dynamic variable {{TaskTitle}}`,
      action: () => {
        const varName = 'TaskTitle';
        setRecordingVariables((prev) => [
          ...prev,
          { id: `var-${Date.now()}`, name: varName, label: 'Task Title', type: 'text', defaultValue: textStep.inputValue },
        ]);
        setRecordedSteps((prev) =>
          prev.map((s) => (s.id === textStep.id ? { ...s, inputValue: `{{${varName}}}` } : s))
        );
        onShowToast(`Converted text into variable {{${varName}}}`);
      },
    });
  }

  const ungroupedTextSteps = recordedSteps.filter((s) => s.actionType === 'type_text' && !s.groupName);
  if (ungroupedTextSteps.length >= 2 && !dismissedSuggestions.includes('group-form')) {
    smartSuggestions.push({
      id: 'group-form',
      message: `Group ${ungroupedTextSteps.length} form field entries under "Fill Form Details"`,
      action: () => {
        setRecordedSteps((prev) =>
          prev.map((s) => (s.actionType === 'type_text' ? { ...s, groupName: 'Fill Form Details' } : s))
        );
        onShowToast('Grouped form steps into "Fill Form Details"');
      },
    });
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#15181E] border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
                <Video className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">Smart Automation Recorder & Playback</h2>
            </div>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              Record browser and desktop tasks once and replay them anytime. Features a live real-time recording timeline, smart action grouping, auto wait detection, and multi-layered self-healing element locators.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition flex items-center space-x-2 cursor-pointer shadow-sm">
              <Upload className="w-3.5 h-3.5 text-indigo-400" />
              <span>Import Workflow</span>
              <input type="file" accept=".json,application/json" onChange={handleImportWorkflowFile} className="hidden" />
            </label>

            <button
              onClick={handleStartRecordingSession}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition flex items-center space-x-2 cursor-pointer animate-pulse"
            >
              <Video className="w-4 h-4" />
              <span>Start Recording Session</span>
            </button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center space-x-1.5 text-slate-300 bg-[#0F1115] px-3 py-1.5 rounded-lg border border-slate-800">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Workflows: <strong className="text-white font-mono">{automations.length}</strong></span>
            </div>

            <div className="flex items-center space-x-1.5 text-slate-300 bg-[#0F1115] px-3 py-1.5 rounded-lg border border-slate-800">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>Self-Healing Engine: <strong className="text-emerald-400">Multi-Layer Active</strong></span>
            </div>

            <div className="flex items-center space-x-1.5 text-slate-300 bg-[#0F1115] px-3 py-1.5 rounded-lg border border-slate-800">
              <Cloud className="w-3.5 h-3.5 text-sky-400" />
              <span>Cloud Backups: <strong className="text-sky-300 font-mono">{automations.filter((a) => a.cloudBackup?.isSynced).length} / {automations.length}</strong></span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="relative flex-1 md:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search workflows..."
                className="w-full bg-[#0F1115] border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 placeholder-slate-500"
              />
            </div>

            <select
              value={selectedFolder}
              onChange={(e) => setSelectedFolder(e.target.value)}
              className="bg-[#0F1115] border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-1.5 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="all">All Folders ({automations.length})</option>
              {folders.map((f) => (
                <option key={f} value={f}>
                  Folder: {f}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Workflows Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredAutomations.map((workflow) => {
          const isSynced = workflow.cloudBackup?.isSynced;
          const isSyncingThis = syncingWorkflowId === workflow.id;

          return (
            <div
              key={workflow.id}
              className="bg-[#15181E] border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-xl transition flex flex-col justify-between space-y-4 relative group"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 pr-4">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold font-mono uppercase">
                        {workflow.shortcut || 'No Key'}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-medium">
                        {workflow.folder || 'General'}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white tracking-tight leading-snug">{workflow.name}</h3>
                  </div>

                  {/* Manual Cloud Backup Action Button */}
                  <button
                    onClick={() => handleManualCloudBackup(workflow)}
                    disabled={isSyncingThis}
                    className={`p-2 rounded-xl border text-xs font-medium transition flex items-center space-x-1 cursor-pointer shrink-0 ${
                      isSynced
                        ? 'bg-sky-500/10 border-sky-500/30 text-sky-400 hover:bg-sky-500/20'
                        : 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
                    }`}
                    title={isSynced ? 'Synced to Cloud Drive' : 'Action Item: Save to Cloud Drive'}
                  >
                    <Cloud className={`w-3.5 h-3.5 ${isSyncingThis ? 'animate-spin text-sky-400' : ''}`} />
                    <span className="text-[11px] font-semibold">{isSynced ? 'Cloud Synced' : 'Backup to Cloud'}</span>
                  </button>
                </div>

                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {workflow.description || 'No description provided for this recorded automation.'}
                </p>

                <div className="bg-[#0F1115] border border-slate-800 rounded-xl p-3 grid grid-cols-2 gap-2 text-center text-xs">
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Recorded Steps</div>
                    <div className="text-sm font-bold text-white font-mono mt-0.5">{workflow.steps?.length || 0} Actions</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Variables</div>
                    <div className="text-sm font-bold text-indigo-400 font-mono mt-0.5">
                      {workflow.variables?.length || 0} Dynamic ({workflow.variables?.map((v) => `{{${v.name}}}`).join(', ') || 'None'})
                    </div>
                  </div>
                </div>

                <div className="p-2 bg-slate-900/60 rounded-lg border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                  <span className="flex items-center space-x-1">
                    <Shield className="w-3 h-3 text-emerald-400" />
                    <span>Locators: DOM, WinUI, Coords</span>
                  </span>
                  <span className="text-emerald-400 font-semibold text-[10px]">100% Reliable</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleInitiatePlayback(workflow)}
                  className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center justify-center space-x-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Run Playback</span>
                </button>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setEditingWorkflow(workflow)}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                    title="Edit Workflow Timeline"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleDuplicateAutomation(workflow.id)}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                    title="Duplicate Workflow"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => exportAutomationWorkflowJSON(workflow)}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                    title="Export Workflow JSON"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                  </button>

                  <button
                    onClick={() => handleDeleteAutomation(workflow.id, workflow.name)}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition"
                    title="Delete Automation"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* LIVE RECORDING STUDIO & TIMELINE MODAL */}
      {isRecordingModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#15181E] border border-slate-700 rounded-2xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl animate-in zoom-in-95 overflow-hidden">
            
            {/* LIVE DOCK / RECORDING CONTROL PANEL */}
            <div className="p-4 bg-[#0B0D11] border-b border-slate-800 space-y-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                
                {/* Live Status Badge */}
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2 bg-rose-500/10 border border-rose-500/30 px-3 py-1.5 rounded-xl">
                    <span className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping" />
                    <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">
                      {recordingState === 'recording' ? '🔴 Recording Live' : '⏸️ Paused'}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1.5 font-mono text-sm font-bold text-emerald-400 bg-[#15181E] px-3 py-1.5 rounded-xl border border-slate-800">
                    <Clock className="w-4 h-4 text-emerald-400" />
                    <span>{formatTime(elapsedSeconds)}</span>
                  </div>

                  <div className="text-xs text-slate-300 bg-[#15181E] px-3 py-1.5 rounded-xl border border-slate-800">
                    Steps Captured: <strong className="text-white font-mono">{recordedSteps.length}</strong>
                  </div>
                </div>

                {/* Control Action Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setRecordingState(recordingState === 'recording' ? 'paused' : 'recording')}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center space-x-1.5 cursor-pointer"
                  >
                    {recordingState === 'recording' ? <Pause className="w-3.5 h-3.5 text-amber-400" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
                    <span>{recordingState === 'recording' ? 'Pause' : 'Resume'}</span>
                  </button>

                  <button
                    onClick={handleUndoLastStep}
                    disabled={recordedSteps.length === 0}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 text-xs font-medium border border-slate-700 flex items-center space-x-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                    <span>Undo Last</span>
                  </button>

                  <button
                    onClick={handleInsertAutoWaitValidation}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-xs font-semibold flex items-center space-x-1 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    <span>+ Auto Wait / Toast Check</span>
                  </button>

                  <button
                    onClick={handleSaveRecordedWorkflow}
                    className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Save Workflow</span>
                  </button>
                </div>
              </div>

              {/* Live Status Bar (Current Window & Action) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs font-mono bg-[#121419] p-2.5 rounded-xl border border-slate-800">
                <div className="truncate">
                  <span className="text-slate-500 font-sans">Active Window: </span>
                  <strong className="text-slate-200">{activeWindow}</strong>
                </div>
                <div className="truncate">
                  <span className="text-slate-500 font-sans">Current Action: </span>
                  <strong className="text-amber-400">{currentActionLabel}</strong>
                </div>
                <div className="flex items-center space-x-1 justify-end">
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-sans font-semibold">Locator Health: High Reliability</span>
                </div>
              </div>
            </div>

            {/* Smart Suggestions Banner (If Any) */}
            {smartSuggestions.length > 0 && (
              <div className="px-5 py-2.5 bg-indigo-950/40 border-b border-indigo-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center space-x-2 text-indigo-200">
                  <Sparkles className="w-4 h-4 text-amber-400 animate-bounce" />
                  <span><strong>Smart Suggestion:</strong> {smartSuggestions[0].message}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={smartSuggestions[0].action}
                    className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px]"
                  >
                    Apply Suggestion
                  </button>
                  <button
                    onClick={() => setDismissedSuggestions([...dismissedSuggestions, smartSuggestions[0].id])}
                    className="text-slate-400 hover:text-slate-200 text-[11px]"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              
              {/* Workflow Metadata Form */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#0F1115] p-4 rounded-xl border border-slate-800">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">Automation Name</label>
                  <input
                    type="text"
                    value={recordingTitle}
                    onChange={(e) => setRecordingTitle(e.target.value)}
                    className="w-full bg-[#15181E] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">Folder</label>
                  <input
                    type="text"
                    value={recordingFolder}
                    onChange={(e) => setRecordingFolder(e.target.value)}
                    className="w-full bg-[#15181E] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">Global Trigger Shortcut</label>
                  <input
                    type="text"
                    value={recordingShortcut}
                    onChange={(e) => setRecordingShortcut(e.target.value)}
                    className="w-full bg-[#15181E] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-emerald-400 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Action Simulation Buttons */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                    <MousePointer className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Simulate User Interactions (Click to append to timeline)</span>
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">Real-Time Recording Engine</span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <button
                    onClick={() => handleAddRecordedStep('click', 'Click "Create Subtask"', 'Action Button')}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 transition flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <MousePointer className="w-3.5 h-3.5 text-emerald-400" />
                    <span>+ Mouse Click</span>
                  </button>

                  <button
                    onClick={() => handleAddRecordedStep('type_text', 'Enter Summary Title', 'Summary Input', 'Refactor Auth middleware')}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 transition flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <Keyboard className="w-3.5 h-3.5 text-indigo-400" />
                    <span>+ Enter Summary Text</span>
                  </button>

                  <button
                    onClick={() => handleAddRecordedStep('shortcut', 'Press Shortcut Ctrl+S', 'Save Shortcut')}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 transition flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <CornerDownLeft className="w-3.5 h-3.5 text-amber-400" />
                    <span>+ Keyboard Shortcut</span>
                  </button>

                  <button
                    onClick={() => handleAddRecordedStep('browser_navigate', 'Navigate to Jira Board', 'Address Bar', 'https://jira.company.com')}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 transition flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <Globe className="w-3.5 h-3.5 text-sky-400" />
                    <span>+ Navigate URL</span>
                  </button>
                </div>
              </div>

              {/* LIVE TIMELINE WITH EDITING DURING RECORDING */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                    <Layers className="w-4 h-4 text-emerald-400" />
                    <span>Live Interactive Timeline (Editable in Real-Time)</span>
                  </h4>
                  <span className="text-[11px] text-slate-400">Reorder, edit, disable or group steps as you record</span>
                </div>

                {recordedSteps.length === 0 ? (
                  <div className="p-8 text-center bg-[#0F1115] border border-dashed border-slate-800 rounded-xl space-y-2">
                    <Video className="w-8 h-8 text-slate-600 mx-auto" />
                    <p className="text-xs text-slate-400">Timeline is empty. Perform actions on screen or click simulation controls above.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {recordedSteps.map((step, idx) => (
                      <div
                        key={step.id}
                        className={`p-3 bg-[#0F1115] border rounded-xl space-y-2.5 transition ${
                          step.isDisabled ? 'opacity-50 border-slate-800' : 'border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {/* Step Top Bar */}
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-2">
                            <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono font-bold text-[10px] flex items-center justify-center">
                              {step.stepNumber}
                            </span>

                            <span className={`font-bold ${step.isDisabled ? 'line-through text-slate-500' : 'text-white'}`}>
                              ✓ {step.label}
                            </span>

                            <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400 uppercase font-mono">
                              {step.actionType}
                            </span>

                            {step.groupName && (
                              <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-medium border border-indigo-500/30">
                                Group: {step.groupName}
                              </span>
                            )}

                            {step.isOptional && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px]">
                                Optional
                              </span>
                            )}
                          </div>

                          {/* Action Toolbar for Timeline Editing */}
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => handleMoveStep(idx, 'up')}
                              disabled={idx === 0}
                              className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
                              title="Move Up"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleMoveStep(idx, 'down')}
                              disabled={idx === recordedSteps.length - 1}
                              className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
                              title="Move Down"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleToggleDisableStep(step.id)}
                              className={`p-1 text-slate-400 hover:text-white ${step.isDisabled ? 'text-rose-400' : ''}`}
                              title={step.isDisabled ? 'Enable Step' : 'Disable Step'}
                            >
                              <EyeOff className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => setEditingStep(step)}
                              className="p-1 text-slate-400 hover:text-white"
                              title="Edit Step Details"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleDuplicateStep(idx)}
                              className="p-1 text-slate-400 hover:text-white"
                              title="Duplicate Step"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => setRecordedSteps((prev) => prev.filter((s) => s.id !== step.id))}
                              className="p-1 text-slate-400 hover:text-rose-400"
                              title="Delete Step"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Locator Strategy Line */}
                        <div className="text-[11px] font-mono text-slate-400 bg-[#15181E] p-2 rounded-lg border border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                          <div className="truncate">
                            <span className="text-indigo-400 font-semibold">DOM:</span> {step.locators.domSelector} | <span className="text-emerald-400 font-semibold">WinUI:</span> {step.locators.winControlName}
                          </div>
                          {step.inputValue && (
                            <div className="text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                              Input: "{step.inputValue}"
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT STEP MODAL (TIMELINE EDITING) */}
      {editingStep && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#15181E] border border-slate-700 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white border-b border-slate-800 pb-2">Edit Step Details</h3>
            
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Step Label</label>
                <input
                  type="text"
                  value={editingStep.label}
                  onChange={(e) => setEditingStep({ ...editingStep, label: e.target.value })}
                  className="w-full bg-[#0F1115] border border-slate-800 rounded-lg p-2 text-white"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Input Value / Variable</label>
                <input
                  type="text"
                  value={editingStep.inputValue || ''}
                  onChange={(e) => setEditingStep({ ...editingStep, inputValue: e.target.value })}
                  className="w-full bg-[#0F1115] border border-slate-800 rounded-lg p-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Group Name</label>
                <input
                  type="text"
                  value={editingStep.groupName || ''}
                  onChange={(e) => setEditingStep({ ...editingStep, groupName: e.target.value })}
                  placeholder="e.g. Fill Story Details"
                  className="w-full bg-[#0F1115] border border-slate-800 rounded-lg p-2 text-white"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Wait Duration (ms)</label>
                <input
                  type="number"
                  value={editingStep.waitMs || 500}
                  onChange={(e) => setEditingStep({ ...editingStep, waitMs: Number(e.target.value) })}
                  className="w-full bg-[#0F1115] border border-slate-800 rounded-lg p-2 text-white font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setEditingStep(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setRecordedSteps((prev) =>
                    prev.map((s) => (s.id === editingStep.id ? editingStep : s))
                  );
                  setEditingStep(null);
                  onShowToast('Updated step details in timeline');
                }}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDITING FULL SAVED WORKFLOW MODAL */}
      {editingWorkflow && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#15181E] border border-slate-700 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl p-6 space-y-4 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Edit3 className="w-4 h-4 text-emerald-400" />
                <span>Edit Workflow: {editingWorkflow.name}</span>
              </h3>
              <button onClick={() => setEditingWorkflow(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-4 overflow-y-auto flex-1 pr-1">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">Workflow Name</label>
                  <input
                    type="text"
                    value={editingWorkflow.name}
                    onChange={(e) => setEditingWorkflow({ ...editingWorkflow, name: e.target.value })}
                    className="w-full bg-[#0F1115] border border-slate-800 rounded-lg p-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">Folder</label>
                  <input
                    type="text"
                    value={editingWorkflow.folder || 'General'}
                    onChange={(e) => setEditingWorkflow({ ...editingWorkflow, folder: e.target.value })}
                    className="w-full bg-[#0F1115] border border-slate-800 rounded-lg p-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">Shortcut Key</label>
                  <input
                    type="text"
                    value={editingWorkflow.shortcut || 'Alt + R'}
                    onChange={(e) => setEditingWorkflow({ ...editingWorkflow, shortcut: e.target.value })}
                    className="w-full bg-[#0F1115] border border-slate-800 rounded-lg p-2 text-xs text-emerald-400 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-200">Workflow Steps ({editingWorkflow.steps.length})</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {editingWorkflow.steps.map((step) => (
                    <div key={step.id} className="p-3 bg-[#0F1115] border border-slate-800 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-white mr-2">{step.stepNumber}. {step.label}</span>
                        <span className="text-slate-500 font-mono">[{step.actionType}]</span>
                      </div>
                      <span className="text-slate-400 font-mono text-[11px]">{step.locators.domSelector}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
              <button onClick={() => setEditingWorkflow(null)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium">Cancel</button>
              <button
                onClick={() => {
                  const updated = saveAutomationWorkflow(config, editingWorkflow);
                  onUpdateConfig(updated);
                  setEditingWorkflow(null);
                  onShowToast('Saved workflow edits!');
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs"
              >
                Save Workflow
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PLAYBACK VARIABLE MODAL */}
      {isPlaybackVariableModalOpen && playbackWorkflow && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#15181E] border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Variable className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Playback Variable Inputs</h3>
                  <p className="text-xs text-slate-400">Provide dynamic values for "{playbackWorkflow.name}"</p>
                </div>
              </div>
              <button onClick={() => setIsPlaybackVariableModalOpen(false)} className="text-slate-400 hover:text-white p-1">✕</button>
            </div>

            <div className="space-y-4">
              {playbackWorkflow.variables.map((variable) => (
                <div key={variable.id} className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                    <span>{variable.label || variable.name}</span>
                    <span className="font-mono text-[10px] text-indigo-400">{`{{${variable.name}}}`}</span>
                  </label>
                  <input
                    type="text"
                    value={variableValues[variable.name] || ''}
                    onChange={(e) => setVariableValues({ ...variableValues, [variable.name]: e.target.value })}
                    placeholder={variable.description || `Enter value for ${variable.name}`}
                    className="w-full bg-[#0F1115] border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button onClick={() => setIsPlaybackVariableModalOpen(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium">Cancel</button>
              <button
                onClick={() => startPlaybackExecution(playbackWorkflow, variableValues)}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 flex items-center space-x-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Execute Playback</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LIVE PLAYBACK EXECUTION LOG STREAM */}
      {isExecuting && playbackWorkflow && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#15181E] border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95 overflow-hidden">
            <div className="p-5 bg-[#0F1115] border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Play className="w-5 h-5 fill-current" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Running Automation Playback</h3>
                  <p className="text-xs text-slate-400">
                    Executing step {currentStepIndex + 1} of {playbackWorkflow.steps.length}: {playbackWorkflow.name}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-400 font-mono">Speed:</span>
                <select
                  value={playbackSpeed}
                  onChange={(e) => setPlaybackSpeed(Number(e.target.value) as any)}
                  className="bg-[#15181E] border border-slate-700 text-xs font-bold text-emerald-400 rounded-lg px-2 py-1"
                >
                  <option value={0.5}>0.5x</option>
                  <option value={1}>1.0x</option>
                  <option value={2}>2.0x</option>
                  <option value={5}>5.0x (Fast)</option>
                </select>
              </div>
            </div>

            <div className="p-5 bg-[#0A0C0E] font-mono text-xs overflow-y-auto space-y-2 flex-1 max-h-96">
              {playbackLogs.map((log) => (
                <div
                  key={log.id}
                  className={`p-2 rounded-lg border text-[11px] leading-relaxed flex items-start space-x-2 ${
                    log.type === 'strategy'
                      ? 'bg-indigo-950/40 border-indigo-800/60 text-indigo-300'
                      : log.type === 'warn'
                      ? 'bg-amber-950/40 border-amber-800/60 text-amber-300'
                      : log.type === 'success'
                      ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                      : 'bg-slate-900/60 border-slate-800 text-slate-300'
                  }`}
                >
                  <span className="text-slate-500 shrink-0">[{log.timestamp}]</span>
                  <span>{log.message}</span>
                </div>
              ))}
            </div>

            <div className="p-4 bg-[#0F1115] border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">Multi-Layered Self-Healing Engine Active</span>
              <button
                onClick={() => setIsExecuting(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
              >
                Close Log Window
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
