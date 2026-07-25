import React, { useState } from 'react';
import {
  StickyNote,
  Search,
  Plus,
  Pin,
  Trash2,
  Edit3,
  Copy,
  Check,
  Sparkles,
  Download,
  Filter,
  Grid,
  List as ListIcon,
  Clock,
  Calendar,
  Share2,
  Keyboard,
  ExternalLink,
  MessageSquare
} from 'lucide-react';
import { AppConfig, QuickNote } from '../types';
import {
  addQuickNote,
  updateQuickNote,
  deleteQuickNote,
  togglePinQuickNote,
  saveAppConfig
} from '../services/storageService';
import { processAIText } from '../services/aiService';

interface QuickNotesMainViewProps {
  config: AppConfig;
  onUpdateConfig: (newConfig: AppConfig) => void;
  onShowToast: (msg: string) => void;
  onOpenQuickNotesPopup: () => void;
}

const COLOR_CONFIG: Record<
  NonNullable<QuickNote['color']>,
  { name: string; bg: string; border: string; badgeBg: string; text: string; pinBg: string }
> = {
  indigo: { name: 'Indigo', bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', badgeBg: 'bg-indigo-500/20 text-indigo-300', text: 'text-indigo-400', pinBg: 'bg-indigo-500' },
  emerald: { name: 'Emerald', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', badgeBg: 'bg-emerald-500/20 text-emerald-300', text: 'text-emerald-400', pinBg: 'bg-emerald-500' },
  amber: { name: 'Amber', bg: 'bg-amber-500/10', border: 'border-amber-500/30', badgeBg: 'bg-amber-500/20 text-amber-300', text: 'text-amber-400', pinBg: 'bg-amber-500' },
  rose: { name: 'Rose', bg: 'bg-rose-500/10', border: 'border-rose-500/30', badgeBg: 'bg-rose-500/20 text-rose-300', text: 'text-rose-400', pinBg: 'bg-rose-500' },
  sky: { name: 'Sky', bg: 'bg-sky-500/10', border: 'border-sky-500/30', badgeBg: 'bg-sky-500/20 text-sky-300', text: 'text-sky-400', pinBg: 'bg-sky-500' },
  slate: { name: 'Slate', bg: 'bg-slate-500/10', border: 'border-slate-500/30', badgeBg: 'bg-slate-500/20 text-slate-300', text: 'text-slate-400', pinBg: 'bg-slate-500' },
};

export const QuickNotesMainView: React.FC<QuickNotesMainViewProps> = ({
  config,
  onUpdateConfig,
  onShowToast,
  onOpenQuickNotesPopup,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<'all' | 'pinned' | QuickNote['color']>('all');
  const [viewLayout, setViewLayout] = useState<'grid' | 'list'>('grid');

  // Editor Modal State
  const [editorNote, setEditorNote] = useState<QuickNote | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Editor Form
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editIsPinned, setEditIsPinned] = useState(false);
  const [editColor, setEditColor] = useState<QuickNote['color']>('indigo');

  // AI Assistant inside note state
  const [isAiProcessing, setIsAiProcessing] = useState(false);

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const notesList = config.notes || [];

  // Filter notes
  const filteredNotes = notesList.filter((note) => {
    // Category filter
    if (filterCategory === 'pinned' && !note.isPinned) return false;
    if (filterCategory !== 'all' && filterCategory !== 'pinned' && note.color !== filterCategory) {
      return false;
    }

    // Search query filter
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (note.title && note.title.toLowerCase().includes(q)) ||
      note.content.toLowerCase().includes(q)
    );
  });

  // Sort notes: Pinned first, then newest updated/created first
  const sortedNotes = [...filteredNotes].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const handleOpenCreateModal = () => {
    setIsCreatingNew(true);
    setEditorNote(null);
    setEditTitle('');
    setEditContent('');
    setEditIsPinned(false);
    setEditColor('indigo');
  };

  const handleOpenEditModal = (note: QuickNote) => {
    setEditorNote(note);
    setIsCreatingNew(false);
    setEditTitle(note.title || '');
    setEditContent(note.content);
    setEditIsPinned(note.isPinned);
    setEditColor(note.color || 'indigo');
  };

  const handleSaveNote = () => {
    if (!editContent.trim() && !editTitle.trim()) {
      onShowToast('Note content cannot be completely empty');
      return;
    }

    let updatedConfig: AppConfig;
    if (isCreatingNew) {
      updatedConfig = addQuickNote(config, {
        title: editTitle.trim(),
        content: editContent.trim(),
        isPinned: editIsPinned,
        color: editColor,
      });
      onShowToast('Created new Quick Note!');
    } else if (editorNote) {
      updatedConfig = updateQuickNote(config, editorNote.id, {
        title: editTitle.trim(),
        content: editContent.trim(),
        isPinned: editIsPinned,
        color: editColor,
      });
      onShowToast('Note updated!');
    } else {
      return;
    }

    onUpdateConfig(updatedConfig);
    setEditorNote(null);
    setIsCreatingNew(false);
  };

  const handleDelete = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updatedConfig = deleteQuickNote(config, id);
    onUpdateConfig(updatedConfig);
    if (editorNote?.id === id) {
      setEditorNote(null);
      setIsCreatingNew(false);
    }
    onShowToast('Note deleted');
  };

  const handleTogglePin = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updatedConfig = togglePinQuickNote(config, id);
    onUpdateConfig(updatedConfig);
  };

  const handleCopy = (content: string, id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
    onShowToast('Copied to clipboard!');
  };

  const handleAiRefineNote = async (action: 'summarize' | 'polish' | 'action_items') => {
    if (!editContent.trim()) {
      onShowToast('Add note content before using AI assistant');
      return;
    }

    setIsAiProcessing(true);
    let prompt = '';
    if (action === 'summarize') {
      prompt = `Provide a concise, bulleted summary of these notes:\n\n${editContent}`;
    } else if (action === 'polish') {
      prompt = `Polish and improve grammar/readability for these notes:\n\n${editContent}`;
    } else if (action === 'action_items') {
      prompt = `Extract clear, actionable task items from these notes:\n\n${editContent}`;
    }

    try {
      const result = await processAIText({
        provider: 'gemini',
        model: config.hotkeys[0]?.model || 'gemini-2.5-flash',
        promptTemplate: prompt,
        inputText: '',
        systemPrompt: 'You are a high-speed productivity assistant.',
        temperature: 0.5,
        config,
      });

      setEditContent((prev) => `${prev}\n\n--- AI ${action.toUpperCase()} ---\n${result.output}`);
      onShowToast(`AI ${action} added to note!`);
    } catch (err: any) {
      console.error('AI Note error:', err);
      onShowToast(`AI request failed: ${err?.message || 'Check Gemini API Key'}`);
    } finally {
      setIsAiProcessing(false);
    }
  };

  const exportAllNotesAsMarkdown = () => {
    if (notesList.length === 0) {
      onShowToast('No notes available to export');
      return;
    }

    let mdText = `# QuickKeys AI Notes Export\nExported: ${new Date().toLocaleString()}\n\n`;
    notesList.forEach((n, idx) => {
      mdText += `## ${idx + 1}. ${n.title || 'Untitled Note'} ${n.isPinned ? '📌 [Pinned]' : ''}\n`;
      mdText += `*Created: ${new Date(n.createdAt).toLocaleString()} | Color: ${n.color || 'indigo'}*\n\n`;
      mdText += `${n.content}\n\n---\n\n`;
    });

    const blob = new Blob([mdText], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quickkeys_notes_${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
    onShowToast('Exported notes as Markdown file!');
  };

  const totalPinned = notesList.filter((n) => n.isPinned).length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-[#15181E] border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <StickyNote className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Quick Notes & Scratchpad Workspace
              </h2>
            </div>
            <p className="text-xs text-slate-400 max-w-2xl">
              Instant notes and action items accessible from anywhere in Windows via{' '}
              <code className="text-amber-400 font-mono font-bold bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                {config.quickNotesShortcut || 'Alt + N'}
              </code>
              . Stored in local JSON configuration and cloud synced.
            </p>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={onOpenQuickNotesPopup}
              className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-semibold transition flex items-center space-x-2 cursor-pointer shadow-lg shadow-amber-500/10"
            >
              <Keyboard className="w-3.5 h-3.5" />
              <span>Launch Popup Overlay</span>
            </button>

            <button
              onClick={handleOpenCreateModal}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition flex items-center space-x-1.5 shadow-lg shadow-amber-500/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Note</span>
            </button>
          </div>
        </div>
      </div>

      {/* Control Toolbar: Search & Filter Chips & View Mode */}
      <div className="bg-[#15181E] border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search notes by title or content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0F1115] border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
          />
        </div>

        {/* Filter Chips */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 md:pb-0 text-xs">
          <button
            onClick={() => setFilterCategory('all')}
            className={`px-3 py-1.5 rounded-xl font-medium transition ${
              filterCategory === 'all'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                : 'bg-[#0F1115] text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            All ({notesList.length})
          </button>

          <button
            onClick={() => setFilterCategory('pinned')}
            className={`px-3 py-1.5 rounded-xl font-medium transition flex items-center space-x-1.5 ${
              filterCategory === 'pinned'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                : 'bg-[#0F1115] text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Pin className="w-3.5 h-3.5 fill-current" />
            <span>Pinned ({totalPinned})</span>
          </button>

          {(['indigo', 'emerald', 'amber', 'rose', 'sky'] as const).map((col) => (
            <button
              key={col}
              onClick={() => setFilterCategory(col)}
              className={`px-2.5 py-1.5 rounded-xl font-medium transition capitalize flex items-center space-x-1.5 ${
                filterCategory === col
                  ? `${COLOR_CONFIG[col].badgeBg} border ${COLOR_CONFIG[col].border} font-bold`
                  : 'bg-[#0F1115] text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${COLOR_CONFIG[col].pinBg}`} />
              <span>{col}</span>
            </button>
          ))}
        </div>

        {/* View Layout Toggle */}
        <div className="flex items-center space-x-1 bg-[#0F1115] border border-slate-800 p-1 rounded-xl shrink-0">
          <button
            onClick={() => setViewLayout('grid')}
            className={`p-1.5 rounded-lg transition ${
              viewLayout === 'grid' ? 'bg-slate-800 text-amber-400 shadow' : 'text-slate-500 hover:text-slate-300'
            }`}
            title="Grid View"
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewLayout('list')}
            className={`p-1.5 rounded-lg transition ${
              viewLayout === 'list' ? 'bg-slate-800 text-amber-400 shadow' : 'text-slate-500 hover:text-slate-300'
            }`}
            title="List View"
          >
            <ListIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content Area: Notes List or Empty State */}
      {sortedNotes.length === 0 ? (
        <div className="bg-[#15181E] border border-slate-800 rounded-2xl p-12 text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-center text-slate-500 mx-auto">
            <StickyNote className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">No Quick Notes Found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
              {searchQuery || filterCategory !== 'all'
                ? 'Try adjusting your search query or filter selection.'
                : 'Create your first note to capture ideas, code snippets, or AI prompt scratchpads!'}
            </p>
          </div>

          <button
            onClick={handleOpenCreateModal}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition inline-flex items-center space-x-2 shadow-lg shadow-amber-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Create Quick Note</span>
          </button>
        </div>
      ) : (
        <div
          className={
            viewLayout === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5'
              : 'space-y-3'
          }
        >
          {sortedNotes.map((note) => {
            const colStyle = COLOR_CONFIG[note.color || 'indigo'];
            const wordCount = note.content.trim() ? note.content.trim().split(/\s+/).length : 0;

            return (
              <div
                key={note.id}
                onClick={() => handleOpenEditModal(note)}
                className={`bg-[#15181E] border border-slate-800/90 rounded-2xl p-5 shadow-xl transition-all duration-200 hover:border-slate-700/80 hover:shadow-2xl cursor-pointer flex flex-col justify-between group relative overflow-hidden ${
                  note.isPinned ? `${colStyle.bg} border-l-4 ${colStyle.border}` : ''
                }`}
              >
                {/* Note Header */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase ${colStyle.badgeBg}`}
                    >
                      {colStyle.name}
                    </span>

                    <div className="flex items-center space-x-1 opacity-80 group-hover:opacity-100">
                      <button
                        onClick={(e) => handleCopy(note.content, note.id, e)}
                        className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
                        title="Copy Content"
                      >
                        {copiedId === note.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        onClick={(e) => handleTogglePin(note.id, e)}
                        className={`p-1.5 rounded-lg hover:bg-slate-800 transition ${
                          note.isPinned ? 'text-amber-400' : 'text-slate-500 hover:text-slate-300'
                        }`}
                        title={note.isPinned ? 'Unpin Note' : 'Pin Note'}
                      >
                        <Pin className="w-3.5 h-3.5 fill-current" />
                      </button>

                      <button
                        onClick={(e) => handleDelete(note.id, e)}
                        className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition"
                        title="Delete Note"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {note.title && (
                    <h3 className="text-sm font-bold text-white tracking-tight leading-snug">
                      {note.title}
                    </h3>
                  )}

                  <p className="text-xs text-slate-300/90 leading-relaxed font-sans line-clamp-6 whitespace-pre-wrap">
                    {note.content}
                  </p>
                </div>

                {/* Footer details */}
                <div className="pt-4 border-t border-slate-800/80 mt-4 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <span className="flex items-center space-x-1">
                    <Clock className="w-3 h-3 text-slate-600" />
                    <span>{new Date(note.updatedAt || note.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </span>

                  <span>{wordCount} words</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* FULL NOTE EDITOR / MODAL DRAWER */}
      {(editorNote || isCreatingNew) && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#15181E] border border-slate-700 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {isCreatingNew ? 'Create New Quick Note' : 'Edit Quick Note'}
                  </h3>
                  <p className="text-xs text-slate-400">Synchronized in local config and cloud backups</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setEditIsPinned(!editIsPinned)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 ${
                    editIsPinned
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white'
                  }`}
                >
                  <Pin className="w-3.5 h-3.5 fill-current" />
                  <span>{editIsPinned ? 'Pinned' : 'Pin Note'}</span>
                </button>

                <button
                  onClick={() => {
                    setEditorNote(null);
                    setIsCreatingNew(false);
                  }}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {/* Note Title */}
              <input
                type="text"
                placeholder="Note Title (Optional)..."
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full bg-[#0F1115] border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 font-semibold"
              />

              {/* Note Content Textarea */}
              <textarea
                placeholder="Type your note content, task list, or code snippet..."
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={10}
                className="w-full bg-[#0F1115] border border-slate-800 rounded-xl p-4 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50 resize-none font-sans leading-relaxed"
              />

              {/* AI Assistant Quick Tools */}
              <div className="bg-[#0F1115] border border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-2 text-xs text-slate-400">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="font-semibold text-slate-200">AI Note Tools:</span>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleAiRefineNote('summarize')}
                    disabled={isAiProcessing}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition disabled:opacity-50"
                  >
                    {isAiProcessing ? 'Thinking...' : '+ Summarize'}
                  </button>
                  <button
                    onClick={() => handleAiRefineNote('polish')}
                    disabled={isAiProcessing}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition disabled:opacity-50"
                  >
                    + Polish Grammar
                  </button>
                  <button
                    onClick={() => handleAiRefineNote('action_items')}
                    disabled={isAiProcessing}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition disabled:opacity-50"
                  >
                    + Extract Action Items
                  </button>
                </div>
              </div>

              {/* Color Tag Selection */}
              <div className="flex items-center justify-between text-xs pt-1">
                <div className="flex items-center space-x-2">
                  <span className="text-slate-400">Accent Color:</span>
                  {(['indigo', 'emerald', 'amber', 'rose', 'sky', 'slate'] as const).map((col) => (
                    <button
                      key={col}
                      onClick={() => setEditColor(col)}
                      className={`w-6 h-6 rounded-full ${COLOR_CONFIG[col].pinBg} border-2 transition ${
                        editColor === col ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                      title={col}
                    />
                  ))}
                </div>

                <div className="text-slate-500 font-mono text-[11px]">
                  {editContent.length} chars | {editContent.trim() ? editContent.trim().split(/\s+/).length : 0} words
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between border-t border-slate-800 pt-4">
              <div>
                {!isCreatingNew && editorNote && (
                  <button
                    onClick={() => handleDelete(editorNote.id)}
                    className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold transition flex items-center space-x-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                )}
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => {
                    setEditorNote(null);
                    setIsCreatingNew(false);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveNote}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition flex items-center space-x-1.5 shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Note</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
