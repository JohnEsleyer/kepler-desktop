import React, { useEffect, useState } from 'react';
import { Book, Chapter } from '../types/vault';
import { LexicalMarkdownEditor } from '../editor/LexicalEditor';
import { VaultAPI } from '../services/vaultBridge';
import { ChapterList } from './ChapterList';
import { QuestionsPane } from './QuestionsPane';
import { VisualViewer } from './VisualViewer';
import { useDialog } from './ui/CustomUI';
import { ArrowLeft, HelpCircle, Eye, Plus, BookOpen, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

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

  // Visual companions are strictly per chapter and optional.
  // Matched strictly by chapter position (1-based: activeChapterIndex + 1).
  const matchedVisual = book.visuals.find((v) => v.assignedChapter === activeChapterIndex + 1);

  const selectChapter = (index: number) => {
    setActiveChapterIndex(index);
    onChapterChange?.(index);
  };

  const handleSaveNotes = async (updatedMarkdown: string) => {
    if (!activeChapter) return;
    try {
      activeChapter.content = updatedMarkdown;
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

  const handleCreateVisualForChapter = async () => {
    const chNumber = activeChapterIndex + 1;
    const chTitle = activeChapter ? activeChapter.title : `Chapter_${chNumber}`;
    const safeTitle = chTitle.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const fileName = `${String(chNumber).padStart(2, '0')}_${safeTitle}.html`;

    const starterHtml = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      body {
        margin: 0;
        background: #030712;
        color: #f8fafc;
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100vh;
        font-family: sans-serif;
      }
      canvas {
        background: #0b0f19;
        border: 1px solid #1e293b;
        border-radius: 12px;
      }
    </style>
  </head>
  <body>
    <canvas id="canvas" width="400" height="400"></canvas>
    <script>
      const c = document.getElementById('canvas');
      const ctx = c.getContext('2d');
      let t = 0;
      function render() {
        ctx.clearRect(0, 0, 400, 400);
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(200, 200, 70 + Math.sin(t) * 20, 0, Math.PI * 2);
        ctx.stroke();
        t += 0.04;
        requestAnimationFrame(render);
      }
      render();
    </script>
  </body>
</html>`;

    await VaultAPI.saveVisual(book.path, fileName, starterHtml);
    setRightDrawerMode('visual');
    onRefresh();
  };

  const handleDeleteVisual = async (fileName: string) => {
    const ok = await showConfirm({
      title: 'Remove Visual Companion',
      message: `Delete visual companion "${fileName}" for this chapter?`,
      confirmText: 'Delete',
      isDanger: true,
    });
    if (!ok) return;
    await VaultAPI.deleteVisual(book.path, fileName);
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
        <div className="flex items-center gap-1.5">
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
            title="Toggle Visual Companion for Chapter"
          >
            <Eye size={14} />
            <span>Companion</span>
            {matchedVisual ? (
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-sm" />
            ) : (
              <span className="text-[10px] text-slate-500">None</span>
            )}
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
        {/* Left Column: Chapters Drawer (Open) */}
        {isChaptersOpen ? (
          <div className="flex w-64 shrink-0 flex-col justify-between border-r border-slate-800/80 bg-[#070b14] transition-all">
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
        ) : (
          /* Collapsed mini-dock (Desktop Only): displays just the count number instead of 'Chapters (1)' */
          <div className="flex w-10 shrink-0 flex-col items-center border-r border-slate-800/80 bg-[#060913] py-2">
            <button
              onClick={() => setIsChaptersOpen(true)}
              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
              title="Expand Chapters Sidebar"
            >
              <PanelLeftOpen size={16} />
            </button>
            <button
              onClick={() => setIsChaptersOpen(true)}
              className="mt-3 flex h-7 w-7 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 font-mono text-xs font-bold text-slate-300 transition hover:border-indigo-500/50 hover:bg-indigo-600/20 hover:text-indigo-200"
              title={`Show Chapters (${book.chapters.length})`}
            >
              {book.chapters.length}
            </button>
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
          <div className="flex w-96 shrink-0 flex-col border-l border-slate-800 bg-[#070b14]">
            <VisualViewer
              chapterNumber={activeChapterIndex + 1}
              chapterTitle={activeChapter ? activeChapter.title : `Chapter ${activeChapterIndex + 1}`}
              visual={matchedVisual}
              onCreateVisual={handleCreateVisualForChapter}
              onDeleteVisual={handleDeleteVisual}
              onSaveVisual={async (fileName, content) => {
                await VaultAPI.saveVisual(book.path, fileName, content);
                onRefresh();
              }}
            />
          </div>
        )}
        {rightDrawerMode === 'questions' && (
          <div className="flex w-96 shrink-0 flex-col border-l border-slate-800 bg-[#070b14]">
            <QuestionsPane bookPath={book.path} questions={book.questions} onRefresh={onRefresh} />
          </div>
        )}
      </div>
    </div>
  );
};
