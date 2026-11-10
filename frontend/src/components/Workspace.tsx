import React, { useEffect, useState } from 'react';
import { Book, Chapter } from '../types/vault';
import { LexicalMarkdownEditor } from '../editor/LexicalEditor';
import { VaultAPI } from '../services/vaultBridge';
import { ChapterList } from './ChapterList';
import { QuestionsPane } from './QuestionsPane';
import { VisualViewer } from './VisualViewer';
import { useDialog } from './ui/CustomUI';
import { ArrowLeft, HelpCircle, Eye, Plus, BookOpen, PanelLeftClose } from 'lucide-react';

interface WorkspaceProps {
  book: Book;
  onBack: () => void;
  onRefresh: () => void;
  initialChapterIndex?: number;
  onChapterChange?: (index: number) => void;
}

export const Workspace: React.FC<WorkspaceProps> = ({
  book,
  onBack,
  onRefresh,
  initialChapterIndex = 0,
  onChapterChange,
}) => {
  const { showPrompt, showConfirm } = useDialog();
  const [activeChapterIndex, setActiveChapterIndex] = useState<number>(initialChapterIndex);
  const [isChaptersOpen, setIsChaptersOpen] = useState<boolean>(true);
  const [rightDrawerMode, setRightDrawerMode] = useState<'none' | 'questions' | 'visual'>('visual');

  useEffect(() => {
    if (activeChapterIndex >= book.chapters.length) {
      setActiveChapterIndex(Math.max(0, book.chapters.length - 1));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book.chapters.length]);

  const activeChapter: Chapter | undefined = book.chapters[activeChapterIndex];
  const matchedVisual =
    book.visuals.find((v) => v.assignedChapter === activeChapterIndex + 1) || book.visuals[0];

  const selectChapter = (index: number) => {
    setActiveChapterIndex(index);
    onChapterChange?.(index);
  };

  const handleSaveNotes = async (updatedMarkdown: string) => {
    if (!activeChapter) return;
    try {
      await VaultAPI.saveChapter(book.path, activeChapter.fileName, updatedMarkdown);
    } catch (err) {
      console.error('Failed to save chapter:', err);
    }
  };

  const handleCreateChapter = async () => {
    const title = await showPrompt({
      title: 'New Chapter',
      message: 'Give the chapter a descriptive title.',
      placeholder: 'Chapter title...',
      confirmText: 'Create',
    });
    if (!title || !title.trim()) return;
    await VaultAPI.createChapter(book.path, title.trim());
    onRefresh();
  };

  const handleDeleteChapter = async (fileName: string) => {
    const ok = await showConfirm({
      title: 'Delete Chapter',
      message: `Are you sure you want to delete ${fileName}? This cannot be undone.`,
      confirmText: 'Delete',
      isDanger: true,
    });
    if (!ok) return;
    await VaultAPI.deleteChapter(book.path, fileName);
    if (activeChapterIndex > 0 && activeChapterIndex >= book.chapters.length - 1) {
      selectChapter(activeChapterIndex - 1);
    }
    onRefresh();
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#030712] text-slate-100">
      {/* Top Header Bar */}
      <header className="flex h-12 items-center justify-between border-b border-slate-800 bg-[#070b14] px-4">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            <ArrowLeft size={16} />
            <span className="text-xs font-semibold">Bookshelf</span>
          </button>
          <div className="h-4 w-[1px] bg-slate-800" />
          <h1 className="max-w-sm truncate text-sm font-bold text-white">{book.meta.title}</h1>
        </div>

        {/* View toggles */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsChaptersOpen(!isChaptersOpen)}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
              isChaptersOpen
                ? 'border border-indigo-500/30 bg-indigo-600/30 text-indigo-300'
                : 'text-slate-400 hover:bg-slate-800'
            }`}
            title={isChaptersOpen ? 'Collapse Chapters' : 'Show Chapters'}
          >
            <BookOpen size={14} /> Chapters ({book.chapters.length})
          </button>
          <button
            onClick={() => setRightDrawerMode(rightDrawerMode === 'visual' ? 'none' : 'visual')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
              rightDrawerMode === 'visual'
                ? 'border border-indigo-500/30 bg-indigo-600/30 text-indigo-300'
                : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            <Eye size={14} /> Companion Visual
          </button>
          <button
            onClick={() => setRightDrawerMode(rightDrawerMode === 'questions' ? 'none' : 'questions')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
              rightDrawerMode === 'questions'
                ? 'border border-indigo-500/30 bg-indigo-600/30 text-indigo-300'
                : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            <HelpCircle size={14} /> Questions ({book.questions.length})
          </button>
        </div>
      </header>

      {/* Main Multi-Pane Content Area */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Left Column: Chapters Drawer (Collapsible) */}
        {isChaptersOpen && (
          <div className="flex w-64 flex-col justify-between border-r border-slate-800/80 bg-[#070b14] transition-all">
            <div className="flex items-center justify-between border-b border-slate-800/50 p-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Chapters</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleCreateChapter}
                  className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
                  title="Add Chapter"
                >
                  <Plus size={15} />
                </button>
                <button
                  onClick={() => setIsChaptersOpen(false)}
                  className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
                  title="Collapse Chapters Sidebar"
                >
                  <PanelLeftClose size={15} />
                </button>
              </div>
            </div>
            <ChapterList
              chapters={book.chapters}
              activeIndex={activeChapterIndex}
              onSelect={selectChapter}
              onDelete={handleDeleteChapter}
            />
          </div>
        )}

        {/* Center: Lexical Markdown Editor */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {activeChapter ? (
            <LexicalMarkdownEditor
              key={activeChapter.id}
              chapterTitle={activeChapter.title}
              initialContent={activeChapter.content}
              onSave={handleSaveNotes}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-slate-500">
              No chapter selected or book is empty.
            </div>
          )}
        </div>

        {/* Right Drawer: Companion Visual Simulation or Review Questions */}
        {rightDrawerMode === 'visual' && (
          <div className="flex w-96 flex-col border-l border-slate-800 bg-[#070b14]">
            <VisualViewer
              visual={matchedVisual}
              onSaveVisual={async (fileName, content) => {
                await VaultAPI.saveVisual(book.path, fileName, content);
                onRefresh();
              }}
            />
          </div>
        )}
        {rightDrawerMode === 'questions' && (
          <div className="flex w-96 flex-col border-l border-slate-800 bg-[#070b14]">
            <QuestionsPane bookPath={book.path} questions={book.questions} onRefresh={onRefresh} />
          </div>
        )}
      </div>
    </div>
  );
};
