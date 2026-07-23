import React, { useState, useEffect, useRef } from 'react';
import {
  StickyNote,
  Search,
  Plus,
  Pin,
  Trash2,
  Edit3,
  X,
  Check,
  Copy,
  Sparkles,
  ArrowRight,
  Maximize2,
  Calendar,
  Tag,
  CornerDownLeft,
  ChevronDown
} from 'lucide-react';
import { AppConfig, QuickNote } from '../types';
import {
  addQuickNote,
  updateQuickNote,
  deleteQuickNote,
  togglePinQuickNote
} from '../services/storageService';

interface QuickNotesModalPopupProps {
  config: AppConfig;
  isOpen: boolean;
  onClose: () => void;
  onUpdateConfig: (newConfig: AppConfig) => void;
  onShowToast: (msg: string) => void;
  onOpenMainNotesTab?: () => void;
  initialSelectedNoteId?: string;
}

const COLOR_MAP: Record<NonNullable<QuickNote['color']>, { bg: string; border: string; text: string; pinBg: string }> = {
  indigo: { bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', text: 'text-indigo-400', pinBg: 'bg-indigo-500' },
  emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', pinBg: 'bg-emerald-500' },
  amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', pinBg: 'bg-amber-500' },
  rose: { bg: 'bg-rose-500/10', border: 'border-rose-500/30', text: 'text-rose-400', pinBg: 'bg-rose-500' },
  sky: { bg: 'bg-sky-500/10', border: 'border-sky-500/30', text: 'text-sky-400', pinBg: 'bg-sky-500' },
  slate: { bg: 'bg-slate-500/10', border: 'border-slate-500/30', text: 'text-slate-400', pinBg: 'bg-slate-500' },
};

export const QuickNotesModalPopup: React.FC<QuickNotesModalPopupProps> = ({
  config,
  isOpen,
  onClose,
  onUpdateConfig,
  onShowToast,
  onOpenMainNotesTab,
  initialSelectedNoteId,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [activeEditorNote, setActiveEditorNote] = useState<QuickNote | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Form states for note editor
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editIsPinned, setEditIsPinned] = useState(false);
  const [editColor, setEditColor] = useState<QuickNote['color']>('indigo');

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const contentInputRef = useRef<HTMLTextAreaElement>(null);

  const notesList = config.notes || [];

  // Filter notes based on search query
  const filteredNotes = notesList.filter((note) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (note.title && note.title.toLowerCase().includes(q)) ||
      note.content.toLowerCase().includes(q)
    );
  });

  // Sort notes: Pinned notes first, then sorted by createdAt (newest first)
  const sortedNotes = [...filteredNotes].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Auto focus search input when popup opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      if (initialSelectedNoteId) {
        const found = notesList.find((n) => n.id === initialSelectedNoteId);
        if (found) {
          openEditor(found);
        }
      }
    } else {
      setActiveEditorNote(null);
      setIsCreatingNew(false);
      setSearchQuery('');
    }
  }, [isOpen, initialSelectedNoteId]);

  // Reset selectedIndex if out of bounds
  useEffect(() => {
    if (selectedIndex >= sortedNotes.length) {
      setSelectedIndex(Math.max(0, sortedNotes.length - 1));
    }
  }, [sortedNotes.length, selectedIndex]);

  // Global Keyboard Navigation inside popup
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // If user is editing a note in textarea, let Esc close editor, but don't trap arrows
      if (activeEditorNote || isCreatingNew) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setActiveEditorNote(null);
          setIsCreatingNew(false);
        }
        return;
      }

      // Keyboard navigation in note list mode
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, sortedNotes.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        if (sortedNotes[selectedIndex]) {
          e.preventDefault();
          openEditor(sortedNotes[selectedIndex]);
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        startCreateNewNote();
      } else if (e.key === 'Delete' && sortedNotes[selectedIndex]) {
        e.preventDefault();
        handleDeleteNote(sortedNotes[selectedIndex].id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeEditorNote, isCreatingNew, selectedIndex, sortedNotes]);

  if (!isOpen) return null;

  const openEditor = (note: QuickNote) => {
    setActiveEditorNote(note);
    setIsCreatingNew(false);
    setEditTitle(note.title || '');
    setEditContent(note.content);
    setEditIsPinned(note.isPinned);
    setEditColor(note.color || 'indigo');
    setTimeout(() => contentInputRef.current?.focus(), 50);
  };

  const startCreateNewNote = () => {
    setIsCreatingNew(true);
    setActiveEditorNote(null);
    setEditTitle('');
    setEditContent('');
    setEditIsPinned(false);
    setEditColor('indigo');
    setTimeout(() => contentInputRef.current?.focus(), 50);
  };

  const handleSaveNote = () => {
    if (!editContent.trim() && !editTitle.trim()) {
      onShowToast('Note cannot be completely empty');
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
    } else if (activeEditorNote) {
      updatedConfig = updateQuickNote(config, activeEditorNote.id, {
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
    setActiveEditorNote(null);
    setIsCreatingNew(false);
  };

  const handleDeleteNote = (id: string) => {
    const updatedConfig = deleteQuickNote(config, id);
    onUpdateConfig(updatedConfig);
    if (activeEditorNote?.id === id) {
      setActiveEditorNote(null);
      setIsCreatingNew(false);
    }
    onShowToast('Note deleted');
  };

  const handleTogglePin = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updatedConfig = togglePinQuickNote(config, id);
    onUpdateConfig(updatedConfig);
  };

  const handleCopyNoteContent = (content: string, id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
    onShowToast('Copied note content to clipboard!');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-md flex items-center justify-center p-4">
      {/* Floating Popup Window */}
      <div className="bg-[#12151B] border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[82vh] animate-in zoom-in-95 duration-150">
        
        {/* Header Bar */}
        <div className="px-4 py-3 bg-[#171B22] border-b border-slate-800 flex items-center justify-between shrink-0 select-none">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <StickyNote className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-white tracking-tight">Quick Notes</span>
                <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono text-amber-400">
                  {config.quickNotesShortcut || 'Alt + N'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400">Instant access from anywhere in Windows</p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            {onOpenMainNotesTab && (
              <button
                onClick={() => {
                  onClose();
                  onOpenMainNotesTab();
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition flex items-center space-x-1 text-xs"
                title="Expand to Full Workspace"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[11px]">Full Tab</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* EDITOR VIEW MODE */}
        {(activeEditorNote || isCreatingNew) ? (
          <div className="p-4 space-y-4 flex-1 overflow-y-auto flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">
                  {isCreatingNew ? 'Create Quick Note' : 'Edit Quick Note'}
                </span>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setEditIsPinned(!editIsPinned)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition flex items-center space-x-1.5 ${
                      editIsPinned
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white'
                    }`}
                  >
                    <Pin className={`w-3.5 h-3.5 ${editIsPinned ? 'fill-amber-400' : ''}`} />
                    <span>{editIsPinned ? 'Pinned' : 'Pin'}</span>
                  </button>
                </div>
              </div>

              {/* Title Field */}
              <input
                type="text"
                placeholder="Title (Optional)..."
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full bg-[#0F1115] border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
              />

              {/* Content Field */}
              <textarea
                ref={contentInputRef}
                placeholder="Type your quick note content here..."
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={7}
                className="w-full bg-[#0F1115] border border-slate-800 rounded-xl p-3.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50 resize-none font-sans leading-relaxed"
              />

              {/* Color Tag Selection */}
              <div className="flex items-center space-x-2 pt-1">
                <span className="text-[11px] text-slate-400">Color Tag:</span>
                {(['indigo', 'emerald', 'amber', 'rose', 'sky', 'slate'] as const).map((col) => (
                  <button
                    key={col}
                    onClick={() => setEditColor(col)}
                    className={`w-5 h-5 rounded-full ${COLOR_MAP[col].pinBg} border-2 transition ${
                      editColor === col ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Editor Action Buttons */}
            <div className="flex items-center justify-between border-t border-slate-800 pt-3 mt-2">
              <div className="flex items-center space-x-2">
                {!isCreatingNew && activeEditorNote && (
                  <button
                    onClick={() => handleDeleteNote(activeEditorNote.id)}
                    className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs transition"
                    title="Delete Note"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    setActiveEditorNote(null);
                    setIsCreatingNew(false);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveNote}
                  className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition flex items-center space-x-1.5 shadow-lg shadow-amber-500/20"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Note</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* NOTES LIST & SEARCH MODE */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Search & New Note Bar */}
            <div className="p-3 bg-[#0F1115] border-b border-slate-800/80 flex items-center space-x-2 shrink-0">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search notes or type to filter..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#171B22] border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <button
                onClick={startCreateNewNote}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition flex items-center space-x-1 shadow-md shrink-0 cursor-pointer"
                title="Create New Note (Ctrl+N)"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New</span>
              </button>
            </div>

            {/* Scrollable Notes List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {sortedNotes.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-center text-slate-500 mx-auto">
                    <StickyNote className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-300">No Quick Notes found</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {searchQuery ? `No notes matching "${searchQuery}"` : 'Click "+ New" to add your first quick note!'}
                    </p>
                  </div>
                  {!searchQuery && (
                    <button
                      onClick={startCreateNewNote}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 text-xs font-medium transition"
                    >
                      + Create First Note
                    </button>
                  )}
                </div>
              ) : (
                sortedNotes.map((note, index) => {
                  const isSelected = index === selectedIndex;
                  const colorStyle = COLOR_MAP[note.color || 'indigo'];

                  return (
                    <div
                      key={note.id}
                      onClick={() => openEditor(note)}
                      className={`p-3 rounded-xl border transition cursor-pointer select-none relative group ${
                        isSelected
                          ? `${colorStyle.bg} ${colorStyle.border} shadow-lg ring-1 ring-amber-500/40`
                          : 'bg-[#171B22] border-slate-800/80 hover:border-slate-700 hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center space-x-2">
                            {note.isPinned && (
                              <Pin className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />
                            )}
                            {note.title && (
                              <h4 className="text-xs font-bold text-white truncate">
                                {note.title}
                              </h4>
                            )}
                          </div>

                          <p className="text-xs text-slate-300/90 line-clamp-3 leading-relaxed whitespace-pre-wrap font-sans">
                            {note.content}
                          </p>

                          <div className="flex items-center space-x-2 pt-1 text-[10px] text-slate-500 font-mono">
                            <span>{new Date(note.updatedAt || note.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>

                        {/* Action buttons on hover / selected */}
                        <div className="flex items-center space-x-1 opacity-80 group-hover:opacity-100 shrink-0">
                          <button
                            onClick={(e) => handleCopyNoteContent(note.content, note.id, e)}
                            className="p-1 rounded-lg hover:bg-slate-700/80 text-slate-400 hover:text-white transition"
                            title="Copy Note Content"
                          >
                            {copiedId === note.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>

                          <button
                            onClick={(e) => handleTogglePin(note.id, e)}
                            className={`p-1 rounded-lg hover:bg-slate-700/80 transition ${
                              note.isPinned ? 'text-amber-400' : 'text-slate-500 hover:text-slate-300'
                            }`}
                            title={note.isPinned ? 'Unpin Note' : 'Pin Note'}
                          >
                            <Pin className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteNote(note.id);
                            }}
                            className="p-1 rounded-lg hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition"
                            title="Delete Note"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer Navigation Hints */}
            <div className="px-4 py-2 bg-[#171B22] border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between select-none shrink-0">
              <div className="flex items-center space-x-3">
                <span className="flex items-center space-x-1">
                  <kbd className="px-1 py-0.5 bg-slate-800 rounded border border-slate-700 text-[9px] font-mono">↑↓</kbd>
                  <span>Navigate</span>
                </span>
                <span className="flex items-center space-x-1">
                  <kbd className="px-1 py-0.5 bg-slate-800 rounded border border-slate-700 text-[9px] font-mono">Enter</kbd>
                  <span>Edit</span>
                </span>
                <span className="flex items-center space-x-1">
                  <kbd className="px-1 py-0.5 bg-slate-800 rounded border border-slate-700 text-[9px] font-mono">Ctrl+N</kbd>
                  <span>New</span>
                </span>
              </div>

              <span>{sortedNotes.length} notes</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
