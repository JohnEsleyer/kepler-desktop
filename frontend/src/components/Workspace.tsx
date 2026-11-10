import React, { useState } from 'react';
import { Book, Chapter } from '../types/vault';
import { LexicalMarkdownEditor } from '../editor/LexicalEditor';
import { VaultAPI } from '../services/vaultBridge';
import { ChapterList } from './ChapterList';
import { QuestionsPane } from './QuestionsPane';
import { VisualViewer } from './VisualViewer';
import {
  ArrowLeft, HelpCircle, Eye, Plus
} from 'lucide-react';

interface WorkspaceProps {
  book: Book;
  onBack: () => void;
  onRefresh: () => void;
}

export const Workspace: React.FC<WorkspaceProps> = ({ book, onBack, onRefresh }) => {
  const [activeChapterIndex, setActiveChapterIndex] = useState<number>(0);
  const [rightDrawerMode, setRightDrawerMode] = useState<'none' | 'questions' | 'visual'>('visual');

  const activeChapter: Chapter | undefined = book.chapters[activeChapterIndex];

  // Matched Visual Companion
  const matchedVisual = book.visuals.find((v) => v.assignedChapter === activeChapterIndex + 1) || book.visuals[0];

  const handleSaveNotes = async (updatedMarkdown: string) => {
    if (!activeChapter) return;
    try {
      await VaultAPI.saveChapter(book.path, activeChapter.fileName, updatedMarkdown);
    } catch (err) {
      console.error('Failed to save chapter:', err);
    }
  };

  const handleCreateChapter = async () => {
    const title = prompt('Enter new chapter title:');
    if (!title) return;
    await VaultAPI.createChapter(book.path, title);
    onRefresh();
  };

  const handleDeleteChapter = async (fileName: string) => {
    if (!confirm(`Delete chapter ${fileName}?`)) return;
    await VaultAPI.deleteChapter(book.path, fileName);
    onRefresh();
  };

  return (
    <div className="flex h-screen w-screen flex-col bg-[#030712] text-slate-100 overflow-hidden">
      {/* Top Header Bar */}
      <header className="flex h-12 items-center justify-between border-b border-slate-800 bg-[#070b14] px-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <ArrowLeft size={16} />
            <span className="text-xs font-semibold">Bookshelf</span>
          </button>
          <div className="h-4 w-[1px] bg-slate-800" />
          <h1 className="text-sm font-bold text-white truncate max-w-sm">{book.meta.title}</h1>
        </div>

        {/* View toggles */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setRightDrawerMode(rightDrawerMode === 'visual' ? 'none' : 'visual')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
              rightDrawerMode === 'visual' ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/30' : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            <Eye size={14} /> Companion Visual
          </button>
          <button
            onClick={() => setRightDrawerMode(rightDrawerMode === 'questions' ? 'none' : 'questions')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
              rightDrawerMode === 'questions' ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/30' : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            <HelpCircle size={14} /> Questions ({book.questions.length})
          </button>
        </div>
      </header>

      {/* Main Multi-Pane Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Column: Chapters Drawer */}
        <div className="w-64 border-r border-slate-800/80 bg-[#070b14] flex flex-col justify-between">
          <div className="flex items-center justify-between p-3 border-b border-slate-800/50">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Chapters</span>
            <button
              onClick={handleCreateChapter}
              className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              title="Add Chapter"
            >
              <Plus size={15} />
            </button>
          </div>
          <ChapterList
            chapters={book.chapters}
            activeIndex={activeChapterIndex}
            onSelect={setActiveChapterIndex}
            onDelete={handleDeleteChapter}
          />
        </div>

        {/* Center: Lexical Markdown Editor */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {activeChapter ? (
            <LexicalMarkdownEditor
              key={activeChapter.id}
              chapterTitle={activeChapter.title}
              initialContent={activeChapter.content}
              onSave={handleSaveNotes}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center text-slate-500 text-sm">
              No chapter selected or book is empty.
            </div>
          )}
        </div>

        {/* Right Drawer: Companion Visual Simulation or Review Questions */}
        {rightDrawerMode === 'visual' && (
          <div className="w-96 border-l border-slate-800 bg-[#070b14] flex flex-col">
            <VisualViewer visual={matchedVisual} />
          </div>
        )}
        {rightDrawerMode === 'questions' && (
          <div className="w-96 border-l border-slate-800 bg-[#070b14] flex flex-col">
            <QuestionsPane
              bookPath={book.path}
              questions={book.questions}
              onRefresh={onRefresh}
            />
          </div>
        )}
      </div>
    </div>
  );
};